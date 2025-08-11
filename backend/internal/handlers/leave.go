package handlers

import (
	"employee-dashboard-api/internal/config"
	"employee-dashboard-api/internal/models"
	"employee-dashboard-api/internal/services"
	"employee-dashboard-api/internal/utils"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type LeaveHandler struct {
	db           *gorm.DB
	config       *config.Config
	logger       *logrus.Logger
	leaveService *services.LeaveService
}

func NewLeaveHandler(db *gorm.DB, cfg *config.Config, logger *logrus.Logger) *LeaveHandler {
	leaveService := services.NewLeaveService(db, logger)
	return &LeaveHandler{
		db:           db,
		config:       cfg,
		logger:       logger,
		leaveService: leaveService,
	}
}

type CreateLeaveRequest struct {
	LeaveTypeID uuid.UUID `json:"leave_type_id" binding:"required"`
	StartDate   string    `json:"start_date" binding:"required"`
	EndDate     string    `json:"end_date" binding:"required"`
	IsHalfDay   bool      `json:"is_half_day"`
	Reason      string    `json:"reason"`
	Description string    `json:"description"`
}

type UpdateLeaveRequest struct {
	StartDate   string `json:"start_date"`
	EndDate     string `json:"end_date"`
	IsHalfDay   bool   `json:"is_half_day"`
	Reason      string `json:"reason"`
	Description string `json:"description"`
}

func (h *LeaveHandler) GetLeaves(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists || userID == uuid.Nil {
		utils.UnauthorizedResponse(c)
		return
	}

	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	status := c.Query("status")

	offset := (page - 1) * limit

	query := h.db.Preload("LeaveType").Preload("Approver").Where("user_id = ?", userID)

	if status != "" {
		query = query.Where("status = ?", status)
	}

	var leaves []models.LeaveApplication
	var total int64

	// Get total count
	query.Model(&models.LeaveApplication{}).Count(&total)

	// Get paginated results with proper preloading to trigger AfterFind hook
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&leaves).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	// Ensure DateRange is populated for each leave (AfterFind should handle this automatically)
	for i := range leaves {
		if leaves[i].DateRange == "" {
			leaves[i].DateRange = leaves[i].FormatDateRange()
		}
	}

	response := gin.H{
		"leaves": leaves,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	}

	utils.SuccessResponse(c, http.StatusOK, "Leaves retrieved successfully", response)
}

// GetAllLeaves - Admin endpoint to fetch all leave applications
func (h *LeaveHandler) GetAllLeaves(c *gin.Context) {
	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	status := c.Query("status")
	userID := c.Query("user_id")

	offset := (page - 1) * limit

	query := h.db.Preload("LeaveType").Preload("Approver").Preload("User")

	// Filter by status if provided
	if status != "" {
		query = query.Where("status = ?", status)
	}

	// Filter by specific user if provided
	if userID != "" {
		if parsedUserID, err := uuid.Parse(userID); err == nil {
			query = query.Where("user_id = ?", parsedUserID)
		}
	}

	var leaves []models.LeaveApplication
	var total int64

	// Get total count
	query.Model(&models.LeaveApplication{}).Count(&total)

	// Get paginated results
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&leaves).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	response := gin.H{
		"leaves": leaves,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	}

	utils.SuccessResponse(c, http.StatusOK, "All leaves retrieved successfully", response)
}

