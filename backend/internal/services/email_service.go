package services

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"net/smtp"
	"time"

	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type EmailService struct {
	db     *gorm.DB
	logger *logrus.Logger
	config EmailConfig
}

type EmailConfig struct {
	SMTPHost     string
	SMTPPort     string
	SMTPUsername string
	SMTPPassword string
	FromEmail    string
	FromName     string
}

type OTPRecord struct {
	ID        uint      `gorm:"primaryKey"`
	Email     string    `gorm:"not null;index"`
	OTP       string    `gorm:"not null"`
	Purpose   string    `gorm:"not null"`  // signup, password_reset, etc.
	UserData  string    `gorm:"type:text"` // JSON string to store temporary user data
	ExpiresAt time.Time `gorm:"not null"`
	Used      bool      `gorm:"default:false"`
	CreatedAt time.Time
}

func NewEmailService(db *gorm.DB, logger *logrus.Logger, config EmailConfig) *EmailService {
	// Auto-migrate OTP table
	db.AutoMigrate(&OTPRecord{})

	return &EmailService{
		db:     db,
		logger: logger,
		config: config,
	}
}

func (s *EmailService) GenerateOTP() string {
	// Generate 6-digit OTP
	max := big.NewInt(999999)
	min := big.NewInt(100000)

	n, err := rand.Int(rand.Reader, max.Sub(max, min).Add(max, big.NewInt(1)))
	if err != nil {
		s.logger.Errorf("Failed to generate OTP: %v", err)
		return "123456" // Fallback for development
	}

	return fmt.Sprintf("%06d", n.Add(n, min).Int64())
}

func (s *EmailService) SendSignupOTP(email string) error {
	// Generate OTP
	otp := s.GenerateOTP()

	// Store OTP in database
	otpRecord := OTPRecord{
		Email:     email,
		OTP:       otp,
		Purpose:   "signup",
		ExpiresAt: time.Now().Add(10 * time.Minute), // 10 minutes expiry
		Used:      false,
	}

	if err := s.db.Create(&otpRecord).Error; err != nil {
		s.logger.Errorf("Failed to store OTP: %v", err)
		return fmt.Errorf("failed to store OTP: %w", err)
	}

	// Send email
	subject := "Verify Your teamDa Account"
	body := fmt.Sprintf(`
Dear User,

Welcome to teamDa! Please use the following OTP to verify your email address:

OTP: %s

This OTP will expire in 10 minutes.

If you didn't request this verification, please ignore this email.

Best regards,
teamDa Team
`, otp)

	if err := s.sendEmail(email, subject, body); err != nil {
		s.logger.Errorf("Failed to send OTP email: %v", err)
		return fmt.Errorf("failed to send OTP email: %w", err)
	}

	s.logger.Infof("OTP sent successfully to %s", email)
	return nil
}

func (s *EmailService) VerifyOTP(email, otp, purpose string) error {
	var otpRecord OTPRecord

	// Find valid OTP
	if err := s.db.Where("email = ? AND otp = ? AND purpose = ? AND used = false AND expires_at > ?",
		email, otp, purpose, time.Now()).First(&otpRecord).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("invalid or expired OTP")
		}
		return fmt.Errorf("failed to verify OTP: %w", err)
	}

	// Mark OTP as used
	if err := s.db.Model(&otpRecord).Update("used", true).Error; err != nil {
		s.logger.Errorf("Failed to mark OTP as used: %v", err)
		return fmt.Errorf("failed to mark OTP as used: %w", err)
	}

	s.logger.Infof("OTP verified successfully for %s", email)
	return nil
}

func (s *EmailService) sendEmail(to, subject, body string) error {
	// SMTP configuration
	auth := smtp.PlainAuth("", s.config.SMTPUsername, s.config.SMTPPassword, s.config.SMTPHost)

	// Email headers and body
	msg := fmt.Sprintf("From: %s <%s>\r\n", s.config.FromName, s.config.FromEmail)
	msg += fmt.Sprintf("To: %s\r\n", to)
	msg += fmt.Sprintf("Subject: %s\r\n", subject)
	msg += "Content-Type: text/plain; charset=UTF-8\r\n"
	msg += "\r\n"
	msg += body

	// Send email
	addr := fmt.Sprintf("%s:%s", s.config.SMTPHost, s.config.SMTPPort)
	if err := smtp.SendMail(addr, auth, s.config.FromEmail, []string{to}, []byte(msg)); err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}

func (s *EmailService) CleanupExpiredOTPs() {
	// Clean up expired OTPs (run this periodically)
	result := s.db.Where("expires_at < ?", time.Now()).Delete(&OTPRecord{})
	if result.Error != nil {
		s.logger.Errorf("Failed to cleanup expired OTPs: %v", result.Error)
	} else if result.RowsAffected > 0 {
		s.logger.Infof("Cleaned up %d expired OTPs", result.RowsAffected)
	}
}
