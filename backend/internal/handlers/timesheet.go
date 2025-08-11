package handlers

import (
	"employee-dashboard-api/internal/config"
	"employee-dashboard-api/internal/models"
	"employee-dashboard-api/internal/utils"
	"errors"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type TimesheetHandler struct {
	db       *gorm.DB
	config   *config.Config
	logger   *logrus.Logger
	location *time.Location
}

func NewTimesheetHandler(db *gorm.DB, cfg *config.Config, logger *logrus.Logger, location *time.Location) *TimesheetHandler {
	return &TimesheetHandler{
		db:       db,
		config:   cfg,
		logger:   logger,
		location: location,
	}
}

// ▶️ NEW: parseAndValidateTimes combines entryDate + time strings into full Time and ensures end > start.
func (h *TimesheetHandler) parseAndValidateTimes(entryDate time.Time, startStr, endStr string) (time.Time, time.Time, error) {
	layout := "15:04"
	s, err := time.Parse(layout, startStr)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	e, err := time.Parse(layout, endStr)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	// merge date
	fullStart := time.Date(entryDate.Year(), entryDate.Month(), entryDate.Day(),
		s.Hour(), s.Minute(), 0, 0, h.location)
	fullEnd := time.Date(entryDate.Year(), entryDate.Month(), entryDate.Day(),
		e.Hour(), e.Minute(), 0, 0, h.location)
	if !fullEnd.After(fullStart) {
		return time.Time{}, time.Time{}, errors.New("end time must be after start time")
	}
	return fullStart, fullEnd, nil
}

// ▶️ NEW: ensureNoOverlap fetches existing entries (excluding excludeID) and checks for any time overlap.
func (h *TimesheetHandler) ensureNoOverlap(
	userID uuid.UUID,
	date time.Time,
	newStart, newEnd time.Time,
	excludeID uuid.UUID,
) error {
	var entries []models.TimesheetEntry
	q := h.db.Where("user_id = ? AND entry_date = ?", userID, date)
	if excludeID != uuid.Nil {
		q = q.Where("id <> ?", excludeID)
	}
	if err := q.Find(&entries).Error; err != nil {
		return err
	}
	for _, ex := range entries {
		if ex.StartTime != nil && ex.EndTime != nil {
			// overlap if newStart < existing End && newEnd > existing Start
			if newStart.Before(*ex.EndTime) && newEnd.After(*ex.StartTime) {
				return fmt.Errorf(
					"Time entry already existing in this %s (%s–%s)",
					ex.ID.String(),
					ex.StartTime.Format("15:04"),
					ex.EndTime.Format("15:04"),
				)
			}
		}
	}
	return nil
}

type CreateTimesheetRequest struct {
	ProjectID        uuid.UUID `json:"project_id" binding:"required"`
	TaskDescription  string    `json:"task_description" binding:"required"`
	EntryDate        string    `json:"entry_date" binding:"required"`
	StartTime        string    `json:"start_time"`
	EndTime          string    `json:"end_time"`
	DurationHours    float64   `json:"duration_hours"`
	BreakTimeMinutes int       `json:"break_time_minutes"`
}

type UpdateTimesheetRequest struct {
	TaskDescription  string  `json:"task_description"`
	StartTime        string  `json:"start_time"`
	EndTime          string  `json:"end_time"`
	DurationHours    float64 `json:"duration_hours"`
	BreakTimeMinutes int     `json:"break_time_minutes"`
}

// @Summary Create a new timesheet entry
// @Description Adds a new time entry for the authenticated user.
// @Tags Timesheets
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param entry body CreateTimesheetRequest true "Timesheet entry details"
// @Success 201 {object} models.TimesheetEntry "Timesheet entry created successfully"
// @Failure 400 {object} utils.APIResponse "Invalid request payload or validation error (e.g., time overlap, daily limit exceeded)"
// @Failure 401 {object} utils.APIResponse "Unauthorized"
// @Failure 404 {object} utils.APIResponse "Project not found or inactive"
// @Router /timesheets [post]

func (h *TimesheetHandler) CreateTimesheet(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c)
		return
	}
	userIDUUID, ok := userID.(uuid.UUID)
	if !ok {
		utils.InternalErrorResponse(c, errors.New("invalid user ID format"))
		return
	}

	var req CreateTimesheetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err)
		return
	}

	// ▶️ Parse entry date in your app's timezone:
	entryDate, err := time.ParseInLocation("2006-01-02", req.EntryDate, h.location)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid entry date format", err.Error())
		return
	}

	// Check if project exists
	var project models.Project
	if err := h.db.Where("id = ? AND status = 'active'", req.ProjectID).
		First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid or inactive project", "")
			return
		}
		utils.InternalErrorResponse(c, err)
		return
	}

	// Check daily hour limit (8 hours max per day)
	var existingHours float64
	if err := h.db.Model(&models.TimesheetEntry{}).
		Select("COALESCE(SUM(duration_hours), 0)").
		Where("user_id = ? AND entry_date = ?", userIDUUID, entryDate).
		Scan(&existingHours).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}
	totalHours := existingHours + req.DurationHours
	if totalHours > 8.0 {
		utils.ErrorResponse(c, http.StatusBadRequest,
			fmt.Sprintf("Cannot exceed 8 hours per day. Current: %.1f hours, Trying to add: %.1f hours",
				existingHours, req.DurationHours), "")
		return
	}

	// ▶️ parse & validate times and check overlap before creating
	ts := models.TimesheetEntry{
		UserID:           userIDUUID,
		ProjectID:        req.ProjectID,
		TaskDescription:  req.TaskDescription,
		EntryDate:        entryDate,
		DurationHours:    &req.DurationHours,
		BreakTimeMinutes: req.BreakTimeMinutes,
		Status:           "draft",
	}
	if req.StartTime != "" && req.EndTime != "" {
		fullStart, fullEnd, err := h.parseAndValidateTimes(entryDate, req.StartTime, req.EndTime)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid time range", err.Error())
			return
		}
		if err := h.ensureNoOverlap(userIDUUID, entryDate, fullStart, fullEnd, uuid.Nil); err != nil {
			utils.ErrorResponse(c, http.StatusConflict, "Time overlap", err.Error())
			return
		}
		ts.StartTime = &fullStart
		ts.EndTime = &fullEnd
	}

	// Save
	if err := h.db.Create(&ts).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	// Load relationships
	if err := h.db.Preload("Project").First(&ts, ts.ID).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Timesheet entry created successfully", ts)
}

