package handlers

import (
	"employee-dashboard-api/internal/config"
	"employee-dashboard-api/internal/services"
	"employee-dashboard-api/internal/utils"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type RSSNewsHandler struct {
	db         *gorm.DB
	config     *config.Config
	logger     *logrus.Logger
	rssService *services.RSSService
}

func NewRSSNewsHandler(db *gorm.DB, cfg *config.Config, logger *logrus.Logger) *RSSNewsHandler {
	rssService := services.NewRSSService(db, logger)
	return &RSSNewsHandler{
		db:         db,
		config:     cfg,
		logger:     logger,
		rssService: rssService,
	}
}

func (h *RSSNewsHandler) GetLatestNews(c *gin.Context) {
	// Parse query parameters
	limitStr := c.DefaultQuery("limit", "20")
	category := c.DefaultQuery("category", "")
	
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 20
	}
	
	if limit > 100 {
		limit = 100 // Cap at 100 items
	}

	newsItems, err := h.rssService.GetLatestNews(limit, category)
	if err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Latest news retrieved successfully", newsItems)
}

func (h *RSSNewsHandler) GetNewsByCategory(c *gin.Context) {
	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	category := c.DefaultQuery("category", "")

	if page < 1 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 10
	}

	offset := (page - 1) * limit

	newsItems, total, err := h.rssService.GetNewsByCategory(category, limit, offset)
	if err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	response := gin.H{
		"news": newsItems,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	}

	utils.SuccessResponse(c, http.StatusOK, "News retrieved successfully", response)
}

func (h *RSSNewsHandler) RefreshFeeds(c *gin.Context) {
	// Manual refresh trigger (admin only in production)
	go func() {
		if err := h.rssService.FetchAllFeeds(); err != nil {
			h.logger.Errorf("Manual RSS refresh failed: %v", err)
		}
	}()

	utils.SuccessResponse(c, http.StatusOK, "RSS feed refresh triggered", nil)
}

func (h *RSSNewsHandler) GetCategories(c *gin.Context) {
	categories := []string{"general", "business", "technology", "sports"}
	utils.SuccessResponse(c, http.StatusOK, "Categories retrieved successfully", categories)
}

// Initialize RSS service and start periodic fetching
func (h *RSSNewsHandler) InitializeRSSService() error {
	// Initialize default feeds
	if err := h.rssService.InitializeDefaultFeeds(); err != nil {
		return err
	}

	// Start periodic fetching
	h.rssService.StartPeriodicFetch()
	
	return nil
}