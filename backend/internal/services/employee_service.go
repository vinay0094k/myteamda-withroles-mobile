package services

import (
	"employee-dashboard-api/internal/config"
	"employee-dashboard-api/internal/models"
	"encoding/csv"
	"fmt"
	"os"
	"time"

	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type EmployeeService struct {
	db     *gorm.DB
	logger *logrus.Logger
	config *config.Config
}

func NewEmployeeService(db *gorm.DB, logger *logrus.Logger, cfg *config.Config) *EmployeeService {
	return &EmployeeService{
		db:     db,
		logger: logger,
		config: cfg,
	}
}

func (s *EmployeeService) LoadEmployeesFromCSV(csvPath string) error {
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

	var createdUsers int
	var createdEvents int

	for i, record := range records[1:] {
		if len(record) < 9 {
			s.logger.Warnf("Skipping row %d: insufficient columns", i+2)
			continue
		}

		employeeID := record[0]
		email := record[1]
		firstName := record[2]
		lastName := record[3]
		phone := record[4]
		department := record[5]
		position := record[6]
		hireDateStr := record[7]
		birthDateStr := record[8]

		// Check if user already exists
		var existingUser models.User
		if err := s.db.Where("employee_id = ? OR email = ?", employeeID, email).First(&existingUser).Error; err == nil {
			s.logger.Infof("User %s already exists, skipping", employeeID)
			continue
		}

		// Parse dates
		hireDate, err := time.Parse("2006-01-02", hireDateStr)
		if err != nil {
			s.logger.Errorf("Invalid hire date for %s: %v", employeeID, err)
			continue
		}

		birthDate, err := time.Parse("2006-01-02", birthDateStr)
		if err != nil {
			s.logger.Errorf("Invalid birth date for %s: %v", employeeID, err)
			continue
		}

		var initialPasswordHash string
		if s.config.UserPlainPasswords {
			initialPasswordHash = "password" // Default plain password for sample users
		} else {
			initialPasswordHash = "$2a$10$dummy.hash.for.demo.purposes.only" // Keep dummy hash
		}

		// Create user
		user := models.User{
			EmployeeID:     employeeID,
			Email:          email,
			PasswordHash:   initialPasswordHash,
			FirstName:      firstName,
			LastName:       lastName,
			Phone:          &phone,
			Department:     &department,
			Position:       &position,
			HireDate:       &hireDate,
			EmploymentType: "full-time",
			Status:         "active",
		}

		if err := s.db.Create(&user).Error; err != nil {
			s.logger.Errorf("Failed to create user %s: %v", employeeID, err)
			continue
		}

		createdUsers++

		// Create birthday event
		birthdayEvent := models.Event{
			Title: fmt.Sprintf("%s %s's Birthday", firstName, lastName),
			Description: func() *string {
				desc := fmt.Sprintf("Birthday celebration for %s %s", firstName, lastName)
				return &desc
			}(),
			EventType:     "birthday",
			EventDate:     time.Date(time.Now().Year(), birthDate.Month(), birthDate.Day(), 0, 0, 0, 0, time.UTC),
			UserID:        &user.ID,
			IsCompanyWide: true,
		}

		if err := s.db.Create(&birthdayEvent).Error; err != nil {
			s.logger.Errorf("Failed to create birthday event for %s: %v", employeeID, err)
		} else {
			createdEvents++
		}

		// Create work anniversary event
		anniversaryEvent := models.Event{
			Title: fmt.Sprintf("%s %s's Work Anniversary", firstName, lastName),
			Description: func() *string {
				desc := fmt.Sprintf("Work anniversary celebration for %s %s", firstName, lastName)
				return &desc
			}(),
			EventType:     "anniversary",
			EventDate:     time.Date(time.Now().Year(), hireDate.Month(), hireDate.Day(), 0, 0, 0, 0, time.UTC),
			UserID:        &user.ID,
			IsCompanyWide: true,
		}

		if err := s.db.Create(&anniversaryEvent).Error; err != nil {
			s.logger.Errorf("Failed to create anniversary event for %s: %v", employeeID, err)
		} else {
			createdEvents++
		}

		s.logger.Infof("Created user %s with birthday and anniversary events", employeeID)
	}

	s.logger.Infof("Employee data loading completed: %d users created, %d events created", createdUsers, createdEvents)
	return nil
}

func (s *EmployeeService) InitializeEmployeeData() error {
	// Check if we already have users in the database
	var userCount int64
	if err := s.db.Model(&models.User{}).Count(&userCount).Error; err != nil {
		return fmt.Errorf("failed to count existing users: %w", err)
	}

	if userCount > 0 {
		s.logger.Info("Users already exist in database, skipping employee data initialization")
		return nil
	}

	// Load employees from CSV
	csvPath := "sample_employees.csv"
	if err := s.LoadEmployeesFromCSV(csvPath); err != nil {
		return fmt.Errorf("failed to load employees from CSV: %w", err)
	}

	return nil
}
