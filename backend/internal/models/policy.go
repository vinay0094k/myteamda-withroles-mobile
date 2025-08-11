package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Policy struct {
	ID            uuid.UUID  `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Title         string     `json:"title" gorm:"not null"`
	Description   *string    `json:"description"`
	Content       string     `json:"content" gorm:"not null"`
	Category      *string    `json:"category"` // leave, resignation, wfh, etc.
	Version       string     `json:"version" gorm:"default:1.0"`
	EffectiveDate *time.Time `json:"effective_date"`
	IsActive      bool       `json:"is_active" gorm:"default:true"`
	CreatedBy     *uuid.UUID `json:"created_by"`
	Creator       *User      `json:"creator,omitempty" gorm:"foreignKey:CreatedBy"`
	S3Key         *string    `json:"s3_key"` // full URL stored in DB
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type Notification struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID    uuid.UUID `json:"user_id" gorm:"not null"`
	User      User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Title     string    `json:"title" gorm:"not null"`
	Message   string    `json:"message" gorm:"not null"`
	Type      *string   `json:"type"` // leave_approved, timesheet_reminder, etc.
	IsRead    bool      `json:"is_read" gorm:"default:false"`
	CreatedAt time.Time `json:"created_at"`
}

func (p *Policy) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

func (n *Notification) BeforeCreate(tx *gorm.DB) error {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	return nil
}
