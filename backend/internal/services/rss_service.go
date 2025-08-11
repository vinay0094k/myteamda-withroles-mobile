package services

import (
	"employee-dashboard-api/internal/models"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/mmcdole/gofeed"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type RSSService struct {
	db     *gorm.DB
	logger *logrus.Logger
	parser *gofeed.Parser
}

func NewRSSService(db *gorm.DB, logger *logrus.Logger) *RSSService {
	return &RSSService{
		db:     db,
		logger: logger,
		parser: gofeed.NewParser(),
	}
}

func (s *RSSService) InitializeDefaultFeeds() error {
	defaultFeeds := []models.RSSFeed{
		{
			Name:     "The Hindu - Latest News",
			URL:      "https://www.thehindu.com/news/feeder/default.rss",
			Category: "general",
			IsActive: true,
		},
		{
			Name:     "The Hindu - Business",
			URL:      "https://www.thehindu.com/business/feeder/default.rss",
			Category: "business",
			IsActive: true,
		},
		{
			Name:     "The Hindu - Technology",
			URL:      "https://www.thehindu.com/sci-tech/technology/feeder/default.rss",
			Category: "technology",
			IsActive: true,
		},
		{
			Name:     "The Hindu - Sports",
			URL:      "https://www.thehindu.com/sport/feeder/default.rss",
			Category: "sports",
			IsActive: true,
		},
	}

	for _, feed := range defaultFeeds {
		var existingFeed models.RSSFeed
		if err := s.db.Where("url = ?", feed.URL).First(&existingFeed).Error; err == gorm.ErrRecordNotFound {
			if err := s.db.Create(&feed).Error; err != nil {
				s.logger.Errorf("Failed to create RSS feed %s: %v", feed.Name, err)
				return err
			}
			s.logger.Infof("Created RSS feed: %s", feed.Name)
		}
	}

	return nil
}

func (s *RSSService) FetchAllFeeds() error {
	var feeds []models.RSSFeed
	if err := s.db.Where("is_active = true").Find(&feeds).Error; err != nil {
		return fmt.Errorf("failed to get active feeds: %w", err)
	}

	for _, feed := range feeds {
		if err := s.FetchFeed(feed.ID); err != nil {
			s.logger.Errorf("Failed to fetch feed %s: %v", feed.Name, err)
			continue
		}
	}

	return nil
}

func (s *RSSService) FetchFeed(feedID uuid.UUID) error {
	var feed models.RSSFeed
	if err := s.db.First(&feed, feedID).Error; err != nil {
		return fmt.Errorf("feed not found: %w", err)
	}

	s.logger.Infof("Fetching RSS feed: %s", feed.Name)

	rssFeed, err := s.parser.ParseURL(feed.URL)
	if err != nil {
		return fmt.Errorf("failed to parse RSS feed: %w", err)
	}

	var newItemsCount int
	for _, item := range rssFeed.Items {
		// Check if item already exists
		var existingItem models.RSSNewsItem
		guid := item.GUID
		if guid == "" {
			guid = item.Link // Fallback to link if GUID is not available
		}

		if err := s.db.Where("guid = ?", guid).First(&existingItem).Error; err == gorm.ErrRecordNotFound {
			// Create new news item
			newsItem := models.RSSNewsItem{
				FeedID:      feed.ID,
				Title:       item.Title,
				Description: s.cleanDescription(item.Description),
				Content:     s.cleanContent(item.Content),
				Link:        item.Link,
				GUID:        guid,
				PublishedAt: s.parsePublishedDate(item.Published, item.PublishedParsed),
			}

			if item.Author != nil {
				newsItem.Author = &item.Author.Name
			}

			if len(item.Categories) > 0 {
				newsItem.Category = &item.Categories[0]
			}

			if item.Image != nil {
				newsItem.ImageURL = &item.Image.URL
			}

			if err := s.db.Create(&newsItem).Error; err != nil {
				s.logger.Errorf("Failed to create news item: %v", err)
				continue
			}

			newItemsCount++
		}
	}

	// Update last fetched time
	now := time.Now()
	if err := s.db.Model(&feed).Update("last_fetched", now).Error; err != nil {
		s.logger.Errorf("Failed to update last_fetched for feed %s: %v", feed.Name, err)
	}

	s.logger.Infof("Fetched %d new items from feed: %s", newItemsCount, feed.Name)
	return nil
}

