package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Document struct {
	ID               uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID           uuid.UUID `json:"user_id" gorm:"not null"`
	User             User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Filename         string    `json:"filename" gorm:"not null"`
	OriginalFilename string    `json:"original_filename" gorm:"not null"`
	FilePath         string    `json:"file_path" gorm:"not null"`
	FileSize         *int64    `json:"file_size"`
	MimeType         *string   `json:"mime_type"`
	Category         *string   `json:"category"` // payslips, certificates, personal, etc.
	Description      *string   `json:"description"`
	UploadedAt       time.Time `json:"uploaded_at"`
}

func (d *Document) BeforeCreate(tx *gorm.DB) error {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	return nil
}