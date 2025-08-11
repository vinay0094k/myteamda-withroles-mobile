package handlers

import (
	"employee-dashboard-api/internal/config"
	"employee-dashboard-api/internal/models"
	"employee-dashboard-api/internal/utils"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type SportsHandler struct {
	db     *gorm.DB
	config *config.Config
	logger *logrus.Logger
}

func NewSportsHandler(db *gorm.DB, cfg *config.Config, logger *logrus.Logger) *SportsHandler {
	return &SportsHandler{
		db:     db,
		config: cfg,
		logger: logger,
	}
}

func (h *SportsHandler) GetSportsEvents(c *gin.Context) {
	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	sportType := c.Query("sport_type")
	upcoming := c.Query("upcoming")

	offset := (page - 1) * limit

	query := h.db.Model(&models.SportsEvent{})

	if sportType != "" {
		query = query.Where("sport_type = ?", sportType)
	}

	if upcoming == "true" {
		query = query.Where("event_date > ?", time.Now())
	}

	var events []models.SportsEvent
	var total int64

	// Get total count
	query.Count(&total)

	// Get paginated results
	if err := query.Order("event_date ASC").Offset(offset).Limit(limit).Find(&events).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	// response := gin.H{
	// 	"events": events,
	// 	"pagination": gin.H{
	// 		"page":  page,
	// 		"limit": limit,
	// 		"total": total,GetSportsFacilities
	// 	},
	// }
	response := gin.H{
		"events": events,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			// ▶️ REMOVED stray identifier and added missing comma
			"total": total,
		},
	}

	utils.SuccessResponse(c, http.StatusOK, "Sports events retrieved successfully", response)
}

func (h *SportsHandler) GetSportsFacilities(c *gin.Context) {
	// Parse query parameters
	facilityType := c.Query("type")
	available := c.Query("available")

	query := h.db.Model(&models.SportsFacility{})

	if facilityType != "" {
		query = query.Where("type = ?", facilityType)
	}

	if available == "true" {
		query = query.Where("is_available = true")
	}

	var facilities []models.SportsFacility
	if err := query.Order("name ASC").Find(&facilities).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Sports facilities retrieved successfully", facilities)
}