// ApproveLeave - Admin endpoint to approve a leave application
func (h *LeaveHandler) ApproveLeave(c *gin.Context) {
	leaveID := c.Param("id")
	if leaveID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Leave ID is required", "")
		return
	}

	// Get the admin user ID who is approving
	adminUserID, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c)
		return
	}

	// Parse leave ID
	parsedLeaveID, err := uuid.Parse(leaveID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid leave ID format", err.Error())
		return
	}

	// Find the leave application
	var leave models.LeaveApplication
	if err := h.db.Preload("LeaveType").Preload("User").First(&leave, parsedLeaveID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.ErrorResponse(c, http.StatusNotFound, "Leave application not found", "")
			return
		}
		utils.InternalErrorResponse(c, err)
		return
	}

	// Check if leave is still pending
	if leave.Status != "pending" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Leave application is not in pending status", "")
		return
	}

	// Update the leave status
	now := time.Now()
	if err := h.db.Model(&leave).Updates(map[string]interface{}{
		"status":      "approved",
		"approved_by": adminUserID,
		"approved_at": &now,
	}).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	// Calculate days to deduct from balance
	var daysUsed float64
	if leave.IsHalfDay {
		daysUsed = 0.5
	} else {
		days := int(leave.EndDate.Sub(leave.StartDate).Hours()/24) + 1
		daysUsed = float64(days)
	}

	// Now deduct the balance since leave is approved
	if err := h.leaveService.UpdateLeaveBalance(leave.UserID, leave.LeaveTypeID, leave.StartDate.Year(), daysUsed); err != nil {
		// If balance update fails, rollback the approval
		h.db.Model(&leave).Updates(map[string]interface{}{
			"status":      "pending",
			"approved_by": nil,
			"approved_at": nil,
		})
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to update leave balance", err.Error())
		return
	}

	// Reload the leave with updated data
	if err := h.db.Preload("LeaveType").Preload("User").Preload("Approver").First(&leave, parsedLeaveID).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Leave application approved successfully", leave)
}

// RejectLeave - Admin endpoint to reject a leave application
func (h *LeaveHandler) RejectLeave(c *gin.Context) {
	leaveID := c.Param("id")
	if leaveID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Leave ID is required", "")
		return
	}

	// Get the admin user ID who is rejecting
	adminUserID, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c)
		return
	}

	// Parse leave ID
	parsedLeaveID, err := uuid.Parse(leaveID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid leave ID format", err.Error())
		return
	}

	// Get rejection reason from request body
	var requestBody struct {
		RejectionReason string `json:"rejection_reason"`
	}
	if err := c.ShouldBindJSON(&requestBody); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request body", err.Error())
		return
	}

	// Find the leave application
	var leave models.LeaveApplication
	if err := h.db.Preload("LeaveType").Preload("User").First(&leave, parsedLeaveID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.ErrorResponse(c, http.StatusNotFound, "Leave application not found", "")
			return
		}
		utils.InternalErrorResponse(c, err)
		return
	}

	// Check if leave is still pending
	if leave.Status != "pending" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Leave application is not in pending status", "")
		return
	}

	// Update the leave status
	now := time.Now()
	if err := h.db.Model(&leave).Updates(map[string]interface{}{
		"status":           "rejected",
		"approved_by":      adminUserID,
		"approved_at":      &now,
		"rejection_reason": requestBody.RejectionReason,
	}).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	// Reload the leave with updated data
	if err := h.db.Preload("LeaveType").Preload("User").Preload("Approver").First(&leave, parsedLeaveID).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Leave application rejected successfully", leave)
}

