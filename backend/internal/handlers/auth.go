package handlers

import (
	"employee-dashboard-api/internal/config"
	"employee-dashboard-api/internal/models"
	"employee-dashboard-api/internal/services"
	"employee-dashboard-api/internal/utils"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type AuthHandler struct {
	db           *gorm.DB
	config       *config.Config
	logger       *logrus.Logger
	emailService *services.EmailService
}

func NewAuthHandler(db *gorm.DB, cfg *config.Config, logger *logrus.Logger) *AuthHandler {
	emailConfig := services.EmailConfig{
		SMTPHost:     cfg.SMTPHost,
		SMTPPort:     cfg.SMTPPortStr,
		SMTPUsername: cfg.SMTPUsername,
		SMTPPassword: cfg.SMTPPassword,
		FromEmail:    cfg.SMTPFromEmail,
		FromName:     cfg.SMTPFromName,
	}
	emailService := services.NewEmailService(db, logger, emailConfig)

	return &AuthHandler{
		db:           db,
		config:       cfg,
		logger:       logger,
		emailService: emailService,
	}
}

type RegisterRequest struct {
	EmployeeID string `json:"employee_id" binding:"required"`
	Email      string `json:"email" binding:"required,email"`
	Password   string `json:"password" binding:"required,min=6"`
	FirstName  string `json:"first_name" binding:"required"`
	LastName   string `json:"last_name" binding:"required"`
	Phone      string `json:"phone"`
}

type LoginRequest struct {
	EmployeeID string `json:"employee_id" binding:"required" example:"EMP001"`
	Password   string `json:"password" binding:"required" example:"password123"`
}

type SendOTPRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type VerifyOTPRequest struct {
	Email string `json:"email" binding:"required,email"`
	OTP   string `json:"otp" binding:"required"`
}

type CompleteRegistrationRequest struct {
	Email      string `json:"email" binding:"required,email"`
	OTP        string `json:"otp" binding:"required"`
	EmployeeID string `json:"employee_id" binding:"required"`
	Password   string `json:"password" binding:"required,min=6"`
	FirstName  string `json:"first_name" binding:"required"`
	LastName   string `json:"last_name" binding:"required"`
	Phone      string `json:"phone"`
}

type AuthResponse struct {
	Token string      `json:"token" example:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`
	User  models.User `json:"user"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err)
		return
	}

	// Store registration data temporarily (in a real app, you might use Redis or a temp table)
	// For now, just validate and return success - actual user creation happens after OTP verification

	// Check if user already exists
	var existingUser models.User
	if err := h.db.Where("email = ? OR employee_id = ?", req.Email, req.EmployeeID).First(&existingUser).Error; err == nil {
		utils.ErrorResponse(c, http.StatusConflict, "User already exists", "")
		return
	}

	// Validate password strength
	if len(req.Password) < 6 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Password must be at least 6 characters", "")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Registration data validated. Please verify your email.", nil)
}

func (h *AuthHandler) CompleteRegistration(c *gin.Context) {
	var req CompleteRegistrationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err)
		return
	}

	// Verify OTP
	if err := h.emailService.VerifyOTP(req.Email, req.OTP, "signup"); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid or expired OTP", err.Error())
		return
	}

	// Check if user already exists
	var existingUser models.User
	if err := h.db.Where("email = ? OR employee_id = ?", req.Email, req.EmployeeID).First(&existingUser).Error; err == nil {
		utils.ErrorResponse(c, http.StatusConflict, "User already exists", "")
		return
	}

	// Hash password
	// hashedPassword, err := utils.HashPassword(req.Password)
	// if err != nil {
	// 	utils.InternalErrorResponse(c, err)
	// 	return
	// }

	var passwordToStore string
	if h.config.UserPlainPasswords {
		passwordToStore = req.Password // Store plain password
	} else {
		hashedPassword, err := utils.HashPassword(req.Password)
		if err != nil {
			utils.InternalErrorResponse(c, err)
			return
		}
		passwordToStore = hashedPassword
	}

	// Create user with pending status - admin approval required
	user := models.User{
		EmployeeID:     req.EmployeeID,
		Email:          req.Email,
		PasswordHash:   passwordToStore,
		FirstName:      req.FirstName,
		LastName:       req.LastName,
		Phone:          &req.Phone,
		Role:           models.RoleEmployee,  // Default role, can be changed by admin
		ApprovalStatus: models.StatusPending, // Requires admin approval
	}

	if err := h.db.Create(&user).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	// Don't generate token for pending users
	// Remove password hash from response
	user.PasswordHash = ""

	utils.SuccessResponse(c, http.StatusCreated, "Registration completed. Your account is pending admin approval.", user)
}

// @Summary User login
// @Description Authenticate user with employee ID and password, returning a JWT token and user details.
// @Tags Auth
// @Accept json
// @Produce json
// @Param credentials body LoginRequest true "Login credentials (employee_id and password)"
// @Success 200 {object} handlers.AuthResponse "Login successful"
// @Failure 400 {object} utils.APIResponse "Invalid request payload or missing fields"
// @Failure 401 {object} utils.APIResponse "Invalid credentials (employee ID or password incorrect)"
// @Failure 403 {object} utils.APIResponse "Account pending admin approval or rejected"
// @Router /auth/login [post]

// Login func
// ---------------------------------------------------
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err)
		return
	}

	// Find user
	var user models.User
	if err := h.db.Where("employee_id = ?", req.EmployeeID).First(&user).Error; err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Invalid credentials", "")
		return
	}

	// Check if user is approved
	if user.ApprovalStatus != models.StatusApproved {
		switch user.ApprovalStatus {
		case models.StatusPending:
			utils.ErrorResponse(c, http.StatusForbidden, "Your account is pending admin approval", "")
		case models.StatusRejected:
			utils.ErrorResponse(c, http.StatusForbidden, "Your account has been rejected", "")
		default:
			utils.ErrorResponse(c, http.StatusForbidden, "Your account is not active", "")
		}
		return
	}

	// Check password
	var passwordMatch bool
	if h.config.UserPlainPasswords {
		passwordMatch = (req.Password == user.PasswordHash) // Compare plain password
	} else {
		passwordMatch = utils.CheckPasswordHash(req.Password, user.PasswordHash)
	}

	if !passwordMatch {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Invalid credentials", "")
		return
	}

	// Generate token
	token, err := utils.GenerateToken(user.ID, user.Email, h.config.JWTSecret, h.config.JWTExpiryHours)
	if err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	// Remove password hash from response
	user.PasswordHash = ""

	response := AuthResponse{
		Token: token,
		User:  user,
	}

	utils.SuccessResponse(c, http.StatusOK, "Login successful", response)
}

func (h *AuthHandler) SendSignupOTP(c *gin.Context) {
	var req SendOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err)
		return
	}

	// Send OTP
	if err := h.emailService.SendSignupOTP(req.Email); err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "OTP sent successfully", nil)
}

func (h *AuthHandler) VerifySignupOTP(c *gin.Context) {
	var req VerifyOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err)
		return
	}

	// Verify OTP
	if err := h.emailService.VerifyOTP(req.Email, req.OTP, "signup"); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid or expired OTP", err.Error())
		return
	}

	// After OTP verification, we could create the user here if we had the registration data
	// For now, just mark email as verified
	utils.SuccessResponse(c, http.StatusOK, "OTP verified successfully", nil)
}

func (h *AuthHandler) Logout(c *gin.Context) {
	// In a stateless JWT system, logout is handled client-side
	// Here we could implement token blacklisting if needed
	utils.SuccessResponse(c, http.StatusOK, "Logout successful", nil)
}

// @Summary Get current user details
// @Description Retrieve the profile information of the currently authenticated user.
// @Tags Auth
// @Security ApiKeyAuth
// @Produce json
// @Success 200 {object} models.User "User profile retrieved successfully"
// @Failure 401 {object} utils.APIResponse "Unauthorized (no valid token provided)"
// @Failure 404 {object} utils.APIResponse "User not found"
// @Router /auth/me [get]

func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c)
		return
	}

	// Handle anonymous users
	if userID == uuid.Nil {
		if h.config.AllowAnonymousUsers {
			utils.SuccessResponse(c, http.StatusOK, "Anonymous user", gin.H{
				"is_anonymous": true,
			})
			return
		}
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

	utils.SuccessResponse(c, http.StatusOK, "User retrieved successfully", user)
}

// New admin methods for user approval
type ApproveUserRequest struct {
	Role string `json:"role" binding:"required"`
}

func (h *AuthHandler) GetPendingUsers(c *gin.Context) {
	var users []models.User
	if err := h.db.Where("approval_status = ?", models.StatusPending).Find(&users).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	// Remove password hashes from response
	for i := range users {
		users[i].PasswordHash = ""
	}

	utils.SuccessResponse(c, http.StatusOK, "Pending users retrieved successfully", users)
}

func (h *AuthHandler) ApproveUser(c *gin.Context) {
	userID := c.Param("id")
	adminID, exists := c.Get("user_id")
	if !exists || adminID == uuid.Nil {
		utils.UnauthorizedResponse(c)
		return
	}

	var req ApproveUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err)
		return
	}

	// Validate role
	validRoles := []string{"admin", "hr", "manager", "team-lead", "employee"}
	isValidRole := false
	for _, role := range validRoles {
		if req.Role == role {
			isValidRole = true
			break
		}
	}
	if !isValidRole {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid role", "")
		return
	}

	// Update user
	now := time.Now()
	adminUUID := adminID.(uuid.UUID)
	updates := map[string]interface{}{
		"approval_status": models.StatusApproved,
		"role":            models.UserRole(req.Role),
		"approved_by":     adminUUID,
		"approved_at":     &now,
	}

	if err := h.db.Model(&models.User{}).Where("id = ? AND approval_status = ?", userID, models.StatusPending).Updates(updates).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "User approved successfully", nil)
}

func (h *AuthHandler) RejectUser(c *gin.Context) {
	userID := c.Param("id")
	adminID, exists := c.Get("user_id")
	if !exists || adminID == uuid.Nil {
		utils.UnauthorizedResponse(c)
		return
	}

	var req struct {
		Reason string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err)
		return
	}

	// Update user
	adminUUID := adminID.(uuid.UUID)
	updates := map[string]interface{}{
		"approval_status":  models.StatusRejected,
		"approved_by":      adminUUID,
		"rejection_reason": req.Reason,
	}

	if err := h.db.Model(&models.User{}).Where("id = ? AND approval_status = ?", userID, models.StatusPending).Updates(updates).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "User rejected successfully", nil)
}