// /////////////////////////// UpdateTimesheet Summary Handler /////////////////////////////
func (h *TimesheetHandler) UpdateTimesheet(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c)
		return
	}
	userIDUUID, ok := userID.(uuid.UUID)
	if !ok {
		utils.InternalErrorResponse(c, errors.New("invalid user ID format"))
		return
	}

	timesheetID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid timesheet ID", err.Error())
		return
	}

	var req UpdateTimesheetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err)
		return
	}

	// Find existing entry
	var timesheet models.TimesheetEntry
	if err := h.db.Where("id = ? AND user_id = ?", timesheetID, userIDUUID).First(&timesheet).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Timesheet entry")
			return
		}
		utils.InternalErrorResponse(c, err)
		return
	}

	// Only draft can be updated
	if timesheet.Status != "draft" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Cannot update submitted timesheet entry", "")
		return
	}

	// Prepare updates map
	updates := make(map[string]interface{})
	if req.TaskDescription != "" {
		updates["task_description"] = req.TaskDescription
	}

	// ▶️ parse & validate new times and check overlap
	if req.StartTime != "" && req.EndTime != "" {
		fullStart, fullEnd, err := h.parseAndValidateTimes(timesheet.EntryDate, req.StartTime, req.EndTime)

		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid time range", err.Error())
			return
		}
		if err := h.ensureNoOverlap(userIDUUID, timesheet.EntryDate, fullStart, fullEnd, timesheet.ID); err != nil {
			utils.ErrorResponse(c, http.StatusConflict, "Time overlap", err.Error())
			return
		}
		updates["start_time"] = fullStart
		updates["end_time"] = fullEnd
	}

	if req.DurationHours > 0 {
		updates["duration_hours"] = req.DurationHours
	}
	updates["break_time_minutes"] = req.BreakTimeMinutes

	if len(updates) > 0 {
		if err := h.db.Model(&timesheet).Updates(updates).Error; err != nil {
			utils.InternalErrorResponse(c, err)
			return
		}
	}

	// Load updated entry
	if err := h.db.Preload("Project").First(&timesheet, timesheet.ID).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Timesheet entry updated successfully", timesheet)
}

// /////////////////////// Delete Timesheet Handler /////////////////////////
func (h *TimesheetHandler) DeleteTimesheet(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c)
		return
	}
	userIDUUID, ok := userID.(uuid.UUID)
	if !ok {
		utils.InternalErrorResponse(c, errors.New("invalid user ID format"))
		return
	}

	timesheetID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid timesheet ID", err.Error())
		return
	}

	// Find timesheet entry
	var timesheet models.TimesheetEntry
	if err := h.db.Where("id = ? AND user_id = ?", timesheetID, userIDUUID).First(&timesheet).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Timesheet entry")
			return
		}
		utils.InternalErrorResponse(c, err)
		return
	}

	// Check if timesheet can be deleted (only draft entries)
	if timesheet.Status != "draft" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Cannot delete submitted timesheet entry", "")
		return
	}

	if err := h.db.Delete(&timesheet).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Timesheet entry deleted successfully", nil)
}

// /////////////////////////// SubmitTimesheet Summary Handler /////////////////////////////
func (h *TimesheetHandler) SubmitTimesheet(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c)
		return
	}
	userIDUUID, ok := userID.(uuid.UUID)
	if !ok {
		utils.InternalErrorResponse(c, errors.New("invalid user ID format"))
		return
	}

	// Get date range for submission
	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")

	if startDateStr == "" || endDateStr == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Start date and end date are required", "")
		return
	}

	// Parse in app's timezone
	startDate, err := time.ParseInLocation("2006-01-02", startDateStr, h.location)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid start date format", err.Error())
		return
	}
	endDate, err := time.ParseInLocation("2006-01-02", endDateStr, h.location)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid end date format", err.Error())
		return
	}

	// Update all draft timesheets in the date range to submitted
	result := h.db.Model(&models.TimesheetEntry{}).
		Where("user_id = ? AND status = 'draft' AND entry_date BETWEEN ? AND ?", userIDUUID, startDate, endDate).
		Updates(map[string]interface{}{
			"status":       "submitted",
			"submitted_at": time.Now().In(h.location), // timezone-consistent timestamp
		})

	if result.Error != nil {
		utils.InternalErrorResponse(c, result.Error)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Timesheet submitted successfully", gin.H{
		"submitted_entries": result.RowsAffected,
	})
}

