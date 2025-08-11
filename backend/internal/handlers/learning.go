package handlers

import (
	"employee-dashboard-api/internal/config"
	"employee-dashboard-api/internal/models"
	"employee-dashboard-api/internal/utils"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type LearningHandler struct {
	db       *gorm.DB
	config   *config.Config
	logger   *logrus.Logger
	location *time.Location
}

func NewLearningHandler(db *gorm.DB, cfg *config.Config, logger *logrus.Logger, location *time.Location) *LearningHandler {
	return &LearningHandler{
		db:       db,
		config:   cfg,
		logger:   logger,
		location: location,
	}
}

type EnrollRequest struct {
	SessionID uuid.UUID `json:"session_id" binding:"required"`
}

func (h *LearningHandler) GetSessions(c *gin.Context) {
	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	topic := c.Query("topic")
	upcoming := c.Query("upcoming")

	offset := (page - 1) * limit

	query := h.db.Model(&models.LearningSession{})

	if topic != "" {
		query = query.Where("topic = ?", topic)
	}

	if upcoming == "true" {
		query = query.Where("session_date > ?", time.Now())
	}

	var sessions []models.LearningSession
	var total int64

	// Get total count
	query.Count(&total)

	// Get paginated results
	if err := query.Order("session_date ASC").Offset(offset).Limit(limit).Find(&sessions).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	response := gin.H{
		"sessions": sessions,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	}

	utils.SuccessResponse(c, http.StatusOK, "Learning sessions retrieved successfully", response)
}

func (h *LearningHandler) EnrollInSession(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists || userID == uuid.Nil {
		utils.UnauthorizedResponse(c)
		return
	}

	var req EnrollRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err)
		return
	}

	// Check if session exists
	var session models.LearningSession
	if err := h.db.Where("id = ?", req.SessionID).First(&session).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Learning session")
			return
		}
		utils.InternalErrorResponse(c, err)
		return
	}

	// Check if session is in the future
	if session.SessionDate.Before(time.Now()) {
		utils.ErrorResponse(c, http.StatusBadRequest, "Cannot enroll in past sessions", "")
		return
	}

	// Check if user is already enrolled
	var existingEnrollment models.LearningEnrollment
	if err := h.db.Where("user_id = ? AND session_id = ?", userID, req.SessionID).First(&existingEnrollment).Error; err == nil {
		utils.ErrorResponse(c, http.StatusConflict, "Already enrolled in this session", "")
		return
	}

	// Check if session has capacity
	if session.MaxParticipants != nil {
		var enrollmentCount int64
		h.db.Model(&models.LearningEnrollment{}).Where("session_id = ?", req.SessionID).Count(&enrollmentCount)
		if enrollmentCount >= int64(*session.MaxParticipants) {
			utils.ErrorResponse(c, http.StatusBadRequest, "Session is full", "")
			return
		}
	}

	// Create enrollment
	enrollment := models.LearningEnrollment{
		UserID:           userID.(uuid.UUID),
		SessionID:        req.SessionID,
		EnrolledAt:       time.Now(),
		AttendanceStatus: nil, // Will be set later
	}

	if err := h.db.Create(&enrollment).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	// Load relationships
	if err := h.db.Preload("Session").Preload("User").First(&enrollment, enrollment.ID).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Enrolled in session successfully", enrollment)
}

func (h *LearningHandler) GetTopics(c *gin.Context) {
	// Get distinct topics from learning sessions
	var topics []string
	if err := h.db.Model(&models.LearningSession{}).
		Where("topic IS NOT NULL").
		Distinct("topic").
		Pluck("topic", &topics).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Topics retrieved successfully", topics)
}
