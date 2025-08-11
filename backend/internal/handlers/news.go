package handlers

import (
	"employee-dashboard-api/internal/config"
	"employee-dashboard-api/internal/models"
	"employee-dashboard-api/internal/utils"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type NewsHandler struct {
	db     *gorm.DB
	config *config.Config
	logger *logrus.Logger
}

func NewNewsHandler(db *gorm.DB, cfg *config.Config, logger *logrus.Logger) *NewsHandler {
	return &NewsHandler{
		db:     db,
		config: cfg,
		logger: logger,
	}
}

func (h *NewsHandler) GetNews(c *gin.Context) {
	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	category := c.Query("category")
	featured := c.Query("featured")

	offset := (page - 1) * limit

	query := h.db.Preload("Author").Where("is_published = true")
	
	if category != "" {
		query = query.Where("category = ?", category)
	}

	if featured == "true" {
		query = query.Where("is_featured = true")
	}

	var news []models.News
	var total int64

	// Get total count
	query.Model(&models.News{}).Count(&total)

	// Get paginated results
	if err := query.Order("published_at DESC").Offset(offset).Limit(limit).Find(&news).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	response := gin.H{
		"news": news,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	}

	utils.SuccessResponse(c, http.StatusOK, "News retrieved successfully", response)
}

func (h *NewsHandler) GetCompanyNews(c *gin.Context) {
	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	offset := (page - 1) * limit

	query := h.db.Preload("Author").Where("is_published = true AND category = 'company'")

	var news []models.News
	var total int64

	// Get total count
	query.Model(&models.News{}).Count(&total)

	// Get paginated results
	if err := query.Order("published_at DESC").Offset(offset).Limit(limit).Find(&news).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	response := gin.H{
		"news": news,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	}

	utils.SuccessResponse(c, http.StatusOK, "Company news retrieved successfully", response)
}

func (h *NewsHandler) GetAnnouncements(c *gin.Context) {
	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	offset := (page - 1) * limit

	query := h.db.Preload("Author").Where("is_published = true AND type = 'announcement'")

	var announcements []models.News
	var total int64

	// Get total count
	query.Model(&models.News{}).Count(&total)

	// Get paginated results
	if err := query.Order("published_at DESC").Offset(offset).Limit(limit).Find(&announcements).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	response := gin.H{
		"announcements": announcements,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	}

	utils.SuccessResponse(c, http.StatusOK, "Announcements retrieved successfully", response)
}