// ////////////////////////// GetTimesheet Summary Handler ////////////////////////////
// func (h *TimesheetHandler) GetTimesheetSummary(c *gin.Context) {
// 	userID, exists := c.Get("user_id")
// 	if !exists {
// 		utils.UnauthorizedResponse(c)
// 		return
// 	}
// 	userIDUUID, ok := userID.(uuid.UUID)
// 	if !ok {
// 		utils.InternalErrorResponse(c, errors.New("invalid user ID format"))
// 		return
// 	}

// 	startDateStr := c.Query("start_date")
// 	endDateStr := c.Query("end_date")

// 	if startDateStr == "" || endDateStr == "" {
// 		utils.ErrorResponse(c, http.StatusBadRequest, "Start date and end date are required", "")
// 		return
// 	}

// 	// Get summary data
// 	var summary struct {
// 		TotalHours   float64 `json:"total_hours"`
// 		TotalEntries int64   `json:"total_entries"`
// 	}

// 	if err := h.db.Model(&models.TimesheetEntry{}).
// 		Select("COALESCE(SUM(duration_hours), 0) as total_hours, COUNT(*) as total_entries").
// 		Where("user_id = ? AND entry_date BETWEEN ? AND ?", userIDUUID, startDateStr, endDateStr).
// 		Scan(&summary).Error; err != nil {
// 		utils.InternalErrorResponse(c, err)
// 		return
// 	}

// 	// Get project-wise breakdown
// 	var projectSummary []struct {
// 		ProjectID   uuid.UUID `json:"project_id"`
// 		ProjectName string    `json:"project_name"`
// 		TotalHours  float64   `json:"total_hours"`
// 		EntryCount  int64     `json:"entry_count"`
// 	}

// 	if err := h.db.Table("timesheet_entries").
// 		Select("timesheet_entries.project_id, projects.name as project_name, COALESCE(SUM(timesheet_entries.duration_hours), 0) as total_hours, COUNT(*) as entry_count").
// 		Joins("LEFT JOIN projects ON timesheet_entries.project_id = projects.id").
// 		Where("timesheet_entries.user_id = ? AND timesheet_entries.entry_date BETWEEN ? AND ?", userIDUUID, startDateStr, endDateStr).
// 		Group("timesheet_entries.project_id, projects.name").
// 		Scan(&projectSummary).Error; err != nil {
// 		utils.InternalErrorResponse(c, err)
// 		return
// 	}

// 	response := gin.H{
// 		"summary":         summary,
// 		"project_summary": projectSummary,
// 	}

// 	utils.SuccessResponse(c, http.StatusOK, "Timesheet summary retrieved successfully", response)
// }

// GetTimesheets handles retrieving a list of timesheet entries for a user with optional filters and pagination.
// func (h *TimesheetHandler) GetTimesheets(c *gin.Context) {
// 	currentUserID, exists := c.Get("user_id")
// 	if !exists {
// 		utils.UnauthorizedResponse(c)
// 		return
// 	}

// 	currentUserIDUUID, ok := currentUserID.(uuid.UUID)
// 	if !ok {
// 		utils.InternalErrorResponse(c, errors.New("invalid user ID format"))
// 		return
// 	}

// 	// Check if a specific user_id is requested
// 	requestedUserIDStr := c.Query("user_id")
// 	var targetUserID uuid.UUID

// 	if requestedUserIDStr != "" {
// 		// If user_id is provided, parse it
// 		parsedUserID, err := uuid.Parse(requestedUserIDStr)
// 		if err != nil {
// 			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid user ID format in query", err.Error())
// 			return
// 		}
// 		targetUserID = parsedUserID

// 		// Check if the current user has permission to view other users' timesheets
// 		// This will be handled by middleware, but a basic check here for clarity
// 		userRole, roleExists := c.Get("user_role")
// 		if !roleExists || (userRole != models.RoleAdmin && userRole != models.RoleHR && userRole != models.RoleManager) {
// 			utils.ForbiddenResponse(c)
// 			return
// 		}
// 		// If manager, ensure they can only see their direct reports (more complex, for now allow all for admin/HR/manager)
// 		// For a more granular manager view, you'd need to check manager_id relationship here.
// 	} else {
// 		// If no user_id is requested, default to the current user's ID
// 		targetUserID = currentUserIDUUID
// 	}

// 	// Parse query parameters
// 	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
// 	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
// 	status := c.Query("status")
// 	startDate := c.Query("start_date")
// 	endDate := c.Query("end_date")