// GetDashboardStats - Admin endpoint to get dashboard statistics
func (h *LeaveHandler) GetDashboardStats(c *gin.Context) {
	// Get date parameter (default to today)
	dateStr := c.DefaultQuery("date", time.Now().Format("2006-01-02"))

	// Parse the date
	selectedDate, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid date format", err.Error())
		return
	}

	// Calculate date ranges based on the selected date
	startOfDay := time.Date(selectedDate.Year(), selectedDate.Month(), selectedDate.Day(), 0, 0, 0, 0, selectedDate.Location())
	startOfYear := time.Date(selectedDate.Year(), 1, 1, 0, 0, 0, 0, selectedDate.Location())
	endOfYear := time.Date(selectedDate.Year()+1, 1, 1, 0, 0, 0, 0, selectedDate.Location())

	// Count pending leaves (all pending, not date-specific)
	var pendingCount int64
	h.db.Model(&models.LeaveApplication{}).Where("status = ?", "pending").Count(&pendingCount)

	// Count approved leaves for the year
	var approvedCount int64
	h.db.Model(&models.LeaveApplication{}).Where("status = ? AND created_at >= ? AND created_at < ?",
		"approved", startOfYear, endOfYear).Count(&approvedCount)

	// Count employees out on the selected date (approved leaves that include the selected date)
	var employeesOutToday int64
	h.db.Model(&models.LeaveApplication{}).Where(
		"status = ? AND start_date <= ? AND end_date >= ?",
		"approved", startOfDay, startOfDay).Count(&employeesOutToday)

	// Calculate average days per employee for the year
	var totalDays int64
	var totalEmployees int64

	// Get total approved leave days for the year (accounting for half-day leaves)
	h.db.Model(&models.LeaveApplication{}).
		// Select("COALESCE(SUM(EXTRACT(DAY FROM (end_date - start_date)) + 1), 0)").
		Select("COALESCE(SUM(CASE WHEN is_half_day = true THEN 0.5 ELSE EXTRACT(DAY FROM (end_date - start_date)) + 1 END), 0)").
		Where("status = ? AND created_at >= ? AND created_at < ?", "approved", startOfYear, endOfYear).
		Scan(&totalDays)

	// Get total number of employees who took leave this year
	h.db.Model(&models.LeaveApplication{}).
		Select("COUNT(DISTINCT user_id)").
		Where("status = ? AND created_at >= ? AND created_at < ?", "approved", startOfYear, endOfYear).
		Scan(&totalEmployees)

	// Calculate average (avoid division by zero)
	var avgDaysPerEmployee float64
	if totalEmployees > 0 {
		avgDaysPerEmployee = float64(totalDays) / float64(totalEmployees)
	}

	// Prepare response
	stats := gin.H{
		"leaves_pending":        pendingCount,
		"leaves_approved":       approvedCount,
		"employees_out_today":   employeesOutToday,
		"avg_days_per_employee": avgDaysPerEmployee,
		"selected_date":         dateStr,
		"total_leave_days":      totalDays,
		"total_employees":       totalEmployees,
	}

	utils.SuccessResponse(c, http.StatusOK, "Dashboard stats retrieved successfully", stats)
}

// GetTeamLeaveBalances - Admin endpoint to get team leave balances
func (h *LeaveHandler) GetTeamLeaveBalances(c *gin.Context) {
	// Get year parameter (default to current year)
	year := time.Now().Year()
	if yearParam := c.Query("year"); yearParam != "" {
		if parsedYear, err := strconv.Atoi(yearParam); err == nil {
			year = parsedYear
		}
	}

	// Query to get team leave balances with user information
	var teamBalances []struct {
		UserID        uuid.UUID `json:"user_id"`
		FirstName     string    `json:"first_name"`
		LastName      string    `json:"last_name"`
		EmployeeID    string    `json:"employee_id"`
		Position      string    `json:"position"`
		LeaveTypeName string    `json:"leave_type_name"`
		AllocatedDays int       `json:"allocated_days"`
		UsedDays      float64   `json:"used_days"`
		RemainingDays float64   `json:"remaining_days"`
	}

	// Join leave balances with users and leave types
	if err := h.db.Table("leave_balances lb").
		Select(`
            u.id as user_id,
            u.first_name,
            u.last_name,
            u.employee_id,
            u.position,
            lt.name as leave_type_name,
            lb.allocated_days,
            lb.used_days,
            (lb.allocated_days - lb.used_days) as remaining_days
        `).
		Joins("JOIN users u ON lb.user_id = u.id").
		Joins("JOIN leave_types lt ON lb.leave_type_id = lt.id").
		Where("lb.year = ? AND u.role = ?", year, "employee").
		Scan(&teamBalances).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	// Group by employee and organize by leave type
	employeeMap := make(map[uuid.UUID]map[string]interface{})

	for _, balance := range teamBalances {
		if _, exists := employeeMap[balance.UserID]; !exists {
			employeeMap[balance.UserID] = map[string]interface{}{
				"user_id":         balance.UserID,
				"first_name":      balance.FirstName,
				"last_name":       balance.LastName,
				"employee_id":     balance.EmployeeID,
				"position":        balance.Position,
				"leave_types":     make(map[string]map[string]interface{}),
				"total_allocated": 0,
				"total_used":      0.0,
				"total_remaining": 0.0,
			}
		}

		employee := employeeMap[balance.UserID]
		leaveTypes := employee["leave_types"].(map[string]map[string]interface{})

		leaveTypes[balance.LeaveTypeName] = map[string]interface{}{
			"allocated": balance.AllocatedDays,
			"used":      balance.UsedDays,
			"remaining": balance.RemainingDays,
		}

		// Update totals
		employee["total_allocated"] = employee["total_allocated"].(int) + balance.AllocatedDays
		employee["total_used"] = employee["total_used"].(float64) + balance.UsedDays
		employee["total_remaining"] = employee["total_remaining"].(float64) + balance.RemainingDays
	}

	// Convert map to slice for response
	var result []map[string]interface{}
	for _, employee := range employeeMap {
		result = append(result, employee)
	}

	utils.SuccessResponse(c, http.StatusOK, "Team leave balances retrieved successfully", result)
}

