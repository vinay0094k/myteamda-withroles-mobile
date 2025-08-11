package routes

import (
	"employee-dashboard-api/internal/config"
	"employee-dashboard-api/internal/handlers"
	"employee-dashboard-api/internal/middleware"
	"employee-dashboard-api/internal/services"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"gorm.io/gorm"
)

func SetupRoutes(router *gin.Engine, db *gorm.DB, config *config.Config, logger *logrus.Logger, location *time.Location) {
	// API version 1 group
	v1 := router.Group("/api/v1")

	docsUrl := ginSwagger.URL("http://localhost:8082/api/v1/swagger/doc.json") // Adjust this URL if your host or base path changes
	v1.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler, docsUrl))

	// Initialize S3 Service (add this block)
	var s3Service *services.S3Service
	var err error
	if config.AWSAccessKeyID != "" && config.AWSSecretAccessKey != "" && config.AWSS3BucketName != "" {
		s3Service, err = services.NewS3Service(config, logger)
		if err != nil {
			logger.Errorf("Failed to initialize S3 Service: %v", err)
			// Continue without S3 service, gallery images won't work
		}
	} else {
		logger.Warn("AWS S3 credentials not configured. Gallery image functionality will be limited.")
	}

	// Health check endpoint
	v1.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"message": "API v1 is running",
		})
	})

	// Auth routes
	authHandler := handlers.NewAuthHandler(db, config, logger)
	authGroup := v1.Group("/auth")
	{
		authGroup.POST("/register", authHandler.Register)
		authGroup.POST("/login", authHandler.Login)
		authGroup.POST("/logout", middleware.AuthMiddleware(config), authHandler.Logout)
		authGroup.GET("/me", middleware.AuthMiddleware(config), authHandler.GetCurrentUser)
		authGroup.POST("/send-signup-otp", authHandler.SendSignupOTP)
		authGroup.POST("/verify-signup-otp", authHandler.VerifySignupOTP)
		authGroup.POST("/complete-registration", authHandler.CompleteRegistration)

		// Admin routes for user management
		authGroup.GET("/pending-users", middleware.AuthMiddleware(config), middleware.RequireAdminRole(db), authHandler.GetPendingUsers)
		authGroup.POST("/approve-user/:id", middleware.AuthMiddleware(config), middleware.RequireAdminRole(db), authHandler.ApproveUser)
		authGroup.POST("/reject-user/:id", middleware.AuthMiddleware(config), middleware.RequireAdminRole(db), authHandler.RejectUser)
	}

	// User routes
	userHandler := handlers.NewUserHandler(db, config, logger)
	userGroup := v1.Group("/users")
	userGroup.Use(middleware.AuthMiddleware(config))
	{
		userGroup.GET("/profile", userHandler.GetProfile)
		userGroup.PUT("/profile", userHandler.UpdateProfile)
		userGroup.PUT("/password", userHandler.ChangePassword)
		userGroup.GET("/", middleware.RequireAdminRole(db), userHandler.GetUsers) // Admin only
	}

	// Leave routes
	leaveHandler := handlers.NewLeaveHandler(db, config, logger)
	leaveGroup := v1.Group("/leaves")
	leaveGroup.Use(middleware.AuthMiddleware(config))
	{
		leaveGroup.GET("/", leaveHandler.GetLeaves)
		leaveGroup.POST("/", leaveHandler.CreateLeave)
		leaveGroup.GET("/balance", leaveHandler.GetLeaveBalance)
		leaveGroup.GET("/types", leaveHandler.GetLeaveTypes)
	}

	// Admin leave routes
	adminLeaveGroup := v1.Group("/admin/leaves")
	adminLeaveGroup.Use(middleware.AuthMiddleware(config))
	adminLeaveGroup.Use(middleware.RequireAdminRole(db))
	{
		adminLeaveGroup.GET("/", leaveHandler.GetAllLeaves)
		adminLeaveGroup.PUT("/:id/approve", leaveHandler.ApproveLeave)
		adminLeaveGroup.PUT("/:id/reject", leaveHandler.RejectLeave)
		adminLeaveGroup.GET("/dashboard-stats", leaveHandler.GetDashboardStats)
		adminLeaveGroup.GET("/team-balances", leaveHandler.GetTeamLeaveBalances)
		adminLeaveGroup.GET("/employee/:userId", leaveHandler.GetEmployeeLeaves)
	}

	// Leave allocation routes (admin only)
	leaveAllocationHandler := handlers.NewLeaveAllocationHandler(db, config, logger)
	leaveAllocationGroup := v1.Group("/leave-allocations")
	leaveAllocationGroup.Use(middleware.AuthMiddleware(config))
	leaveAllocationGroup.Use(middleware.RequireAdminRole(db))
	{
		leaveAllocationGroup.POST("/initialize", leaveAllocationHandler.InitializeLeaveAllocations)
		leaveAllocationGroup.POST("/load-csv", leaveAllocationHandler.LoadLeaveAllocations)
		leaveAllocationGroup.GET("/monthly-info", leaveAllocationHandler.GetMonthlyAllocation)
	}

	// Timesheet routes
	timesheetHandler := handlers.NewTimesheetHandler(db, config, logger, location)
	timesheetGroup := v1.Group("/timesheets")
	timesheetGroup.Use(middleware.AuthMiddleware(config))
	{
		timesheetGroup.POST("/", timesheetHandler.CreateTimesheet)
		timesheetGroup.GET("/", timesheetHandler.GetTimesheets)
		timesheetGroup.GET("/summary", timesheetHandler.GetTimesheetSummary)
		timesheetGroup.PUT("/:id", timesheetHandler.UpdateTimesheet)
		timesheetGroup.DELETE("/:id", timesheetHandler.DeleteTimesheet)
		timesheetGroup.POST("/submit", timesheetHandler.SubmitTimesheet)

		// New download endpoints for admin functionality
		timesheetGroup.GET("/download/:id", timesheetHandler.DownloadTimesheetEntry)
		// timesheetGroup.GET("/download-bulk", timesheetHandler.DownloadTimesheetsBulk)
		timesheetGroup.GET("/download-bulk", middleware.RequireManagerRole(db), timesheetHandler.DownloadTimesheetsBulk)
	}

	// Event routes
	eventHandler := handlers.NewEventHandler(db, config, logger, location)
	eventGroup := v1.Group("/events")
	eventGroup.Use(middleware.AuthMiddleware(config))
	{
		eventGroup.GET("/", eventHandler.GetEvents)
		eventGroup.GET("/birthdays", eventHandler.GetBirthdays)
		eventGroup.GET("/anniversaries", eventHandler.GetAnniversaries)
		eventGroup.GET("/holidays", eventHandler.GetHolidays)
	}

	// Holiday routes (separate from events for public access)
	holidayHandler := handlers.NewHolidayHandler(db, config, logger, location)
	holidayGroup := v1.Group("/holidays")
	{
		holidayGroup.GET("/year", holidayHandler.GetHolidaysByYear)
		holidayGroup.GET("/upcoming", holidayHandler.GetUpcomingHolidays)
	}

	// News routes
	newsHandler := handlers.NewNewsHandler(db, config, logger)
	newsGroup := v1.Group("/news")
	newsGroup.Use(middleware.AuthMiddleware(config))
	{
		newsGroup.GET("/", newsHandler.GetNews)
		newsGroup.GET("/company", newsHandler.GetCompanyNews)
	}

	// RSS routes
	rssHandler := handlers.NewRSSNewsHandler(db, config, logger)
	rssGroup := v1.Group("/rss")
	rssGroup.Use(middleware.AuthMiddleware(config))
	{
		rssGroup.GET("/latest", rssHandler.GetLatestNews)
		rssGroup.GET("/news", rssHandler.GetNewsByCategory)
		rssGroup.GET("/categories", rssHandler.GetCategories)
		rssGroup.POST("/refresh", middleware.RequireAdminRole(db), rssHandler.RefreshFeeds)
	}

	// Document routes
	documentHandler := handlers.NewDocumentHandler(db, config, logger)
	documentGroup := v1.Group("/documents")
	documentGroup.Use(middleware.AuthMiddleware(config))
	{
		documentGroup.GET("/", documentHandler.GetDocuments)
		documentGroup.POST("/upload", documentHandler.UploadDocument)
	}

	// Learning routes
	learningHandler := handlers.NewLearningHandler(db, config, logger, location)
	learningGroup := v1.Group("/learning")
	learningGroup.Use(middleware.AuthMiddleware(config))
	{
		learningGroup.GET("/sessions", learningHandler.GetSessions)
	}

	// Sports routes
	sportsHandler := handlers.NewSportsHandler(db, config, logger)
	sportsGroup := v1.Group("/sports")
	sportsGroup.Use(middleware.AuthMiddleware(config))
	{
		sportsGroup.GET("/events", sportsHandler.GetSportsEvents)
		sportsGroup.GET("/facilities", sportsHandler.GetSportsFacilities)

	}

	// Gallery routes
	galleryHandler := handlers.NewGalleryHandler(db, s3Service, config, logger)
	galleryGroup := v1.Group("/gallery")
	galleryGroup.Use(middleware.AuthMiddleware(config))
	{
		galleryGroup.GET("/images", galleryHandler.GetGalleryImages)
	}

	// Project routes
	projectHandler := handlers.NewProjectHandler(db, config, logger)
	projectGroup := v1.Group("/projects")
	projectGroup.Use(middleware.AuthMiddleware(config))
	{
		projectGroup.GET("/", projectHandler.GetProjects)
	}

	// Policy routes
	policyHandler := handlers.NewPolicyHandler(db, config, logger, s3Service)

	policyGroup := v1.Group("/policies")
	policyGroup.Use(middleware.AuthMiddleware(config))
	{
		policyGroup.GET("/", policyHandler.GetPolicies)
		policyGroup.GET("/:id", policyHandler.GetPolicy)
	}
}
