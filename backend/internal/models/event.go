package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Event struct {
	ID            uuid.UUID  `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Title         string     `json:"title" gorm:"not null"`
	Description   *string    `json:"description"`
	EventType     string     `json:"event_type" gorm:"not null"` // birthday, anniversary, holiday, meeting
	EventDate     time.Time  `json:"event_date" gorm:"not null"`
	UserID        *uuid.UUID `json:"user_id"` // for personal events like birthdays
	User          *User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
	IsCompanyWide bool       `json:"is_company_wide" gorm:"default:false"`
	CreatedAt     time.Time  `json:"created_at"`
}

func (e *Event) BeforeCreate(tx *gorm.DB) error {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	return nil
}