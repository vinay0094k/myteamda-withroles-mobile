package services

import (
	"employee-dashboard-api/internal/models"
	"fmt"

	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type ProjectService struct {
	db     *gorm.DB
	logger *logrus.Logger
}

func NewProjectService(db *gorm.DB, logger *logrus.Logger) *ProjectService {
	return &ProjectService{
		db:     db,
		logger: logger,
	}
}

func (s *ProjectService) InitializeDefaultProjects() error {
	// Check if projects already exist
	var count int64
	if err := s.db.Model(&models.Project{}).Count(&count).Error; err != nil {
		return fmt.Errorf("failed to count projects: %w", err)
	}

	if count > 0 {
		s.logger.Info("Projects already exist, skipping initialization")
		return nil
	}

	// Create default projects
	projects := []models.Project{
		{
			Name:        "Website Redesign",
			Description: func() *string { desc := "Complete redesign of company website"; return &desc }(),
			ClientName:  func() *string { client := "Internal"; return &client }(),
			Status:      "active",
		},
		{
			Name:        "Mobile App Development",
			Description: func() *string { desc := "Native mobile app for iOS and Android"; return &desc }(),
			ClientName:  func() *string { client := "Internal"; return &client }(),
			Status:      "active",
		},
		{
			Name:        "Employee Dashboard",
			Description: func() *string { desc := "Internal employee management dashboard"; return &desc }(),
			ClientName:  func() *string { client := "Internal"; return &client }(),
			Status:      "active",
		},
		{
			Name:        "Client Portal",
			Description: func() *string { desc := "Customer-facing portal for service management"; return &desc }(),
			ClientName:  func() *string { client := "External Client"; return &client }(),
			Status:      "active",
		},
		{
			Name:        "Data Analytics Platform",
			Description: func() *string { desc := "Business intelligence and analytics platform"; return &desc }(),
			ClientName:  func() *string { client := "Internal"; return &client }(),
			Status:      "active",
		},
	}

	for _, project := range projects {
		if err := s.db.Create(&project).Error; err != nil {
			s.logger.Errorf("Failed to create project %s: %v", project.Name, err)
			return err
		}
		s.logger.Infof("Created project: %s", project.Name)
	}

	return nil
}