// 	offset := (page - 1) * limit
// 	if offset < 0 {
// 		offset = 0
// 	}

// 	// query := h.db.Preload("Project").Where("user_id = ?", targetUserID) // Use targetUserID here
// 	query := h.db.Preload("Project").Preload("User").Where("user_id = ?", targetUserID)

// 	if status != "" {
// 		query = query.Where("status = ?", status)
// 	}

// 	if startDate != "" {
// 		query = query.Where("entry_date >= ?", startDate)
// 	}

// 	if endDate != "" {
// 		query = query.Where("entry_date <= ?", endDate)
// 	}

// 	var timesheets []models.TimesheetEntry
// 	var total int64

// 	// Get total count
// 	if err := query.Model(&models.TimesheetEntry{}).Count(&total).Error; err != nil {
// 		utils.InternalErrorResponse(c, err)
// 		return
// 	}

// 	// Get paginated results
// 	if err := query.Order("entry_date DESC, created_at DESC").Offset(offset).Limit(limit).Find(&timesheets).Error; err != nil {
// 		utils.InternalErrorResponse(c, err)
// 		return
// 	}

// 	response := gin.H{
// 		"timesheets": timesheets,
// 		"pagination": gin.H{
// 			"page":  page,
// 			"limit": limit,
// 			"total": total,
// 		},
// 	}

// 	utils.SuccessResponse(c, http.StatusOK, "Timesheets retrieved successfully", response)
// }

func (h *TimesheetHandler) GetTimesheetSummary(c *gin.Context) {
	// Get the ID of the user whose timesheet summary is being requested
	requestedUserIDStr := c.Query("user_id")
	var targetUserID uuid.UUID
	var err error

	if requestedUserIDStr != "" {
		targetUserID, err = uuid.Parse(requestedUserIDStr)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid user ID format in query", err.Error())
			return
		}
		// Add role-based access control here if needed, similar to GetTimesheets
		// For now, assuming middleware handles general access to this endpoint
	} else {
		// If no user_id is specified in query, default to the authenticated user's ID
		authUserID, exists := c.Get("user_id")
		if !exists {
			utils.UnauthorizedResponse(c)
			return
		}
		targetUserID, _ = authUserID.(uuid.UUID) // Assuming it's always a valid UUID from middleware
	}

	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")

	if startDateStr == "" || endDateStr == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Start date and end date are required", "")
		return
	}

	// Get summary data
	var summary struct {
		TotalHours   float64 `json:"total_hours"`
		TotalEntries int64   `json:"total_entries"`
	}

	if err := h.db.Model(&models.TimesheetEntry{}).
		Select("COALESCE(SUM(duration_hours), 0) as total_hours, COUNT(*) as total_entries").
		Where("user_id = ? AND entry_date BETWEEN ? AND ?", targetUserID, startDateStr, endDateStr). // <--- CHANGED TO targetUserID
		Scan(&summary).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	// Get project-wise breakdown
	var projectSummary []struct {
		ProjectID   uuid.UUID `json:"project_id"`
		ProjectName string    `json:"project_name"`
		TotalHours  float64   `json:"total_hours"`
		EntryCount  int64     `json:"entry_count"`
	}

	if err := h.db.Table("timesheet_entries").
		Select("timesheet_entries.project_id, projects.name as project_name, COALESCE(SUM(timesheet_entries.duration_hours), 0) as total_hours, COUNT(*) as entry_count").
		Joins("LEFT JOIN projects ON timesheet_entries.project_id = projects.id").
		Where("timesheet_entries.user_id = ? AND timesheet_entries.entry_date BETWEEN ? AND ?", targetUserID, startDateStr, endDateStr). // <--- CHANGED TO targetUserID
		Group("timesheet_entries.project_id, projects.name").
		Scan(&projectSummary).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	response := gin.H{
		"summary":         summary,
		"project_summary": projectSummary,
	}

	utils.SuccessResponse(c, http.StatusOK, "Timesheet summary retrieved successfully", response)
}

// @Summary Get timesheet entries
// @Description Retrieve timesheet entries for the authenticated user, with optional filters.
// @Tags Timesheets
// @Security ApiKeyAuth
// @Produce json
// @Param user_id query string false "Filter by user ID (admin/HR/manager only)"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Number of items per page" default(10)
// @Param status query string false "Filter by status (draft, submitted, approved)"
// @Param start_date query string false "Filter by start date (YYYY-MM-DD)"
// @Param end_date query string false "Filter by end date (YYYY-MM-DD)"
// @Success 200 {object} object{timesheets=[]models.TimesheetEntry,pagination=object{page=int,limit=int,total=int}} "Timesheets retrieved successfully"
// @Failure 401 {object} utils.APIResponse "Unauthorized"
// @Failure 403 {object} utils.APIResponse "Forbidden (if trying to access other user's timesheets without permission)"
// @Router /timesheets [get]