func (s *RSSService) cleanDescription(description string) string {
	// Remove HTML tags and clean up description
	description = strings.ReplaceAll(description, "<p>", "")
	description = strings.ReplaceAll(description, "</p>", "")
	description = strings.ReplaceAll(description, "<br>", " ")
	description = strings.ReplaceAll(description, "<br/>", " ")
	description = strings.ReplaceAll(description, "&nbsp;", " ")
	description = strings.TrimSpace(description)

	// Limit description length
	if len(description) > 300 {
		description = description[:300] + "..."
	}

	return description
}

func (s *RSSService) cleanContent(content string) string {
	if content == "" {
		return ""
	}

	// Basic HTML tag removal for content
	content = strings.ReplaceAll(content, "<p>", "\n")
	content = strings.ReplaceAll(content, "</p>", "\n")
	content = strings.ReplaceAll(content, "<br>", "\n")
	content = strings.ReplaceAll(content, "<br/>", "\n")
	content = strings.ReplaceAll(content, "&nbsp;", " ")
	content = strings.TrimSpace(content)

	return content
}

func (s *RSSService) parsePublishedDate(published string, publishedParsed *time.Time) time.Time {
	if publishedParsed != nil {
		return *publishedParsed
	}

	// Try to parse the published string
	layouts := []string{
		time.RFC1123Z,
		time.RFC1123,
		time.RFC822Z,
		time.RFC822,
		"2006-01-02T15:04:05Z07:00",
		"2006-01-02 15:04:05",
	}

	for _, layout := range layouts {
		if t, err := time.Parse(layout, published); err == nil {
			return t
		}
	}

	// Fallback to current time
	return time.Now()
}

func (s *RSSService) GetLatestNews(limit int, category string) ([]models.RSSNewsItem, error) {
	query := s.db.Preload("Feed").Order("published_at DESC")

	if category != "" && category != "all" {
		query = query.Joins("JOIN rss_feeds ON rss_news_items.feed_id = rss_feeds.id").
			Where("rss_feeds.category = ?", category)
	}

	var newsItems []models.RSSNewsItem
	if err := query.Limit(limit).Find(&newsItems).Error; err != nil {
		return nil, fmt.Errorf("failed to get latest news: %w", err)
	}

	return newsItems, nil
}

func (s *RSSService) GetNewsByCategory(category string, limit int, offset int) ([]models.RSSNewsItem, int64, error) {
	query := s.db.Preload("Feed")

	if category != "" && category != "all" {
		query = query.Joins("JOIN rss_feeds ON rss_news_items.feed_id = rss_feeds.id").
			Where("rss_feeds.category = ?", category)
	}

	var total int64
	query.Model(&models.RSSNewsItem{}).Count(&total)

	var newsItems []models.RSSNewsItem
	if err := query.Order("published_at DESC").Offset(offset).Limit(limit).Find(&newsItems).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to get news by category: %w", err)
	}

	return newsItems, total, nil
}

func (s *RSSService) StartPeriodicFetch() {
	// Fetch immediately on start
	go func() {
		if err := s.FetchAllFeeds(); err != nil {
			s.logger.Errorf("Initial RSS fetch failed: %v", err)
		}
	}()

	// Set up periodic fetching every 6 hours
	ticker := time.NewTicker(6 * time.Hour)
	go func() {
		for range ticker.C {
			s.logger.Info("Starting periodic RSS feed fetch...")
			if err := s.FetchAllFeeds(); err != nil {
				s.logger.Errorf("Periodic RSS fetch failed: %v", err)
			}
		}
	}()

	s.logger.Info("RSS periodic fetch started (every 6 hours)")
}
