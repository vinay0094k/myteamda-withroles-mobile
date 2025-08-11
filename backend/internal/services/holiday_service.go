package services

import (
	"employee-dashboard-api/internal/models"
	"encoding/csv"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type HolidayService struct {
	db     *gorm.DB
	logger *logrus.Logger
}

func NewHolidayService(db *gorm.DB, logger *logrus.Logger) *HolidayService {
	return &HolidayService{
		db:     db,
		logger: logger,
	}
}

func (s *HolidayService) LoadHolidaysFromCSV(csvPath string) error {
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

	var createdHolidays int

	for i, record := range records[1:] {
		if len(record) < 5 {
			s.logger.Warnf("Skipping row %d: insufficient columns", i+2)
			continue
		}

		holidayName := record[0]
		holidayDateStr := record[1]
		holidayType := record[2]
		description := record[3]
		isOptionalStr := record[4]

		// Parse date
		holidayDate, err := time.Parse("2006-01-02", holidayDateStr)
		if err != nil {
			s.logger.Errorf("Invalid holiday date for %s: %v", holidayName, err)
			continue
		}

		// Parse is_optional
		isOptional, err := strconv.ParseBool(isOptionalStr)
		if err != nil {
			s.logger.Errorf("Invalid is_optional value for %s: %v", holidayName, err)
			continue
		}

		// Check if holiday already exists
		var existingHoliday models.Event
		if err := s.db.Where("title = ? AND event_type = ? AND event_date = ?",
			holidayName, "holiday", holidayDate).First(&existingHoliday).Error; err == nil {
			s.logger.Infof("Holiday %s already exists, skipping", holidayName)
			continue
		}

		// Create holiday event
		holiday := models.Event{
			Title:         holidayName,
			Description:   &description,
			EventType:     "holiday",
			EventDate:     holidayDate,
			IsCompanyWide: true,
		}

		// Add holiday type and optional status to description
		fullDescription := fmt.Sprintf("%s (%s%s)", description, holidayType,
			func() string {
				if isOptional {
					return " - Optional"
				}
				return ""
			}())
		holiday.Description = &fullDescription

		if err := s.db.Create(&holiday).Error; err != nil {
			s.logger.Errorf("Failed to create holiday %s: %v", holidayName, err)
			continue
		}

		createdHolidays++
		s.logger.Infof("Created holiday: %s on %s", holidayName, holidayDate.Format("2006-01-02"))
	}

	s.logger.Infof("Holiday data loading completed: %d holidays created", createdHolidays)
	return nil
}

func (s *HolidayService) InitializeHolidayData() error {
	// Check if we already have holidays in the database
	var holidayCount int64
	if err := s.db.Model(&models.Event{}).Where("event_type = ?", "holiday").Count(&holidayCount).Error; err != nil {
		return fmt.Errorf("failed to count existing holidays: %w", err)
	}

	if holidayCount > 0 {
		s.logger.Info("Holidays already exist in database, skipping holiday data initialization")
		return nil
	}

	// Load holidays from CSV
	csvPath := "holidays.csv"
	if err := s.LoadHolidaysFromCSV(csvPath); err != nil {
		return fmt.Errorf("failed to load holidays from CSV: %w", err)
	}

	return nil
}

func (s *HolidayService) GetHolidaysByYear(year int) ([]models.Event, error) {
	var holidays []models.Event
	if err := s.db.Where("event_type = ? AND EXTRACT(YEAR FROM event_date) = ?", "holiday", year).
		Order("event_date ASC").
		Find(&holidays).Error; err != nil {
		return nil, fmt.Errorf("failed to get holidays for year %d: %w", year, err)
	}

	return holidays, nil
}

func (s *HolidayService) GetUpcomingHolidays(limit int) ([]models.Event, error) {
	var holidays []models.Event
	if err := s.db.Where("event_type = ? AND event_date >= ?", "holiday", time.Now()).
		Order("event_date ASC").
		Limit(limit).
		Find(&holidays).Error; err != nil {
		return nil, fmt.Errorf("failed to get upcoming holidays: %w", err)
	}

	return holidays, nil
}
