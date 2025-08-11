package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type LearningSession struct {
	ID              uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Title           string    `json:"title" gorm:"not null"`
	Description     *string   `json:"description"`
	Topic           *string   `json:"topic"`
	Instructor      *string   `json:"instructor"`
	SessionDate     time.Time `json:"session_date" gorm:"not null"`
	DurationMinutes *int      `json:"duration_minutes"`
	MaxParticipants *int      `json:"max_participants"`
	Location        *string   `json:"location"`
	IsVirtual       bool      `json:"is_virtual" gorm:"default:false"`
	MeetingLink     *string   `json:"meeting_link"`
	Status          string    `json:"status" gorm:"default:scheduled"`
	CreatedAt       time.Time `json:"created_at"`
}

type LearningEnrollment struct {
	ID               uuid.UUID        `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID           uuid.UUID        `json:"user_id" gorm:"not null"`
	User             User             `json:"user,omitempty" gorm:"foreignKey:UserID"`
	SessionID        uuid.UUID        `json:"session_id" gorm:"not null"`
	Session          LearningSession  `json:"session,omitempty" gorm:"foreignKey:SessionID"`
	EnrolledAt       time.Time        `json:"enrolled_at"`
	AttendanceStatus *string          `json:"attendance_status"` // registered, attended, absent
}

func (ls *LearningSession) BeforeCreate(tx *gorm.DB) error {
	if ls.ID == uuid.Nil {
		ls.ID = uuid.New()
	}
	return nil
}

func (le *LearningEnrollment) BeforeCreate(tx *gorm.DB) error {
	if le.ID == uuid.Nil {
		le.ID = uuid.New()
	}
	return nil
}