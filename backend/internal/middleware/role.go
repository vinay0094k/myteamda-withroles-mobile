package middleware

import (
	"employee-dashboard-api/internal/models"
	"employee-dashboard-api/internal/utils"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func RequireRole(db *gorm.DB, allowedRoles ...models.UserRole) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists || userID == uuid.Nil {
			utils.UnauthorizedResponse(c)
			c.Abort()
			return
		}

		var user models.User
		if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
			utils.UnauthorizedResponse(c)
			c.Abort()
			return
		}

		// Check if user's role is in the allowed roles
		for _, role := range allowedRoles {
			if user.Role == role {
				c.Set("user_role", user.Role)
				c.Next()
				return
			}
		}

		utils.ErrorResponse(c, http.StatusForbidden, "Insufficient permissions", "")
		c.Abort()
	}
}

func RequireAdminRole(db *gorm.DB) gin.HandlerFunc {
	return RequireRole(db, models.RoleAdmin)
}

func RequireHRRole(db *gorm.DB) gin.HandlerFunc {
	return RequireRole(db, models.RoleAdmin, models.RoleHR)
}

func RequireManagerRole(db *gorm.DB) gin.HandlerFunc {
	return RequireRole(db, models.RoleAdmin, models.RoleHR, models.RoleManager)
}

func RequireTeamLeadRole(db *gorm.DB) gin.HandlerFunc {
	return RequireRole(db, models.RoleAdmin, models.RoleHR, models.RoleManager, models.RoleTeamLead)
}
