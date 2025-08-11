package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SportsEvent struct {
	ID                   uuid.UUID  `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Title                string     `json:"title" gorm:"not null"`
	Description          *string    `json:"description"`
	SportType            *string    `json:"sport_type"`
	EventDate            time.Time  `json:"event_date" gorm:"not null"`
	Location             *string    `json:"location"`
	MaxParticipants      *int       `json:"max_participants"`
	RegistrationDeadline *time.Time `json:"registration_deadline"`
	CreatedAt            time.Time  `json:"created_at"`
}

type SportsFacility struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name        string    `json:"name" gorm:"not null"`
	Type        *string   `json:"type"` // indoor, swimming, tennis, etc.
	Description *string   `json:"description"`
	Capacity    *int      `json:"capacity"`
	IsAvailable bool      `json:"is_available" gorm:"default:true"`
	CreatedAt   time.Time `json:"created_at"`
}

func (se *SportsEvent) BeforeCreate(tx *gorm.DB) error {
	if se.ID == uuid.Nil {
		se.ID = uuid.New()
	}
	return nil
}

func (sf *SportsFacility) BeforeCreate(tx *gorm.DB) error {
	if sf.ID == uuid.Nil {
		sf.ID = uuid.New()
	}
	return nil
}