func (h *TimesheetHandler) GetTimesheets(c *gin.Context) {
	currentUserID, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c)
		return
	}

	currentUserIDUUID, ok := currentUserID.(uuid.UUID)
	if !ok {
		utils.InternalErrorResponse(c, errors.New("invalid user ID format"))
		return
	}

	requestedUserIDStr := c.Query("user_id")
	var targetUserID uuid.UUID

	if requestedUserIDStr != "" {
		parsedUserID, err := uuid.Parse(requestedUserIDStr)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid user ID format in query", err.Error())
			return
		}
		targetUserID = parsedUserID

		// If the requested user ID is different from the current user's ID,
		// then perform role-based access control.
		if targetUserID != currentUserIDUUID {
			// Fetch user's role from DB if not already set by a middleware
			var currentUser models.User
			if err := h.db.Select("role").Where("id = ?", currentUserIDUUID).First(&currentUser).Error; err != nil {
				// If the current user cannot be found, or there's a DB error,
				// it's an internal issue or an invalid token.
				utils.InternalErrorResponse(c, err)
				return
			}

			// Check if current user has sufficient role to view other users' timesheets
			if currentUser.Role != models.RoleAdmin && currentUser.Role != models.RoleHR && currentUser.Role != models.RoleManager {
				utils.ForbiddenResponse(c)
				return
			}
		}
		// If targetUserID == currentUserIDUUID, it's a request for their own data, which is allowed.
	} else {
		// If no user_id is requested, default to the current user's ID
		targetUserID = currentUserIDUUID
	}

	// ... (rest of the function remains the same, starting from parsing query parameters) ...
	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	status := c.Query("status")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	offset := (page - 1) * limit
	if offset < 0 {
		offset = 0
	}

	query := h.db.Preload("Project").Preload("User").Where("user_id = ?", targetUserID)

	if status != "" {
		query = query.Where("status = ?", status)
	}

	if startDate != "" {
		query = query.Where("entry_date >= ?", startDate)
	}

	if endDate != "" {
		query = query.Where("entry_date <= ?", endDate)
	}

	var timesheets []models.TimesheetEntry
	var total int64

	// Get total count
	if err := query.Model(&models.TimesheetEntry{}).Count(&total).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	// Get paginated results
	if err := query.Order("entry_date DESC, created_at DESC").Offset(offset).Limit(limit).Find(&timesheets).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	response := gin.H{
		"timesheets": timesheets,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	}

	utils.SuccessResponse(c, http.StatusOK, "Timesheets retrieved successfully", response)
}

// DownloadTimesheetEntry handles downloading a specific timesheet entry as CSV/PDF
func (h *TimesheetHandler) DownloadTimesheetEntry(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c)
		return
	}
	userIDUUID, ok := userID.(uuid.UUID)
	if !ok {
		utils.InternalErrorResponse(c, errors.New("invalid user ID format"))
		return
	}

	timesheetID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid timesheet ID", err.Error())
		return
	}

	// Check user role for admin access
	userRole, roleExists := c.Get("user_role")
	if !roleExists {
		utils.UnauthorizedResponse(c)
		return
	}

	var timesheet models.TimesheetEntry
	query := h.db.Preload("Project").Preload("User")

	// Admin/HR/Manager can download any timesheet, others can only download their own
	if userRole == models.RoleAdmin || userRole == models.RoleHR || userRole == models.RoleManager {
		query = query.Where("id = ?", timesheetID)
	} else {
		query = query.Where("id = ? AND user_id = ?", timesheetID, userIDUUID)
	}

	if err := query.First(&timesheet).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Timesheet entry")
			return
		}
		utils.InternalErrorResponse(c, err)
		return
	}

	// Generate CSV content
	csvContent := fmt.Sprintf("Employee,Employee ID,Project,Task,Date,Start Time,End Time,Duration,Status\n")
	csvContent += fmt.Sprintf("%s %s,%s,%s,%s,%s,%s,%s,%.2f,%s\n",
		timesheet.User.FirstName,
		timesheet.User.LastName,
		timesheet.User.EmployeeID,
		timesheet.Project.Name,
		timesheet.TaskDescription,
		timesheet.EntryDate.Format("2006-01-02"),
		formatTime(timesheet.StartTime),
		formatTime(timesheet.EndTime),
		getFloatValue(timesheet.DurationHours),
		timesheet.Status,
	)

	// Set headers for CSV download
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"timesheet_%s_%s.csv\"",
		timesheet.User.EmployeeID, timesheet.EntryDate.Format("2006-01-02")))

	c.String(http.StatusOK, csvContent)
}

// DownloadTimesheetsBulk handles downloading multiple timesheet entries based on filters
// func (h *TimesheetHandler) DownloadTimesheetsBulk(c *gin.Context) {
// 	// Check user role for admin access
// 	userRole, roleExists := c.Get("user_role")
// 	if !roleExists || (userRole != models.RoleAdmin && userRole != models.RoleHR && userRole != models.RoleManager) {
// 		utils.ForbiddenResponse(c)
// 		return
// 	}

// 	// Parse query parameters for filtering
// 	requestedUserIDStr := c.Query("user_id")
// 	startDate := c.Query("start_date")
// 	endDate := c.Query("end_date")
// 	status := c.Query("status")

// 	query := h.db.Preload("Project").Preload("User")

// 	if requestedUserIDStr != "" {
// 		userID, err := uuid.Parse(requestedUserIDStr)
// 		if err != nil {
// 			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid user ID format", err.Error())
// 			return
// 		}
// 		query = query.Where("user_id = ?", userID)
// 	}

