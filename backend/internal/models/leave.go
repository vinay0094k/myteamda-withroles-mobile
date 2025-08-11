package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type LeaveType struct {
	ID             uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name           string    `json:"name" gorm:"not null"`
	Description    *string   `json:"description"`
	MaxDaysPerYear *int      `json:"max_days_per_year"`
	IsActive       bool      `json:"is_active" gorm:"default:true"`
	CreatedAt      time.Time `json:"created_at"`
}

type LeaveApplication struct {
	ID              uuid.UUID  `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID          uuid.UUID  `json:"user_id" gorm:"type:uuid;not null"`
	User            User       `json:"user,omitempty" gorm:"foreignKey:UserID;references:ID"`
	LeaveTypeID     uuid.UUID  `json:"leave_type_id" gorm:"type:uuid;not null"`
	LeaveType       LeaveType  `json:"leave_type,omitempty" gorm:"foreignKey:LeaveTypeID;references:ID"`
	StartDate       time.Time  `json:"start_date" gorm:"not null"`
	EndDate         time.Time  `json:"end_date" gorm:"not null"`
	IsHalfDay       bool       `json:"is_half_day" gorm:"default:false"`
	IsLOP           bool       `json:"is_lop" gorm:"default:false"` // Loss of Pay flag
	LOPDays         float64    `json:"lop_days" gorm:"default:0"`   // Number of LOP days
	PaidDays        float64    `json:"paid_days" gorm:"default:0"`  // Number of paid days from balance
	Reason          *string    `json:"reason"`
	Description     *string    `json:"description"`
	Status          string     `json:"status" gorm:"default:pending"`
	ApprovedBy      *uuid.UUID `json:"approved_by" gorm:"type:uuid"`
	Approver        *User      `json:"approver,omitempty" gorm:"foreignKey:ApprovedBy;references:ID"`
	ApprovedAt      *time.Time `json:"approved_at"`
	RejectionReason *string    `json:"rejection_reason"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
	DateRange       string     `json:"date_range" gorm:"-"`
}

type LeaveBalance struct {
	ID            uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID        uuid.UUID `json:"user_id" gorm:"type:uuid;not null"`
	User          User      `json:"user,omitempty" gorm:"foreignKey:UserID;references:ID"`
	LeaveTypeID   uuid.UUID `json:"leave_type_id" gorm:"type:uuid;not null"`
	LeaveType     LeaveType `json:"leave_type,omitempty" gorm:"foreignKey:LeaveTypeID;references:ID"`
	Year          int       `json:"year" gorm:"not null"`
	AllocatedDays int       `json:"allocated_days" gorm:"not null"`
	UsedDays      float64   `json:"used_days" gorm:"default:0"`
	RemainingDays float64   `json:"remaining_days" gorm:"-"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (lb *LeaveBalance) BeforeCreate(tx *gorm.DB) error {
	if lb.ID == uuid.Nil {
		lb.ID = uuid.New()
	}
	return nil
}

func (lb *LeaveBalance) AfterFind(tx *gorm.DB) error {
	lb.RemainingDays = float64(lb.AllocatedDays) - lb.UsedDays
	return nil
}

func (lt *LeaveType) BeforeCreate(tx *gorm.DB) error {
	if lt.ID == uuid.Nil {
		lt.ID = uuid.New()
	}
	return nil
}

func (la *LeaveApplication) BeforeCreate(tx *gorm.DB) error {
	if la.ID == uuid.Nil {
		la.ID = uuid.New()
	}
	return nil
}

func (la *LeaveApplication) AfterFind(tx *gorm.DB) error {
	la.DateRange = la.FormatDateRange()
	return nil
}

// FormatDateRange formats the date range based on single day or multiple days
func (la *LeaveApplication) FormatDateRange() string {
	// Check if it's the same date (single day)
	if la.StartDate.Format("2006-01-02") == la.EndDate.Format("2006-01-02") {
		// Single day: "Aug 25, 2025"
		return la.StartDate.Format("Jan 2, 2006")
	}

	// Multiple days: "Aug 25 - Aug 28, 2025"
	if la.StartDate.Year() == la.EndDate.Year() {
		// Same year: "Aug 25 - Aug 28, 2025"
		return la.StartDate.Format("Jan 2") + " - " + la.EndDate.Format("Jan 2, 2006")
	}

	// Different years: "Dec 30, 2024 - Jan 2, 2025"
	return la.StartDate.Format("Jan 2, 2006") + " - " + la.EndDate.Format("Jan 2, 2006")
}
