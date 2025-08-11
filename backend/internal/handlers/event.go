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

type EventHandler struct {
	db       *gorm.DB
	config   *config.Config
	logger   *logrus.Logger
	location *time.Location
}

func NewEventHandler(db *gorm.DB, cfg *config.Config, logger *logrus.Logger, location *time.Location) *EventHandler {
	return &EventHandler{
		db:       db,
		config:   cfg,
		logger:   logger,
		location: location,
	}
}

func (h *EventHandler) GetEvents(c *gin.Context) {
	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	eventType := c.Query("type")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	offset := (page - 1) * limit

	query := h.db.Preload("User")

	if eventType != "" {
		query = query.Where("event_type = ?", eventType)
	}

	if startDate != "" {
		query = query.Where("event_date >= ?", startDate)
	}

	if endDate != "" {
		query = query.Where("event_date <= ?", endDate)
	}

	var events []models.Event
	var total int64

	// Get total count
	query.Model(&models.Event{}).Count(&total)

	// Get paginated results
	if err := query.Order("event_date ASC").Offset(offset).Limit(limit).Find(&events).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	response := gin.H{
		"events": events,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	}

	utils.SuccessResponse(c, http.StatusOK, "Events retrieved successfully", response)
}

func (h *EventHandler) GetBirthdays(c *gin.Context) {
	// Get birthdays for the current month or specified month
	month := c.DefaultQuery("month", strconv.Itoa(int(time.Now().Month())))
	year := c.DefaultQuery("year", strconv.Itoa(time.Now().Year()))

	var events []models.Event
	if err := h.db.Preload("User").
		Where("event_type = ? AND EXTRACT(MONTH FROM event_date) = ? AND EXTRACT(YEAR FROM event_date) = ?",
			"birthday", month, year).
		Order("event_date ASC").
		Find(&events).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Birthdays retrieved successfully", events)
}

func (h *EventHandler) GetAnniversaries(c *gin.Context) {
	// Get work anniversaries for the current month or specified month
	month := c.DefaultQuery("month", strconv.Itoa(int(time.Now().Month())))
	year := c.DefaultQuery("year", strconv.Itoa(time.Now().Year()))

	var events []models.Event
	if err := h.db.Preload("User").
		Where("event_type = ? AND EXTRACT(MONTH FROM event_date) = ? AND EXTRACT(YEAR FROM event_date) = ?",
			"anniversary", month, year).
		Order("event_date ASC").
		Find(&events).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Anniversaries retrieved successfully", events)
}

func (h *EventHandler) GetHolidays(c *gin.Context) {
	// Get holidays for the current month or specified month/year
	month := c.Query("month")
	year := c.DefaultQuery("year", strconv.Itoa(time.Now().Year()))

	query := h.db.Where("event_type = ?", "holiday")

	if month != "" {
		query = query.Where("EXTRACT(MONTH FROM event_date) = ?", month)
	}

	query = query.Where("EXTRACT(YEAR FROM event_date) = ?", year)

	var events []models.Event
	if err := query.Order("event_date ASC").Find(&events).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Holidays retrieved successfully", events)
}
