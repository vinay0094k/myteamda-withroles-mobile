package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Project struct {
	ID          uuid.UUID  `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name        string     `json:"name" gorm:"not null"`
	Description *string    `json:"description"`
	ClientName  *string    `json:"client_name"`
	Status      string     `json:"status" gorm:"default:active"`
	StartDate   *time.Time `json:"start_date"`
	EndDate     *time.Time `json:"end_date"`
	CreatedAt   time.Time  `json:"created_at"`
}

type TimesheetEntry struct {
	ID               uuid.UUID  `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID           uuid.UUID  `json:"user_id" gorm:"type:uuid;not null"`
	User             User       `json:"user,omitempty" gorm:"foreignKey:UserID;references:ID"`
	ProjectID        uuid.UUID  `json:"project_id" gorm:"type:uuid;not null"`
	Project          Project    `json:"project,omitempty" gorm:"foreignKey:ProjectID;references:ID"`
	TaskDescription  string     `json:"task_description" gorm:"not null"`
	EntryDate        time.Time  `json:"entry_date" gorm:"not null"`
	StartTime        *time.Time `json:"start_time"`
	EndTime          *time.Time `json:"end_time"`
	DurationHours    *float64   `json:"duration_hours"`
	BreakTimeMinutes int        `json:"break_time_minutes" gorm:"default:0"`
	Status           string     `json:"status" gorm:"default:draft"`
	SubmittedAt      *time.Time `json:"submitted_at"`
	ApprovedBy       *uuid.UUID `json:"approved_by" gorm:"type:uuid"`
	Approver         *User      `json:"approver,omitempty" gorm:"foreignKey:ApprovedBy;references:ID"`
	ApprovedAt       *time.Time `json:"approved_at"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

func (p *Project) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

func (te *TimesheetEntry) BeforeCreate(tx *gorm.DB) error {
	if te.ID == uuid.Nil {
		te.ID = uuid.New()
	}
	return nil
}
