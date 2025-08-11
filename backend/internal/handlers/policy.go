package handlers

import (
	"employee-dashboard-api/internal/config"
	"employee-dashboard-api/internal/models"
	"employee-dashboard-api/internal/services"
	"employee-dashboard-api/internal/utils"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type PolicyHandler struct {
	db        *gorm.DB
	config    *config.Config
	logger    *logrus.Logger
	s3Service *services.S3Service
}

// NewPolicyHandler which accepts the S3Service
func NewPolicyHandler(db *gorm.DB, cfg *config.Config, logger *logrus.Logger, s3Service *services.S3Service) *PolicyHandler {
	return &PolicyHandler{
		db:        db,
		config:    cfg,
		logger:    logger,
		s3Service: s3Service,
	}
}

// PolicyResponse is a helper struct to include the generated URL in the API response
type PolicyResponse struct {
	models.Policy
	URL *string `json:"url,omitempty"` //this holds the presign URL
}

func (h *PolicyHandler) GetPolicies(c *gin.Context) {
	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	category := c.Query("category")

	offset := (page - 1) * limit

	query := h.db.Preload("Creator").Where("is_active = true")
	if category != "" {
		query = query.Where("category = ?", category)
	}

	var policies []models.Policy
	var total int64

	// Get total count
	query.Model(&models.Policy{}).Count(&total)

	// Get paginated results
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&policies).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	var responsePolicies []PolicyResponse
	for _, p := range policies {
		policyResp := PolicyResponse{Policy: p}
		// Generate pre-signed URL only if S3 service is available and S3Key exists
		if h.s3Service != nil && p.S3Key != nil && *p.S3Key != "" {
			url, err := h.s3Service.GetPresignedURL(*p.S3Key)
			if err != nil {
				h.logger.Errorf("Failed to generate pre-signed URL for policy %s (S3Key: %s): %v", p.ID, *p.S3Key, err)
				// If URL generation fails, the URL field will remain nil, which is acceptable.
			} else {
				policyResp.URL = &url
			}
		}
		responsePolicies = append(responsePolicies, policyResp)
	}

	response := gin.H{
		"policies": responsePolicies, // Use the new responsePolicies slice
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	}

	utils.SuccessResponse(c, http.StatusOK, "Policies retrieved successfully", response)
}

// GetPolicy func
func (h *PolicyHandler) GetPolicy(c *gin.Context) {
	policyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid policy ID", err.Error())
		return
	}

	var policy models.Policy
	if err := h.db.Preload("Creator").Where("id = ? AND is_active = true", policyID).First(&policy).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Policy")
			return
		}
		utils.InternalErrorResponse(c, err)
		return
	}

	policyResp := PolicyResponse{Policy: policy}
	// Generate pre-signed URL only if S3 service is available and S3Key exists
	if h.s3Service != nil && policy.S3Key != nil && *policy.S3Key != "" {
		url, err := h.s3Service.GetPresignedURL(*policy.S3Key)
		if err != nil {
			h.logger.Errorf("Failed to generate pre-signed URL for policy %s (S3Key: %s): %v", policy.ID, *policy.S3Key, err)
		} else {
			policyResp.URL = &url
		}
	}

	utils.SuccessResponse(c, http.StatusOK, "Policy retrieved successfully", policyResp)
}

// =========================================================================================
