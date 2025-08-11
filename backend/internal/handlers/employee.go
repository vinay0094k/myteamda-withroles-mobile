package handlers

import (
	"employee-dashboard-api/internal/config"
	"employee-dashboard-api/internal/services"
	"employee-dashboard-api/internal/utils"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type EmployeeHandler struct {
	db              *gorm.DB
	config          *config.Config
	logger          *logrus.Logger
	employeeService *services.EmployeeService
}

func NewEmployeeHandler(db *gorm.DB, cfg *config.Config, logger *logrus.Logger) *EmployeeHandler {
	employeeService := services.NewEmployeeService(db, logger, cfg)
	return &EmployeeHandler{
		db:              db,
		config:          cfg,
		logger:          logger,
		employeeService: employeeService,
	}
}

func (h *EmployeeHandler) LoadEmployeeData(c *gin.Context) {
	if err := h.employeeService.LoadEmployeesFromCSV("sample_employees.csv"); err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Employee data loaded successfully", nil)
}

func (h *EmployeeHandler) InitializeEmployeeData(c *gin.Context) {
	if err := h.employeeService.InitializeEmployeeData(); err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Employee data initialized successfully", nil)
}
