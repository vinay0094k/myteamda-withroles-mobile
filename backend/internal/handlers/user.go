package handlers

import (
	"employee-dashboard-api/internal/config"
	"employee-dashboard-api/internal/models"
	"employee-dashboard-api/internal/utils"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type UserHandler struct {
	db     *gorm.DB
	config *config.Config
	logger *logrus.Logger
}

func NewUserHandler(db *gorm.DB, cfg *config.Config, logger *logrus.Logger) *UserHandler {
	return &UserHandler{
		db:     db,
		config: cfg,
		logger: logger,
	}
}

type UpdateProfileRequest struct {
	FirstName       string `json:"first_name"`
	LastName        string `json:"last_name"`
	Phone           string `json:"phone"`
	Department      string `json:"department"`
	Position        string `json:"position"`
	ProfileImageURL string `json:"profile_image_url"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=6"`
}

func (h *UserHandler) GetProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists || userID == uuid.Nil {
		utils.UnauthorizedResponse(c)
		return
	}

	var user models.User
	if err := h.db.Preload("Manager").Where("id = ?", userID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "User")
			return
		}
		utils.InternalErrorResponse(c, err)
		return
	}

	// Remove password hash from response
	user.PasswordHash = ""

	utils.SuccessResponse(c, http.StatusOK, "Profile retrieved successfully", user)
}

func (h *UserHandler) UpdateProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists || userID == uuid.Nil {
		utils.UnauthorizedResponse(c)
		return
	}

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err)
		return
	}

	var user models.User
	if err := h.db.Where("id = ?", userID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "User")
			return
		}
		utils.InternalErrorResponse(c, err)
		return
	}

	// Update user fields
	updates := map[string]interface{}{
		"first_name": req.FirstName,
		"last_name":  req.LastName,
	}

	if req.Phone != "" {
		updates["phone"] = req.Phone
	}
	if req.Department != "" {
		updates["department"] = req.Department
	}
	if req.Position != "" {
		updates["position"] = req.Position
	}
	if req.ProfileImageURL != "" {
		updates["profile_image_url"] = req.ProfileImageURL
	}

	if err := h.db.Model(&user).Updates(updates).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	// Fetch updated user
	if err := h.db.Preload("Manager").Where("id = ?", userID).First(&user).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	// Remove password hash from response
	user.PasswordHash = ""

	utils.SuccessResponse(c, http.StatusOK, "Profile updated successfully", user)
}

func (h *UserHandler) ChangePassword(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists || userID == uuid.Nil {
		utils.UnauthorizedResponse(c)
		return
	}

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err)
		return
	}

	var user models.User
	if err := h.db.Where("id = ?", userID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "User")
			return
		}
		utils.InternalErrorResponse(c, err)
		return
	}

	// Verify current password
	var currentPasswordMatch bool
	if h.config.UserPlainPasswords {
		currentPasswordMatch = (req.CurrentPassword == user.PasswordHash)
	} else {
		currentPasswordMatch = utils.CheckPasswordHash(req.CurrentPassword, user.PasswordHash)
	}

	if !currentPasswordMatch {
		utils.ErrorResponse(c, http.StatusBadRequest, "Current password is incorrect", "")
		return
	}

	// Determine password to store
	var newPasswordToStore string
	if h.config.UserPlainPasswords {
		newPasswordToStore = req.NewPassword // Store new plain password
	} else {
		hashedPassword, err := utils.HashPassword(req.NewPassword)
		if err != nil {
			utils.InternalErrorResponse(c, err)
			return
		}
		newPasswordToStore = hashedPassword
	}

	// Update password
	if err := h.db.Model(&user).Update("password_hash", newPasswordToStore).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Password changed successfully", nil)
}

func (h *UserHandler) GetUserAssets(c *gin.Context) {
	userIDParam := c.Param("id")
	userID, err := uuid.Parse(userIDParam)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid user ID", err.Error())
		return
	}

	// Check if the requesting user is the same as the requested user or has admin privileges
	requestingUserID, exists := c.Get("user_id")
	if !exists || requestingUserID == uuid.Nil {
		utils.UnauthorizedResponse(c)
		return
	}

	if requestingUserID != userID {
		// In a real application, you might want to check for admin privileges here
		utils.ForbiddenResponse(c)
		return
	}

	var assets []models.Asset
	if err := h.db.Where("assigned_to = ?", userID).Find(&assets).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Assets retrieved successfully", assets)
}

// GetUsers func to retrieve a list of users
type UserListItem struct {
	ID              uuid.UUID       `json:"id"`
	EmployeeID      string          `json:"employee_id"`
	FirstName       string          `json:"first_name"`
	LastName        string          `json:"last_name"`
	Email           string          `json:"email"`
	Role            models.UserRole `json:"role"`
	Department      string          `json:"department"`
	ProfileImageURL string          `json:"profile_image_url"`
}

func (h *UserHandler) GetUsers(c *gin.Context) {
	var users []models.User
	// Only fetch approved users for timesheet viewing
	if err := h.db.Where("approval_status = ?", models.StatusApproved).Order("first_name ASC, last_name ASC").Find(&users).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	var userList []UserListItem
	for _, user := range users {
		department := ""
		if user.Department != nil {
			department = *user.Department
		}

		profileImageURL := ""
		if user.ProfileImageURL != nil {
			profileImageURL = *user.ProfileImageURL
		}

		userList = append(userList, UserListItem{
			ID:              user.ID,
			EmployeeID:      user.EmployeeID,
			FirstName:       user.FirstName,
			LastName:        user.LastName,
			Email:           user.Email,
			Role:            user.Role,
			Department:      department,
			ProfileImageURL: profileImageURL,
		})
	}

	utils.SuccessResponse(c, http.StatusOK, "Users retrieved successfully", userList)
}
