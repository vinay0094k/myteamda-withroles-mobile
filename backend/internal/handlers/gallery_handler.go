// backend/internal/handlers/gallery_handler.go
package handlers

import (
	"employee-dashboard-api/internal/config"
	"employee-dashboard-api/internal/models"
	"employee-dashboard-api/internal/services" // Import services package
	"employee-dashboard-api/internal/utils"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type GalleryHandler struct {
	db        *gorm.DB
	s3Service *services.S3Service // Now explicitly using the S3Service
	logger    *logrus.Logger
	cfg       *config.Config
}

// NewGalleryHandler now accepts the S3Service
func NewGalleryHandler(db *gorm.DB, s3Service *services.S3Service, cfg *config.Config, logger *logrus.Logger) *GalleryHandler {
	return &GalleryHandler{
		db:        db,
		s3Service: s3Service, // Assign the S3Service instance
		cfg:       cfg,
		logger:    logger,
	}
}

// GalleryImageResponse is a helper struct to include the generated URL in the API response
type GalleryImageResponse struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	Description *string `json:"description"`
	URL         string  `json:"url"` // This will be the pre-signed URL
}

func (h *GalleryHandler) GetGalleryImages(c *gin.Context) {
	var galleryImages []models.GalleryImage
	if err := h.db.Order("uploaded_at DESC").Find(&galleryImages).Error; err != nil {
		h.logger.Errorf("Failed to fetch gallery images: %v", err)
		utils.InternalErrorResponse(c, err)
		return
	}

	var responseImages []GalleryImageResponse
	for _, img := range galleryImages {
		var presignedURL string
		var err error

		// Generate pre-signed URL only if S3 service is available and S3Key exists
		if h.s3Service != nil && img.S3Key != "" { // S3Key is a string, not a pointer in models.GalleryImage
			presignedURL, err = h.s3Service.GetPresignedURL(img.S3Key)
			if err != nil {
				h.logger.Errorf("Failed to get pre-signed URL for %s: %v", img.S3Key, err)
				// Skip this image if we can't generate a URL
				continue
			}
		} else {
			// If S3 service is not available or S3Key is empty, skip this image
			h.logger.Warnf("S3 service not available or S3Key empty for image %s, skipping", img.ID.String())
			continue
		}

		responseImages = append(responseImages, GalleryImageResponse{
			ID:          img.ID.String(),
			Title:       img.Title,
			Description: img.Description,
			URL:         presignedURL,
		})
	}

	utils.SuccessResponse(c, http.StatusOK, "Gallery images retrieved successfully", responseImages)
}
