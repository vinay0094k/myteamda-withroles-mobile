package utils

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type APIResponse struct {
	Success   bool        `json:"success"`
	Message   string      `json:"message,omitempty"`
	Data      interface{} `json:"data,omitempty"`
	Error     string      `json:"error,omitempty"`
	RequestID string      `json:"request_id,omitempty"`
}

func SuccessResponse(c *gin.Context, statusCode int, message string, data interface{}) {
	response := APIResponse{
		Success:   true,
		Message:   message,
		Data:      data,
		RequestID: c.GetString("request_id"),
	}
	c.JSON(statusCode, response)
}

func ErrorResponse(c *gin.Context, statusCode int, message string, err string) {
	response := APIResponse{
		Success:   false,
		Message:   message,
		Error:     err,
		RequestID: c.GetString("request_id"),
	}
	c.JSON(statusCode, response)
}

func ValidationErrorResponse(c *gin.Context, err error) {
	ErrorResponse(c, http.StatusBadRequest, "Validation failed", err.Error())
}

func InternalErrorResponse(c *gin.Context, err error) {
	ErrorResponse(c, http.StatusInternalServerError, "Internal server error", err.Error())
}

func NotFoundResponse(c *gin.Context, resource string) {
	ErrorResponse(c, http.StatusNotFound, resource+" not found", "")
}

func UnauthorizedResponse(c *gin.Context) {
	ErrorResponse(c, http.StatusUnauthorized, "Unauthorized", "")
}

func ForbiddenResponse(c *gin.Context) {
	ErrorResponse(c, http.StatusForbidden, "Forbidden", "")
}