// 	if startDate != "" {
// 		query = query.Where("entry_date >= ?", startDate)
// 	}

// 	if endDate != "" {
// 		query = query.Where("entry_date <= ?", endDate)
// 	}

// 	if status != "" {
// 		query = query.Where("status = ?", status)
// 	}

// 	var timesheets []models.TimesheetEntry
// 	// Order by Date (ascending), then Employee Name (ascending)
// 	if err := query.Order("timesheet_entries.entry_date ASC, users.first_name ASC, users.last_name ASC").Find(&timesheets).Error; err != nil {
// 		utils.InternalErrorResponse(c, err)
// 		return
// 	}

// 	// Generate CSV content
// 	// New Column Order: Date, Employee Name, Employee ID, Project, Task, Start Time, End Time, Duration (hours), Status
// 	csvContent := "Date,Employee Name,Employee ID,Project,Task,Start Time,End Time,Duration (hours),Status\n"

// 	for _, timesheet := range timesheets {
// 		// Ensure all necessary user and project data is loaded
// 		if timesheet.User.ID == uuid.Nil { // Check if User is loaded
// 			h.db.First(&timesheet.User, timesheet.UserID)
// 		}
// 		if timesheet.Project.ID == uuid.Nil { // Check if Project is loaded
// 			h.db.First(&timesheet.Project, timesheet.ProjectID)
// 		}

// 		csvContent += fmt.Sprintf("%s,%s %s,%s,%s,%s,%s,%s,%.2f,%s\n",
// 			timesheet.EntryDate.Format("2006-01-02"), // Date (YYYY-MM-DD)
// 			timesheet.User.FirstName,                 // Employee Name
// 			timesheet.User.LastName,                  // Employee Name
// 			timesheet.User.EmployeeID,                // Employee ID
// 			timesheet.Project.Name,                   // Project
// 			timesheet.TaskDescription,                // Task
// 			formatTime(timesheet.StartTime),          // Start Time (HH:MM)
// 			formatTime(timesheet.EndTime),            // End Time (HH:MM)
// 			getFloatValue(timesheet.DurationHours),   // Duration (hours)
// 			capitalizeFirstLetter(timesheet.Status),  // Status (Capitalized)
// 		)
// 	}

// 	// Determine filename based on single user and date range
// 	filename := "timesheets_export.csv" // Default filename
// 	if requestedUserIDStr != "" && len(timesheets) > 0 {
// 		employeeName := fmt.Sprintf("%s %s", timesheets[0].User.FirstName, timesheets[0].User.LastName)
// 		filename = fmt.Sprintf("%s_%s_to_%s.csv",
// 			strings.ReplaceAll(employeeName, " ", "_"), // Replace spaces for filename
// 			startDate,
// 			endDate,
// 		)
// 	} else if len(timesheets) > 0 {
// 		// If no specific user_id, but there are entries, use a general date range
// 		filename = fmt.Sprintf("timesheets_export_%s_to_%s.csv", startDate, endDate)
// 	}

// 	// Set headers for CSV download
// 	c.Header("Content-Type", "text/csv")
// 	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))

// 	c.String(http.StatusOK, csvContent)
// }

// DownloadTimesheetsBulk handles downloading multiple timesheet entries based on filters
// func (h *TimesheetHandler) DownloadTimesheetsBulk(c *gin.Context) {
// 	// Check user role for admin access
// 	userRole, roleExists := c.Get("user_role")
// 	if !roleExists || (userRole != models.RoleAdmin && userRole != models.RoleHR && userRole != models.RoleManager) {
// 		utils.ForbiddenResponse(c)
// 		return
// 	}

// 	// Parse query parameters for filtering
// 	requestedUserIDStr := c.Query("user_id")
// 	startDate := c.Query("start_date")
// 	endDate := c.Query("end_date")
// 	status := c.Query("status")

// 	// Add explicit JOIN for users table to allow sorting by user fields
// 	query := h.db.Preload("Project").Preload("User").Joins("JOIN users ON users.id = timesheet_entries.user_id")

// 	if requestedUserIDStr != "" {
// 		userID, err := uuid.Parse(requestedUserIDStr)
// 		if err != nil {
// 			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid user ID format", err.Error())
// 			return
// 		}
// 		query = query.Where("timesheet_entries.user_id = ?", userID) // Use table prefix for clarity
// 	}

// 	if startDate != "" {
// 		query = query.Where("timesheet_entries.entry_date >= ?", startDate) // Use table prefix
// 	}

// 	if endDate != "" {
// 		query = query.Where("timesheet_entries.entry_date <= ?", endDate) // Use table prefix
// 	}

// 	if status != "" {
// 		query = query.Where("timesheet_entries.status = ?", status) // Use table prefix
// 	}

// 	var timesheets []models.TimesheetEntry
// 	// Order by Date (ascending), then Employee Name (ascending)
// 	// Use table prefixes for clarity and to avoid ambiguity
// 	if err := query.Order("timesheet_entries.entry_date ASC, users.first_name ASC, users.last_name ASC").Find(&timesheets).Error; err != nil {
// 		utils.InternalErrorResponse(c, err)
// 		return
// 	}

