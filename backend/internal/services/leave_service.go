package services

import (
	"employee-dashboard-api/internal/models"
	"encoding/csv"
	"fmt"
	"os"
	"strconv"

	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type LeaveService struct {
	db     *gorm.DB
	logger *logrus.Logger
}

func NewLeaveService(db *gorm.DB, logger *logrus.Logger) *LeaveService {
	return &LeaveService{
		db:     db,
		logger: logger,
	}
}

func (s *LeaveService) InitializeLeaveTypes() error {
	// Check if leave types already exist
	var count int64
	if err := s.db.Model(&models.LeaveType{}).Count(&count).Error; err != nil {
		return fmt.Errorf("failed to count leave types: %w", err)
	}

	if count > 0 {
		s.logger.Info("Leave types already exist, skipping initialization")
		return nil
	}

	// Create default leave types
	leaveTypes := []models.LeaveType{
		{
			Name:           "Comp Off",
			Description:    func() *string { desc := "Compensatory off for overtime work - earned by working extra hours"; return &desc }(),
			MaxDaysPerYear: func() *int { days := 12; return &days }(), // Reasonable limit for comp-off days
			IsActive:       true,
		},
		{
			Name:           "Sick Leave",
			Description:    func() *string { desc := "Medical leave for illness"; return &desc }(),
			MaxDaysPerYear: func() *int { days := 12; return &days }(),
			IsActive:       true,
		},
		{
			Name:           "Casual Leave",
			Description:    func() *string { desc := "Short-term personal leave"; return &desc }(),
			MaxDaysPerYear: func() *int { days := 12; return &days }(),
			IsActive:       true,
		},
		{
			Name:           "Maternity Leave",
			Description:    func() *string { desc := "Maternity leave for new mothers"; return &desc }(),
			MaxDaysPerYear: func() *int { days := 180; return &days }(),
			IsActive:       true,
		},
		{
			Name:           "Paternity Leave",
			Description:    func() *string { desc := "Paternity leave for new fathers"; return &desc }(),
			MaxDaysPerYear: func() *int { days := 15; return &days }(),
			IsActive:       true,
		},
	}

	for _, leaveType := range leaveTypes {
		if err := s.db.Create(&leaveType).Error; err != nil {
			s.logger.Errorf("Failed to create leave type %s: %v", leaveType.Name, err)
			return err
		}
		s.logger.Infof("Created leave type: %s", leaveType.Name)
	}

	return nil
}

func (s *LeaveService) LoadLeaveAllocationsFromCSV(csvPath string) error {
	file, err := os.Open(csvPath)
	if err != nil {
		return fmt.Errorf("failed to open CSV file: %w", err)
	}
	defer file.Close()

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		return fmt.Errorf("failed to read CSV file: %w", err)
	}

	// Skip header row
	if len(records) < 2 {
		return fmt.Errorf("CSV file must contain at least a header and one data row")
	}

	var createdAllocations int

	for i, record := range records[1:] {
		if len(record) < 5 {
			s.logger.Warnf("Skipping row %d: insufficient columns", i+2)
			continue
		}

		employeeID := record[0]
		leaveTypeName := record[1]
		yearStr := record[2]
		allocatedDaysStr := record[3]
		usedDaysStr := record[4]

		// Parse year
		year, err := strconv.Atoi(yearStr)
		if err != nil {
			s.logger.Errorf("Invalid year for %s: %v", employeeID, err)
			continue
		}

		// Parse allocated days
		allocatedDays, err := strconv.Atoi(allocatedDaysStr)
		if err != nil {
			s.logger.Errorf("Invalid allocated days for %s: %v", employeeID, err)
			continue
		}

		// Parse used days
		// usedDays, err := strconv.Atoi(usedDaysStr)
		usedDaysInt, err := strconv.Atoi(usedDaysStr)
		if err != nil {
			s.logger.Errorf("Invalid used days for %s: %v", employeeID, err)
			continue
		}
		usedDays := float64(usedDaysInt) // Convert to float64

		// Find user by employee ID
		var user models.User
		if err := s.db.Where("employee_id = ?", employeeID).First(&user).Error; err != nil {
			s.logger.Errorf("User not found for employee ID %s: %v", employeeID, err)
			continue
		}

		// Find leave type by name
		var leaveType models.LeaveType
		if err := s.db.Where("name = ? AND is_active = true", leaveTypeName).First(&leaveType).Error; err != nil {
			s.logger.Errorf("Leave type not found: %s", leaveTypeName)
			continue
		}

		// Check if allocation already exists
		var existingBalance models.LeaveBalance
		if err := s.db.Where("user_id = ? AND leave_type_id = ? AND year = ?",
			user.ID, leaveType.ID, year).First(&existingBalance).Error; err == nil {
			s.logger.Infof("Leave allocation already exists for %s - %s, skipping", employeeID, leaveTypeName)
			continue
		}

		// Create leave balance
		leaveBalance := models.LeaveBalance{
			UserID:        user.ID,
			LeaveTypeID:   leaveType.ID,
			Year:          year,
			AllocatedDays: allocatedDays,
			UsedDays:      usedDays,
		}

		if err := s.db.Create(&leaveBalance).Error; err != nil {
			s.logger.Errorf("Failed to create leave balance for %s: %v", employeeID, err)
			continue
		}

		createdAllocations++
		s.logger.Infof("Created leave allocation: %s - %s (%d/%d days)",
			employeeID, leaveTypeName, usedDays, allocatedDays)
	}

	s.logger.Infof("Leave allocation loading completed: %d allocations created", createdAllocations)
	return nil
}

