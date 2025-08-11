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

type LeaveAllocationHandler struct {
	db           *gorm.DB
	config       *config.Config
	logger       *logrus.Logger
	leaveService *services.LeaveService
}

func NewLeaveAllocationHandler(db *gorm.DB, cfg *config.Config, logger *logrus.Logger) *LeaveAllocationHandler {
	leaveService := services.NewLeaveService(db, logger)
	return &LeaveAllocationHandler{
		db:           db,
		config:       cfg,
		logger:       logger,
		leaveService: leaveService,
	}
}

func (h *LeaveAllocationHandler) LoadLeaveAllocations(c *gin.Context) {
	if err := h.leaveService.LoadLeaveAllocationsFromCSV("leave_allocations.csv"); err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Leave allocations loaded successfully", nil)
}

func (h *LeaveAllocationHandler) InitializeLeaveAllocations(c *gin.Context) {
	if err := h.leaveService.InitializeLeaveAllocations(); err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Leave allocations initialized successfully", nil)
}

func (h *LeaveAllocationHandler) GetMonthlyAllocation(c *gin.Context) {
	monthlyAllocation := h.leaveService.GetMonthlyLeaveAllocation()
	annualAllocation := h.leaveService.CalculateAnnualAllocation()

	response := gin.H{
		"monthly_allocation": monthlyAllocation,
		"annual_allocation":  annualAllocation,
		"description":        "Each employee gets 2 leaves per month (24 per year)",
	}

	utils.SuccessResponse(c, http.StatusOK, "Leave allocation info retrieved", response)
}