// GetEmployeeLeaves - Admin endpoint to get specific employee's leave requests
func (h *LeaveHandler) GetEmployeeLeaves(c *gin.Context) {
	userID := c.Param("userId")
	if userID == "" {
		// utils.BadRequestResponse(c, "User ID is required")
		utils.ErrorResponse(c, http.StatusBadRequest, "User ID is required", "")
		return
	}

	// Parse user ID
	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		// utils.BadRequestResponse(c, "Invalid user ID format")
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid user ID format", err.Error())
		return
	}

	// Get query parameters
	status := c.Query("status")
	year := time.Now().Year()
	if yearParam := c.Query("year"); yearParam != "" {
		if parsedYear, err := strconv.Atoi(yearParam); err == nil {
			year = parsedYear
		}
	}

	// Build query
	query := h.db.Preload("User").Preload("LeaveType").Where("user_id = ?", parsedUserID)

	// Add status filter if provided
	if status != "" {
		query = query.Where("status = ?", status)
	}

	// Add year filter
	query = query.Where("EXTRACT(YEAR FROM start_date) = ?", year)

	// Order by created_at descending (newest first)
	query = query.Order("created_at DESC")

	var leaves []models.LeaveApplication
	if err := query.Find(&leaves).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Employee leaves retrieved successfully", leaves)
}

// CreateLeave
func (h *LeaveHandler) CreateLeave(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists || userID == uuid.Nil {
		utils.UnauthorizedResponse(c)
		return
	}

	var req CreateLeaveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err)
		return
	}

	// Parse dates
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid start date format", err.Error())
		return
	}

	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid end date format", err.Error())
		return
	}

	// Validate dates
	if endDate.Before(startDate) {
		utils.ErrorResponse(c, http.StatusBadRequest, "End date cannot be before start date", "")
		return
	}

	// Check if leave type exists
	var leaveType models.LeaveType
	if err := h.db.Where("id = ? AND is_active = true", req.LeaveTypeID).First(&leaveType).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid leave type", "")
			return
		}
		utils.InternalErrorResponse(c, err)
		return
	}

	// Create leave application (status: pending, no balance deduction yet)
	leave := models.LeaveApplication{
		UserID:      userID.(uuid.UUID),
		LeaveTypeID: req.LeaveTypeID,
		StartDate:   startDate,
		EndDate:     endDate,
		IsHalfDay:   req.IsHalfDay,
		Reason:      &req.Reason,
		Description: &req.Description,
		Status:      "pending", // Leave is pending, balance not deducted yet
	}

	if err := h.db.Create(&leave).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	// Calculate days for LOP breakdown
	var daysRequested float64
	if req.IsHalfDay {
		daysRequested = 0.5
	} else {
		days := int(endDate.Sub(startDate).Hours()/24) + 1
		daysRequested = float64(days)
	}

	// Calculate LOP breakdown
	paidDays, lopDays, isLOP, err := h.leaveService.CalculateLOPBreakdown(userID.(uuid.UUID), req.LeaveTypeID, startDate.Year(), daysRequested)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to calculate leave breakdown", err.Error())
		return
	}

	// Update leave application with LOP information
	leave.UserID = userID.(uuid.UUID)
	leave.LeaveTypeID = req.LeaveTypeID
	leave.StartDate = startDate
	leave.EndDate = endDate
	leave.IsHalfDay = req.IsHalfDay
	leave.IsLOP = isLOP
	leave.LOPDays = lopDays
	leave.PaidDays = paidDays
	leave.Reason = &req.Reason
	leave.Description = &req.Description
	leave.Status = "pending"

	if err := h.db.Create(&leave).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	// Validate leave balance (this will always pass now since we allow LOP)
	if err := h.leaveService.ValidateLeaveBalance(userID.(uuid.UUID), req.LeaveTypeID, startDate.Year(), daysRequested); err != nil {
		// If validation fails, rollback the leave application
		h.db.Delete(&leave)
		// utils.ErrorResponse(c, http.StatusBadRequest, "Insufficient leave balance", err.Error())
		utils.ErrorResponse(c, http.StatusBadRequest, "Leave validation failed", err.Error())
		return
	}

	// Load relationships
	if err := h.db.Preload("LeaveType").Preload("User").First(&leave, leave.ID).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Leave application created successfully", leave)
}

