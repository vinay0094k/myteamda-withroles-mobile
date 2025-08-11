package database

import (
	"employee-dashboard-api/internal/config"
	"employee-dashboard-api/internal/models"
	"fmt"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Initialize(cfg *config.Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		cfg.DBHost, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBPort, cfg.DBSSLMode)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Auto-migrate all models
	// Migrate models in order to avoid foreign key constraint issues
	err = db.AutoMigrate(
		&models.Department{},
		&models.User{},
		&models.LeaveType{},
		&models.LeaveApplication{},
		&models.LeaveBalance{},
		&models.Project{},
		&models.TimesheetEntry{},
		&models.Event{},
		&models.Document{},
		&models.Asset{},
		&models.News{},
		&models.LearningSession{},
		&models.LearningEnrollment{},
		&models.SportsEvent{},
		&models.SportsFacility{},
		&models.Policy{},
		&models.Notification{},
		&models.RSSFeed{},
		&models.RSSNewsItem{},
		&models.GalleryImage{}, // Add this line
	)
	if err != nil {
		return nil, fmt.Errorf("failed to migrate database: %w", err)
	}

	return db, nil
}
