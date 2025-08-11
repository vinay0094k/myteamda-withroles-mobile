package handlers

import (
	"employee-dashboard-api/internal/config"
	"employee-dashboard-api/internal/models"
	"employee-dashboard-api/internal/services"
	"employee-dashboard-api/internal/utils"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type ProjectHandler struct {
	db             *gorm.DB
	config         *config.Config
	logger         *logrus.Logger
	projectService *services.ProjectService
}

func NewProjectHandler(db *gorm.DB, cfg *config.Config, logger *logrus.Logger) *ProjectHandler {
	projectService := services.NewProjectService(db, logger)
	return &ProjectHandler{
		db:             db,
		config:         cfg,
		logger:         logger,
		projectService: projectService,
	}
}

func (h *ProjectHandler) GetProjects(c *gin.Context) {
	var projects []models.Project
	if err := h.db.Where("status = ?", "active").Order("name ASC").Find(&projects).Error; err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Projects retrieved successfully", projects)
}

func (h *ProjectHandler) InitializeProjects(c *gin.Context) {
	if err := h.projectService.InitializeDefaultProjects(); err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Projects initialized successfully", nil)
}
