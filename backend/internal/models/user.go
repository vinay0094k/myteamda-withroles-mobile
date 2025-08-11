package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserRole string

const (
	RoleAdmin    UserRole = "admin"
	RoleHR       UserRole = "hr"
	RoleManager  UserRole = "manager"
	RoleTeamLead UserRole = "team-lead"
	RoleEmployee UserRole = "employee"
)

type ApprovalStatus string

const (
	StatusPending  ApprovalStatus = "pending"
	StatusApproved ApprovalStatus = "approved"
	StatusRejected ApprovalStatus = "rejected"
)

type User struct {
	ID              uuid.UUID      `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()" example:"a1b2c3d4-e5f6-7890-1234-567890abcdef"`
	EmployeeID      string         `json:"employee_id" gorm:"uniqueIndex;not null" example:"EMP001"`
	Email           string         `json:"email" gorm:"uniqueIndex;not null" example:"john.doe@example.com"`
	PasswordHash    string         `json:"-" gorm:"not null"` // Exclude from JSON output
	FirstName       string         `json:"first_name" gorm:"not null" example:"John"`
	LastName        string         `json:"last_name" gorm:"not null" example:"Doe"`
	Phone           *string        `json:"phone" example:"+1234567890"`
	Department      *string        `json:"department" example:"Engineering"`
	Position        *string        `json:"position" example:"Software Engineer"`
	ManagerID       *uuid.UUID     `json:"manager_id" example:"b2c3d4e5-f6a7-8901-2345-67890abcdef0"`
	Manager         *User          `json:"manager,omitempty" gorm:"foreignKey:ManagerID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL"` // Omit for brevity in example
	HireDate        *time.Time     `json:"hire_date" example:"2022-01-15T00:00:00Z"`
	EmploymentType  string         `json:"employment_type" gorm:"default:full-time" example:"full-time"`
	Status          string         `json:"status" gorm:"default:active" example:"active"`
	ProfileImageURL *string        `json:"profile_image_url" example:"https://example.com/profile.jpg"`
	Bio             *string        `json:"bio" example:"Experienced software engineer with a passion for backend development."`
	Skills          *string        `json:"skills" example:"Go, PostgreSQL, Docker, Kubernetes"`
	Languages       *string        `json:"languages" example:"English, Hindi"`
	Role            UserRole       `json:"role" gorm:"type:varchar(20);default:employee;not null" example:"employee"`
	ApprovalStatus  ApprovalStatus `json:"approval_status" gorm:"type:varchar(20);default:pending;not null" example:"approved"`
	ApprovedBy      *uuid.UUID     `json:"approved_by" example:"c3d4e5f6-a7b8-9012-3456-7890abcdef01"`
	Approver        *User          `json:"approver,omitempty" gorm:"foreignKey:ApprovedBy;constraint:OnUpdate:CASCADE,OnDelete:SET NULL"` // Omit for brevity
	ApprovedAt      *time.Time     `json:"approved_at" example:"2023-01-01T10:00:00Z"`
	RejectionReason *string        `json:"rejection_reason" example:"Duplicate employee ID"`
	IsAnonymous     bool           `json:"is_anonymous" gorm:"default:false" example:"false"`
	CreatedAt       time.Time      `json:"created_at" example:"2022-12-01T10:00:00Z"`
	UpdatedAt       time.Time      `json:"updated_at" example:"2023-01-01T10:00:00Z"`
}

type Department struct {
	ID          uuid.UUID  `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name        string     `json:"name" gorm:"not null"`
	Description *string    `json:"description"`
	ManagerID   *uuid.UUID `json:"manager_id"`
	Manager     *User      `json:"manager,omitempty" gorm:"foreignKey:ManagerID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL"`
	CreatedAt   time.Time  `json:"created_at"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}
