// backend/main.go
package main

import (
	"employee-dashboard-api/internal/config"
	"employee-dashboard-api/internal/database"
	"employee-dashboard-api/internal/middleware"
	"employee-dashboard-api/internal/routes"
	"employee-dashboard-api/internal/services"
	_ "employee-dashboard-api/docs" // Import generated docs
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"github.com/swaggo/files"
	"github.com/swaggo/gin-swagger"
)

// @title Employee Dashboard API
// @version 1.0
// @description A comprehensive REST API for the Employee Dashboard mobile application
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.url http://www.swagger.io/support
// @contact.email support@swagger.io

// @license.name MIT
// @license.url https://opensource.org/licenses/MIT

// @host localhost:8080
// @BasePath /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token.

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize logger
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)
	if cfg.LogFormat == "json" {
		logger.SetFormatter(&logrus.JSONFormatter{})
	}

	// Add this line to debug CORS origins
	logger.Infof("CORS Allowed Origins: %v", cfg.CORSAllowedOrigins)

	// Load application timezone
	var appLocation *time.Location
	var err error
	if cfg.UseUTC {
		appLocation = time.UTC
		logger.Info("Using UTC timezone")
	} else {
		appLocation, err = time.LoadLocation(cfg.AppTimeZone)
		if err != nil {
			log.Fatalf("Failed to load timezone %s: %v", cfg.AppTimeZone, err)
		}
		logger.Infof("Using timezone: %s", cfg.AppTimeZone)
	}

	// Initialize database
	db, err := database.Initialize(cfg)
	if err != nil {
		log.Fatal("Failed to initialize database:", err)
	}

	// Initialize leave allocations on startup
	logger.Info("Initializing leave allocations...")
	leaveService := services.NewLeaveService(db, logger)
	if err := leaveService.InitializeLeaveAllocations(); err != nil {
		logger.Errorf("Failed to initialize leave allocations: %v", err)
		// Don't fail the server startup, just log the error
	} else {
		logger.Info("Leave allocations initialized successfully")
	}

	// Set Gin mode
	gin.SetMode(cfg.GinMode)

	// Initialize Gin router
	router := gin.New()

	// Add middleware
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(middleware.RequestID())
	router.Use(middleware.Logger(logger))

	// CORS configuration with dynamic ngrok support
	router.Use(middleware.CORSMiddleware())

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"message": "Employee Dashboard API is running",
		})
	})

	// Swagger documentation endpoint
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// Setup routes
	routes.SetupRoutes(router, db, cfg, logger, appLocation)

	// Use port 8081 for API to avoid conflict with frontend
	logger.Infof("Starting server on port %s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