func (h *LeaveHandler) UpdateLeave(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists || userID == uuid.Nil {
		utils.UnauthorizedResponse(c)
		return
	}

	leaveID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid leave ID", err.Error())
		return
	}

	var req UpdateLeaveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err)
		return
	}

	// Find leave application
	var leave models.LeaveApplication
	if err := h.db.Where("id = ? AND user_id = ?", leaveID, userID).First(&leave).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Leave application")
			return
		}
		utils.InternalErrorResponse(c, err)
		return
	}

	// Check if leave can be updated (only pending leaves)
	if leave.Status != "pending" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Cannot update non-pending leave application", "")
		return
	}

	// Update fields
	updates := make(map[string]interface{})

	if req.StartDate != "" {
		startDate, err := time.Parse("2006-01-02", req.StartDate)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid start date format", err.Error())
			return
		}
		updates["start_date"] = startDate
	}

	if req.EndDate != "" {
		endDate, err := time.Parse("2006-01-02", req.EndDate)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid end date format", err.Error())
			return
		}
		updates["end_date"] = endDate
	}

	updates["is_half_day"] = req.IsHalfDay
	if req.Reason != "" {
		updates["reason"] = req.Reason
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}

	if err := h.db.Model(&leave).Updates(updates).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	// Load updated leave with relationships
	if err := h.db.Preload("LeaveType").Preload("User").First(&leave, leave.ID).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Leave application updated successfully", leave)
}

func (h *LeaveHandler) DeleteLeave(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists || userID == uuid.Nil {
		utils.UnauthorizedResponse(c)
		return
	}

	leaveID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid leave ID", err.Error())
		return
	}

	// Find leave application
	var leave models.LeaveApplication
	if err := h.db.Where("id = ? AND user_id = ?", leaveID, userID).First(&leave).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Leave application")
			return
		}
		utils.InternalErrorResponse(c, err)
		return
	}

	// Check if leave can be deleted (only pending leaves)
	if leave.Status != "pending" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Cannot delete non-pending leave application", "")
		return
	}

	if err := h.db.Delete(&leave).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Leave application deleted successfully", nil)
}

func (h *LeaveHandler) GetLeaveBalance(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists || userID == uuid.Nil {
		utils.UnauthorizedResponse(c)
		return
	}

	year, _ := strconv.Atoi(c.DefaultQuery("year", strconv.Itoa(time.Now().Year())))

	var balances []models.LeaveBalance
	if err := h.db.Preload("LeaveType").Where("user_id = ? AND year = ?", userID, year).Find(&balances).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Leave balance retrieved successfully", balances)
}

func (h *LeaveHandler) GetLeaveTypes(c *gin.Context) {
	var leaveTypes []models.LeaveType
	if err := h.db.Where("is_active = true").Find(&leaveTypes).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Leave types retrieved successfully", leaveTypes)
}