// 	// Generate CSV content
// 	// New Column Order: Date, Employee Name, Employee ID, Project, Task, Start Time, End Time, Duration (hours), Status
// 	csvContent := "Date,Employee Name,Employee ID,Project,Task,Start Time,End Time,Duration (hours),Status\n"

// 	for _, timesheet := range timesheets {
// 		// Ensure all necessary user and project data is loaded
// 		// These checks might be redundant with Preload and Joins, but good for robustness
// 		if timesheet.User.ID == uuid.Nil { // Check if User is loaded
// 			h.db.First(&timesheet.User, timesheet.UserID)
// 		}
// 		if timesheet.Project.ID == uuid.Nil { // Check if Project is loaded
// 			h.db.First(&timesheet.Project, timesheet.ProjectID)
// 		}

// 		csvContent += fmt.Sprintf("%s,%s %s,%s,%s,%s,%s,%s,%.2f,%s\n",
// 			timesheet.EntryDate.Format("2006-01-02"), // Date (YYYY-MM-DD)
// 			timesheet.User.FirstName,                 // Employee Name
// 			timesheet.User.LastName,                  // Employee Name
// 			timesheet.User.EmployeeID,                // Employee ID
// 			timesheet.Project.Name,                   // Project
// 			timesheet.TaskDescription,                // Task
// 			formatTime(timesheet.StartTime),          // Start Time (HH:MM)
// 			formatTime(timesheet.EndTime),            // End Time (HH:MM)
// 			getFloatValue(timesheet.DurationHours),   // Duration (hours)
// 			capitalizeFirstLetter(timesheet.Status),  // Status (Capitalized)
// 		)
// 	}

// 	// Determine filename based on single user and date range
// 	filename := "timesheets_export.csv" // Default filename
// 	if requestedUserIDStr != "" && len(timesheets) > 0 {
// 		// Format: <employee_id>_timesheet_from_<startdate>To<enddate>.csv
// 		filename = fmt.Sprintf("%s_timesheet_from_%sTo%s.csv",
// 			timesheets[0].User.EmployeeID,
// 			startDate,
// 			endDate,
// 		)
// 	} else if len(timesheets) > 0 {
// 		// If no specific user_id, but there are entries, use a general date range
// 		filename = fmt.Sprintf("timesheets_export_from_%sTo%s.csv", startDate, endDate)
// 	}

// 	// Set headers for CSV download
// 	c.Header("Content-Type", "text/csv")
// 	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))

// 	c.String(http.StatusOK, csvContent)
// }

// Helper functions for formatting
func formatTime(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format("15:04")
}

func getFloatValue(f *float64) float64 {
	if f == nil {
		return 0.0
	}
	return *f
}

// capitalizeFirstLetter capitalizes the first letter of a string.
func capitalizeFirstLetter(s string) string {
	if len(s) == 0 {
		return s
	}
	return strings.ToUpper(s[:1]) + s[1:]
}

