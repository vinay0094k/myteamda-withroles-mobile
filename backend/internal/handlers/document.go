package handlers

import (
	"employee-dashboard-api/internal/config"
	"employee-dashboard-api/internal/models"
	"employee-dashboard-api/internal/utils"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type DocumentHandler struct {
	db     *gorm.DB
	config *config.Config
	logger *logrus.Logger
}

func NewDocumentHandler(db *gorm.DB, cfg *config.Config, logger *logrus.Logger) *DocumentHandler {
	return &DocumentHandler{
		db:     db,
		config: cfg,
		logger: logger,
	}
}

func (h *DocumentHandler) GetDocuments(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists || userID == uuid.Nil {
		utils.UnauthorizedResponse(c)
		return
	}

	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	category := c.Query("category")

	offset := (page - 1) * limit

	query := h.db.Where("user_id = ?", userID)

	if category != "" {
		query = query.Where("category = ?", category)
	}

	var documents []models.Document
	var total int64

	// Get total count
	query.Model(&models.Document{}).Count(&total)

	// Get paginated results
	if err := query.Order("uploaded_at DESC").Offset(offset).Limit(limit).Find(&documents).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	response := gin.H{
		"documents": documents,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	}

	utils.SuccessResponse(c, http.StatusOK, "Documents retrieved successfully", response)
}

func (h *DocumentHandler) UploadDocument(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists || userID == uuid.Nil {
		utils.UnauthorizedResponse(c)
		return
	}

	// Parse multipart form
	if err := c.Request.ParseMultipartForm(h.config.MaxUploadSize); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "File too large", err.Error())
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "No file provided", err.Error())
		return
	}
	defer file.Close()

	// Validate file size
	if header.Size > h.config.MaxUploadSize {
		utils.ErrorResponse(c, http.StatusBadRequest, "File too large", "")
		return
	}

	// Get form fields
	category := c.PostForm("category")
	description := c.PostForm("description")

	// Create upload directory if it doesn't exist
	uploadDir := filepath.Join(h.config.UploadPath, userID.(uuid.UUID).String())
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	// Generate unique filename
	filename := fmt.Sprintf("%d_%s", time.Now().Unix(), header.Filename)
	filePath := filepath.Join(uploadDir, filename)

	// Create the file
	dst, err := os.Create(filePath)
	if err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}
	defer dst.Close()

	// Copy file content
	if _, err := io.Copy(dst, file); err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	// Save document record to database
	document := models.Document{
		UserID:           userID.(uuid.UUID),
		Filename:         filename,
		OriginalFilename: header.Filename,
		FilePath:         filePath,
		FileSize:         &header.Size,
		MimeType:         func() *string { ct := header.Header.Get("Content-Type"); return &ct }(),
		Category:         &category,
		Description:      &description,
		UploadedAt:       time.Now(),
	}

	if err := h.db.Create(&document).Error; err != nil {
		// Clean up file if database save fails
		os.Remove(filePath)
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Document uploaded successfully", document)
}

func (h *DocumentHandler) DeleteDocument(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists || userID == uuid.Nil {
		utils.UnauthorizedResponse(c)
		return
	}

	documentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid document ID", err.Error())
		return
	}

	// Find document
	var document models.Document
	if err := h.db.Where("id = ? AND user_id = ?", documentID, userID).First(&document).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Document")
			return
		}
		utils.InternalErrorResponse(c, err)
		return
	}

	// Delete file from filesystem
	if err := os.Remove(document.FilePath); err != nil {
		h.logger.Warnf("Failed to delete file %s: %v", document.FilePath, err)
	}

	// Delete document record from database
	if err := h.db.Delete(&document).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Document deleted successfully", nil)
}

func (h *DocumentHandler) DownloadDocument(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists || userID == uuid.Nil {
		utils.UnauthorizedResponse(c)
		return
	}

	documentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid document ID", err.Error())
		return
	}

	// Find document
	var document models.Document
	if err := h.db.Where("id = ? AND user_id = ?", documentID, userID).First(&document).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Document")
			return
		}
		utils.InternalErrorResponse(c, err)
		return
	}

	// Check if file exists
	if _, err := os.Stat(document.FilePath); os.IsNotExist(err) {
		utils.ErrorResponse(c, http.StatusNotFound, "File not found on disk", "")
		return
	}

	// Set headers for file download
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", document.OriginalFilename))
	if document.MimeType != nil {
		c.Header("Content-Type", *document.MimeType)
	}

	// Serve the file
	c.File(document.FilePath)
}

func (h *DocumentHandler) GetCategories(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists || userID == uuid.Nil {
		utils.UnauthorizedResponse(c)
		return
	}

	// Get distinct categories for the user
	var categories []string
	if err := h.db.Model(&models.Document{}).
		Where("user_id = ? AND category IS NOT NULL", userID).
		Distinct("category").
		Pluck("category", &categories).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Categories retrieved successfully", categories)
}
