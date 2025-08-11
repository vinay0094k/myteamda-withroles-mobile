package middleware

import (
	"net/http"
	"os"
	"regexp"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// ManualCORSMiddleware handles CORS manually to ensure proper preflight handling
func ManualCORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		
		// Debug logging
		println("CORS: Request method:", c.Request.Method)
		println("CORS: Origin:", origin)
		
		if IsAllowedOrigin(origin) {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
			c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin, ngrok-skip-browser-warning")
			c.Header("Access-Control-Expose-Headers", "Content-Length, Content-Type")
			c.Header("Access-Control-Max-Age", "86400")
		}
		
		// Handle preflight requests
		if c.Request.Method == "OPTIONS" {
			println("CORS: Handling OPTIONS preflight request")
			c.AbortWithStatus(http.StatusOK)
			return
		}
		
		c.Next()
	}
}

// CORSMiddleware returns a Gin middleware for handling CORS with dynamic ngrok support
func CORSMiddleware() gin.HandlerFunc {
	return cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool {
			return IsAllowedOrigin(origin)
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowHeaders:     []string{"Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "ngrok-skip-browser-warning"},
		ExposeHeaders:    []string{"Content-Length", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           86400, // 24 hours
	})
}

// IsAllowedOrigin checks if an origin is allowed based on env config and ngrok patterns
func IsAllowedOrigin(origin string) bool {
	if origin == "" {
		println("CORS: Empty origin")
		return false
	}
	
	// Remove trailing dot if present (common with some CDNs)
	origin = strings.TrimSuffix(origin, ".")
	
	// Debug logging
	println("CORS: Checking origin (after cleanup):", origin)
	
	// Get allowed origins from environment variable
	allowedOriginsEnv := os.Getenv("CORS_ALLOWED_ORIGINS")
	println("CORS: Environment CORS_ALLOWED_ORIGINS:", allowedOriginsEnv)
	
	if allowedOriginsEnv != "" {
		allowedOrigins := strings.Split(allowedOriginsEnv, ",")
		println("CORS: Split origins count:", len(allowedOrigins))
		
		// Check if origin is in the allowed list
		for i, allowedOrigin := range allowedOrigins {
			trimmed := strings.TrimSpace(allowedOrigin)
			// Also remove trailing dot from configured origins
			trimmed = strings.TrimSuffix(trimmed, ".")
			println("CORS: Comparing with allowed origin", i, ":", "'"+trimmed+"'", "vs", "'"+origin+"'")
			if trimmed == origin {
				println("CORS: Origin allowed from env config:", origin)
				return true
			}
		}
	} else {
		println("CORS: No CORS_ALLOWED_ORIGINS environment variable found")
	}
	
	// Check for ngrok domains
	ngrokFreePattern := regexp.MustCompile(`^https://[a-z0-9]+\.ngrok-free\.app$`)
	ngrokPattern := regexp.MustCompile(`^https://[a-z0-9]+\.ngrok\.io$`)
	
	if ngrokFreePattern.MatchString(origin) || ngrokPattern.MatchString(origin) {
		println("CORS: Origin allowed as ngrok domain:", origin)
		return true
	}
	
	println("CORS: Origin NOT allowed:", origin)
	return false
}

// GetAllowedOrigins returns the list of allowed origins from environment
func GetAllowedOrigins() []string {
	allowedOriginsEnv := os.Getenv("CORS_ALLOWED_ORIGINS")
	if allowedOriginsEnv == "" {
		return []string{
			"http://localhost:3000",
			"http://localhost:5173",
			"https://d1eilvhlfhse5o.cloudfront.net",
		}
	}
	
	origins := strings.Split(allowedOriginsEnv, ",")
	var trimmedOrigins []string
	for _, origin := range origins {
		trimmed := strings.TrimSpace(origin)
		if trimmed != "" {
			trimmedOrigins = append(trimmedOrigins, trimmed)
		}
	}
	
	return trimmedOrigins
}