// //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// DownloadTimesheetsBulk handles downloading multiple timesheet entries based on filters
// DownloadTimesheetsBulk handles downloading multiple timesheet entries based on filters
func (h *TimesheetHandler) DownloadTimesheetsBulk(c *gin.Context) {
	// Check user role for admin access
	userRole, roleExists := c.Get("user_role")
	if !roleExists || (userRole != models.RoleAdmin && userRole != models.RoleHR && userRole != models.RoleManager) {
		utils.ForbiddenResponse(c)
		return
	}

	// Parse query parameters for filtering
	requestedUserIDStr := c.Query("user_id")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	status := c.Query("status")

	// Explicit JOIN to allow ordering by user fields
	query := h.db.Preload("Project").Preload("User").Joins("JOIN users ON users.id = timesheet_entries.user_id")

	if requestedUserIDStr != "" {
		userID, err := uuid.Parse(requestedUserIDStr)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid user ID format", err.Error())
			return
		}
		query = query.Where("timesheet_entries.user_id = ?", userID)
	}
	if startDate != "" {
		query = query.Where("timesheet_entries.entry_date >= ?", startDate)
	}
	if endDate != "" {
		query = query.Where("timesheet_entries.entry_date <= ?", endDate)
	}
	if status != "" {
		query = query.Where("timesheet_entries.status = ?", status)
	}

	var timesheets []models.TimesheetEntry
	if err := query.
		Order("timesheet_entries.entry_date ASC, users.first_name ASC, users.last_name ASC").
		Find(&timesheets).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	// ▶️ UPDATED: Build weekly, employee-formatted CSV like the template

	// Parse range in app tz for header lines
	var (
		from time.Time
		to   time.Time
		err  error
	)
	if startDate != "" {
		from, err = time.ParseInLocation("2006-01-02", startDate, h.location)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid start date format", err.Error())
			return
		}
	}
	if endDate != "" {
		to, err = time.ParseInLocation("2006-01-02", endDate, h.location)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid end date format", err.Error())
			return
		}
	}

	// Group by user
	byUser := map[uuid.UUID][]models.TimesheetEntry{}
	orderUserIDs := []uuid.UUID{}
	seen := map[uuid.UUID]bool{}
	for _, ts := range timesheets {
		byUser[ts.UserID] = append(byUser[ts.UserID], ts)
		if !seen[ts.UserID] {
			orderUserIDs = append(orderUserIDs, ts.UserID)
			seen[ts.UserID] = true
		}
	}

	var b strings.Builder

	for _, uid := range orderUserIDs {
		entries := byUser[uid]
		if len(entries) == 0 {
			continue
		}
		u := entries[0].User // User preloaded

		// Month label from the range start (or from first entry if no range)
		monthSrc := from
		if monthSrc.IsZero() {
			monthSrc = entries[0].EntryDate
		}
		monthLabel := strings.ToUpper(monthSrc.Month().String()) // e.g., MAY

		// Sum total hours in range
		var totalWeekHours float64
		// Group by day
		perDay := map[string]struct {
			hours      float64
			activities []string
		}{}
		var dayKeys []string

		for _, ts := range entries {
			dayKey := ts.EntryDate.In(h.location).Format("02-01-2006") // dd-mm-yyyy for table
			rec := perDay[dayKey]
			rec.hours += getFloatValue(ts.DurationHours)

			// Build activity text: "Project - task (HH:MM-HH:MM)"
			var timePart string
			if ts.StartTime != nil || ts.EndTime != nil {
				timePart = "(" + formatTime(ts.StartTime)
				if ts.EndTime != nil {
					timePart += "-" + formatTime(ts.EndTime)
				}
				timePart += ")"
			}
			proj := ts.Project.Name
			if proj == "" {
				proj = "Project"
			}
			activity := strings.TrimSpace(
				fmt.Sprintf("%s - %s %s", proj, ts.TaskDescription, timePart),
			)
			rec.activities = append(rec.activities, activity)

			perDay[dayKey] = rec
		}

		for k := range perDay {
			dayKeys = append(dayKeys, k)
		}
		sort.Slice(dayKeys, func(i, j int) bool {
			// convert dd-mm-yyyy back to time for sort safety
			ti, _ := time.ParseInLocation("02-01-2006", dayKeys[i], h.location)
			tj, _ := time.ParseInLocation("02-01-2006", dayKeys[j], h.location)
			return ti.Before(tj)
		})

		for _, k := range dayKeys {
			totalWeekHours += perDay[k].hours
		}

		// Header block (matching your screenshot)
		// Row1: MONTH
		b.WriteString(monthLabel + "\n")
		// Row2: Name
		b.WriteString(fmt.Sprintf("Name:,%s %s\n", u.FirstName, u.LastName))
		// Row3: Time Period (dd-mm-yyyy to dd-mm-yyyy)
		if !from.IsZero() && !to.IsZero() {
			b.WriteString(fmt.Sprintf("Time Period(mm-dd-yyyy) :,%s to %s\n",
				from.In(h.location).Format("02-01-2006"),
				to.In(h.location).Format("02-01-2006"),
			))
		} else {
			// fallback to min→max from data
			minD := entries[0].EntryDate
			maxD := entries[len(entries)-1].EntryDate
			b.WriteString(fmt.Sprintf("Time Period(mm-dd-yyyy) :,%s to %s\n",
				minD.In(h.location).Format("02-01-2006"),
				maxD.In(h.location).Format("02-01-2006"),
			))
		}
		// Row4: Number of Hrs in the week
		b.WriteString(fmt.Sprintf("Number of Hrs in the week :,%0.2f\n", totalWeekHours))

		// Blank row
		b.WriteString("\n")

		// Table header
		b.WriteString("Date (dd-mm-yyyy),Day Hours,Hours Spent,Activity,Comments (If any),Has Blocker\n")

		// Table rows
		for _, day := range dayKeys {
			rec := perDay[day]
			activities := strings.Join(rec.activities, " | ")
			// Using same value for Day Hours and Hours Spent (you can split if you store both)
			b.WriteString(fmt.Sprintf("%s,%.2f,%.2f,%s,,\n",
				day,
				rec.hours,
				rec.hours,
				csvEscape(activities),
			))
		}

		// Two blank lines between employees
		b.WriteString("\n\n")
	}

	// Filename
	filename := "timesheets_export.csv"
	if requestedUserIDStr != "" && len(timesheets) > 0 && !from.IsZero() && !to.IsZero() {
		filename = fmt.Sprintf("%s_timesheet_from_%sTo%s.csv",
			timesheets[0].User.EmployeeID,
			from.Format("2006-01-02"),
			to.Format("2006-01-02"),
		)
	} else if !from.IsZero() && !to.IsZero() {
		filename = fmt.Sprintf("timesheets_export_from_%sTo%s.csv",
			from.Format("2006-01-02"),
			to.Format("2006-01-02"),
		)
	}

	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.String(http.StatusOK, b.String())
}

// ▶️ UPDATED: simple CSV escaper for commas/quotes/newlines
func csvEscape(s string) string {
	if s == "" {
		return s
	}
	// wrap in quotes and double any existing quotes
	return `"` + strings.ReplaceAll(s, `"`, `""`) + `"`
}
