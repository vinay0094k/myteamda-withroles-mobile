package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type News struct {
	ID          uuid.UUID  `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Title       string     `json:"title" gorm:"not null"`
	Content     string     `json:"content" gorm:"not null"`
	Summary     *string    `json:"summary"`
	Category    *string    `json:"category"` // company, general, sports, etc.
	Type        string     `json:"type" gorm:"default:news"` // news, announcement
	AuthorID    *uuid.UUID `json:"author_id"`
	Author      *User      `json:"author,omitempty" gorm:"foreignKey:AuthorID"`
	IsFeatured  bool       `json:"is_featured" gorm:"default:false"`
	IsPublished bool       `json:"is_published" gorm:"default:true"`
	PublishedAt time.Time  `json:"published_at"`
	CreatedAt   time.Time  `json:"created_at"`
}

func (n *News) BeforeCreate(tx *gorm.DB) error {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	return nil
}