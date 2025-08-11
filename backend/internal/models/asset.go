package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Asset struct {
	ID           uuid.UUID  `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	AssetID      string     `json:"asset_id" gorm:"uniqueIndex;not null"`
	Name         string     `json:"name" gorm:"not null"`
	Type         *string    `json:"type"` // laptop, phone, monitor, etc.
	Brand        *string    `json:"brand"`
	Model        *string    `json:"model"`
	SerialNumber *string    `json:"serial_number"`
	Status       string     `json:"status" gorm:"default:available"` // available, assigned, maintenance
	AssignedTo   *uuid.UUID `json:"assigned_to"`
	User         *User      `json:"user,omitempty" gorm:"foreignKey:AssignedTo"`
	AssignedDate *time.Time `json:"assigned_date"`
	CreatedAt    time.Time  `json:"created_at"`
}

func (a *Asset) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}