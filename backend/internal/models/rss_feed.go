package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RSSFeed struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name        string    `json:"name" gorm:"not null"`
	URL         string    `json:"url" gorm:"not null"`
	Category    string    `json:"category" gorm:"default:general"`
	IsActive    bool      `json:"is_active" gorm:"default:true"`
	LastFetched *time.Time `json:"last_fetched"`
	CreatedAt   time.Time `json:"created_at"`
}

type RSSNewsItem struct {
	ID          uuid.UUID  `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	FeedID      uuid.UUID  `json:"feed_id" gorm:"not null"`
	Feed        RSSFeed    `json:"feed,omitempty" gorm:"foreignKey:FeedID"`
	Title       string     `json:"title" gorm:"not null"`
	Description string     `json:"description"`
	Content     string     `json:"content"`
	Link        string     `json:"link" gorm:"not null"`
	Author      *string    `json:"author"`
	Category    *string    `json:"category"`
	ImageURL    *string    `json:"image_url"`
	PublishedAt time.Time  `json:"published_at"`
	GUID        string     `json:"guid" gorm:"uniqueIndex"`
	IsRead      bool       `json:"is_read" gorm:"default:false"`
	CreatedAt   time.Time  `json:"created_at"`
}

func (rf *RSSFeed) BeforeCreate(tx *gorm.DB) error {
	if rf.ID == uuid.Nil {
		rf.ID = uuid.New()
	}
	return nil
}

func (rni *RSSNewsItem) BeforeCreate(tx *gorm.DB) error {
	if rni.ID == uuid.Nil {
		rni.ID = uuid.New()
	}
	return nil
}