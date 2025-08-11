package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type GalleryImage struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	S3Key       string    `json:"s3_key" gorm:"uniqueIndex;not null"` // Path/key in S3 bucket
	Title       string    `json:"title" gorm:"not null"`
	Description *string   `json:"description"`
	UploadedAt  time.Time `json:"uploaded_at"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (gi *GalleryImage) BeforeCreate(tx *gorm.DB) error {
	if gi.ID == uuid.Nil {
		gi.ID = uuid.New()
	}
	if gi.UpdatedAt.IsZero() {
		gi.UpdatedAt = time.Now()
	}
	return nil
}
