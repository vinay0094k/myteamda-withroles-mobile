package handlers

import (
	"employee-dashboard-api/internal/config"
	"employee-dashboard-api/internal/services"
	"employee-dashboard-api/internal/utils"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type HolidayHandler struct {
	db             *gorm.DB
	config         *config.Config
	logger         *logrus.Logger
	holidayService *services.HolidayService
	location       *time.Location
}

func NewHolidayHandler(db *gorm.DB, cfg *config.Config, logger *logrus.Logger, location *time.Location) *HolidayHandler {
	holidayService := services.NewHolidayService(db, logger)
	return &HolidayHandler{
		db:             db,
		config:         cfg,
		logger:         logger,
		holidayService: holidayService,
		location:       location,
	}
}

func (h *HolidayHandler) LoadHolidayData(c *gin.Context) {
	if err := h.holidayService.LoadHolidaysFromCSV("holidays.csv"); err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Holiday data loaded successfully", nil)
}

func (h *HolidayHandler) InitializeHolidayData(c *gin.Context) {
	if err := h.holidayService.InitializeHolidayData(); err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Holiday data initialized successfully", nil)
}

func (h *HolidayHandler) GetHolidaysByYear(c *gin.Context) {
	yearStr := c.DefaultQuery("year", strconv.Itoa(time.Now().Year()))
	year, err := strconv.Atoi(yearStr)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid year parameter", err.Error())
		return
	}

	holidays, err := h.holidayService.GetHolidaysByYear(year)
	if err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Holidays retrieved successfully", holidays)
}

func (h *HolidayHandler) GetUpcomingHolidays(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 10
	}

	holidays, err := h.holidayService.GetUpcomingHolidays(limit)
	if err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Upcoming holidays retrieved successfully", holidays)
}