func (s *LeaveService) InitializeLeaveAllocations() error {
	// First ensure leave types exist
	if err := s.InitializeLeaveTypes(); err != nil {
		return fmt.Errorf("failed to initialize leave types: %w", err)
	}

	// Check if leave allocations already exist
	var count int64
	if err := s.db.Model(&models.LeaveBalance{}).Count(&count).Error; err != nil {
		return fmt.Errorf("failed to count leave allocations: %w", err)
	}

	if count > 0 {
		s.logger.Info("Leave allocations already exist, skipping initialization")
		return nil
	}

	// Load leave allocations from CSV
	csvPath := "leave_allocations.csv"
	if err := s.LoadLeaveAllocationsFromCSV(csvPath); err != nil {
		return fmt.Errorf("failed to load leave allocations from CSV: %w", err)
	}

	return nil
}

// func (s *LeaveService) UpdateLeaveBalance(userID uuid.UUID, leaveTypeID uuid.UUID, year int, daysUsed int) error {
func (s *LeaveService) UpdateLeaveBalance(userID uuid.UUID, leaveTypeID uuid.UUID, year int, daysUsed float64) error {
	// Find the leave balance
	var leaveBalance models.LeaveBalance
	if err := s.db.Where("user_id = ? AND leave_type_id = ? AND year = ?",
		userID, leaveTypeID, year).First(&leaveBalance).Error; err != nil {
		return fmt.Errorf("leave balance not found: %w", err)
	}

	// Update used days
	newUsedDays := leaveBalance.UsedDays + daysUsed
	if newUsedDays > float64(leaveBalance.AllocatedDays) {
		// return fmt.Errorf("insufficient leave balance: trying to use %d days but only %d remaining",
		return fmt.Errorf("insufficient leave balance: trying to use %.1f days but only %.1f remaining",
			daysUsed, float64(leaveBalance.AllocatedDays)-leaveBalance.UsedDays)
	}

	if err := s.db.Model(&leaveBalance).Update("used_days", newUsedDays).Error; err != nil {
		return fmt.Errorf("failed to update leave balance: %w", err)
	}

	// s.logger.Infof("Updated leave balance for user %s: used %d days, remaining %d days",
	s.logger.Infof("Updated leave balance for user %s: used %.1f days, remaining %.1f days",
		// userID, newUsedDays, leaveBalance.AllocatedDays-newUsedDays)
		userID, newUsedDays, float64(leaveBalance.AllocatedDays)-newUsedDays)

	return nil
}

func (s *LeaveService) GetMonthlyLeaveAllocation() int {
	// 2 leaves per month as requested
	return 2
}

func (s *LeaveService) CalculateAnnualAllocation() int {
	// 2 leaves per month * 12 months = 24 leaves per year
	return s.GetMonthlyLeaveAllocation() * 12
}

// ValidateLeaveBalance checks if user has sufficient balance (for validation only, no deduction)
func (s *LeaveService) ValidateLeaveBalance(userID uuid.UUID, leaveTypeID uuid.UUID, year int, daysRequested float64) error {
	// Find the leave balance
	var leaveBalance models.LeaveBalance
	if err := s.db.Where("user_id = ? AND leave_type_id = ? AND year = ?",
		userID, leaveTypeID, year).First(&leaveBalance).Error; err != nil {
		return fmt.Errorf("leave balance not found: %w", err)
	}

	remainingDays := float64(leaveBalance.AllocatedDays) - leaveBalance.UsedDays
	if daysRequested > remainingDays {
		// This is just validation - we'll allow LOP in the handler
		s.logger.Infof("User %s requesting %.1f days but only %.1f remaining - will be marked as LOP",
			userID, daysRequested, remainingDays)
	}

	return nil // Always return nil - we allow LOP applications
}

// CalculateLOPBreakdown calculates how many days will be paid vs LOP
func (s *LeaveService) CalculateLOPBreakdown(userID uuid.UUID, leaveTypeID uuid.UUID, year int, daysRequested float64) (paidDays float64, lopDays float64, isLOP bool, err error) {
	// Find the leave balance
	var leaveBalance models.LeaveBalance
	if err = s.db.Where("user_id = ? AND leave_type_id = ? AND year = ?",
		userID, leaveTypeID, year).First(&leaveBalance).Error; err != nil {
		return 0, 0, false, fmt.Errorf("leave balance not found: %w", err)
	}

	remainingDays := float64(leaveBalance.AllocatedDays) - leaveBalance.UsedDays

	if daysRequested <= remainingDays {
		// Sufficient balance - all days are paid
		return daysRequested, 0, false, nil
	} else {
		// Insufficient balance - partial LOP
		paidDays = remainingDays
		lopDays = daysRequested - remainingDays
		return paidDays, lopDays, true, nil
	}
}
