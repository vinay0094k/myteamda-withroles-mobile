// backend/internal/services/policy_service.go
package services

import (
	"employee-dashboard-api/internal/models"
	"fmt"
	"time"

	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type PolicyService struct {
	db     *gorm.DB
	logger *logrus.Logger
}

func NewPolicyService(db *gorm.DB, logger *logrus.Logger) *PolicyService {
	return &PolicyService{
		db:     db,
		logger: logger,
	}
}

func (s *PolicyService) InitializeDefaultPolicies() error {
	// Check if policies already exist
	var count int64
	if err := s.db.Model(&models.Policy{}).Count(&count).Error; err != nil {
		return fmt.Errorf("failed to count policies: %w", err)
	}

	if count > 0 {
		s.logger.Info("Policies already exist, skipping initialization")
		return nil
	}

	// Create default policies
	policies := []models.Policy{
		{
			Title:         "Leave Policy",
			Description:   func() *string { desc := "Comprehensive guidelines for all types of leave."; return &desc }(),
			Content:       "This policy outlines the rules and procedures for applying, approving, and managing various types of leave, including annual leave, sick leave, and casual leave. Employees are entitled to 24 days of annual leave, 12 days of sick leave, and 12 days of casual leave per year. All leave requests must be submitted through the HR portal at least 7 days in advance for planned leaves. Sick leave requires a medical certificate for absences exceeding 3 days. Unused leave days may be carried over to the next year up to a maximum of 5 days.",
			Category:      func() *string { cat := "HR"; return &cat }(),
			Version:       "1.0",
			EffectiveDate: func() *time.Time { t := time.Date(2024, time.January, 1, 0, 0, 0, 0, time.UTC); return &t }(),
			IsActive:      true,
			S3Key:         func() *string { key := "policies/Leave_Policy.pdf"; return &key }(), // Example S3 Key
		},
		{
			Title:         "Work From Home Policy",
			Description:   func() *string { desc := "Guidelines for remote work arrangements."; return &desc }(),
			Content:       "This policy provides guidelines for employees working remotely. Employees must ensure they have a suitable and safe working environment, reliable internet access, and appropriate equipment. All remote work arrangements require prior approval from the employee's manager and HR. Regular check-ins and communication are expected. The company reserves the right to modify or revoke WFH arrangements based on business needs.",
			Category:      func() *string { cat := "Operations"; return &cat }(),
			Version:       "1.1",
			EffectiveDate: func() *time.Time { t := time.Date(2024, time.March, 15, 0, 0, 0, 0, time.UTC); return &t }(),
			IsActive:      true,
			S3Key:         func() *string { key := "policies/WFH_Policy.pdf"; return &key }(), // Example S3 Key
		},
		{
			Title:         "Code of Conduct",
			Description:   func() *string { desc := "Ethical standards and professional behavior expectations."; return &desc }(),
			Content:       "The Code of Conduct outlines the ethical principles and professional standards expected of all employees. This includes guidelines on integrity, respect, confidentiality, conflict of interest, and compliance with laws and regulations. Employees are expected to uphold the company's values and foster a positive and inclusive work environment. Violations of this code may result in disciplinary action, up to and including termination of employment.",
			Category:      func() *string { cat := "Compliance"; return &cat }(),
			Version:       "2.0",
			EffectiveDate: func() *time.Time { t := time.Date(2023, time.September, 1, 0, 0, 0, 0, time.UTC); return &t }(),
			IsActive:      true,
			S3Key:         func() *string { key := "policies/Code_of_Conduct.pdf"; return &key }(), // Example S3 Key
		},
	}

	for _, policy := range policies {
		if err := s.db.Create(&policy).Error; err != nil {
			s.logger.Errorf("Failed to create policy %s: %v", policy.Title, err)
			return err
		}
		s.logger.Infof("Created policy: %s", policy.Title)
	}

	return nil
}
