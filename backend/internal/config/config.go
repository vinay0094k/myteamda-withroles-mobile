package config

import (
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	// Database
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string

	// Server
	Port    string
	GinMode string

	// JWT
	JWTSecret      string
	JWTExpiryHours int

	// CORS
	CORSAllowedOrigins []string
	CORSAllowedMethods []string
	CORSAllowedHeaders []string

	// Features
	AllowAnonymousUsers bool

	// File Upload
	MaxUploadSize int64
	UploadPath    string

	// Logging
	LogLevel  string
	LogFormat string

	// Email Configuration
	SMTPHost      string
	SMTPPort      int
	SMTPPortStr   string
	SMTPUsername  string
	SMTPPassword  string
	SMTPFromEmail string
	SMTPFromName  string

	// Timezone Configuration
	AppTimeZone string
	UseUTC      bool

	// AWS SDK Configuration
	AWSRegion                    string
	AWSAccessKeyID               string
	AWSSecretAccessKey           string
	AWSS3BucketName              string
	AWSPresignedURLExpiryMinutes int

	// For Passwords storing
	UserPlainPasswords bool
}

func Load() *Config {
	// Load .env file if it exists
	godotenv.Load()

	cfg := &Config{
		// Database defaults
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "password"),
		DBName:     getEnv("DB_NAME", "employee_dashboard"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),

		// Server defaults
		Port:    getEnv("PORT", "8082"),
		GinMode: getEnv("GIN_MODE", "debug"),

		// JWT defaults
		JWTSecret:      getEnv("JWT_SECRET", "your-super-secret-jwt-key"),
		JWTExpiryHours: getEnvAsInt("JWT_EXPIRY_HOURS", 24),

		// CORS defaults
		CORSAllowedOrigins: strings.Split(getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173"), ","),
		CORSAllowedMethods: strings.Split(getEnv("CORS_ALLOWED_METHODS", "GET,POST,PUT,DELETE,OPTIONS"), ","),
		CORSAllowedHeaders: strings.Split(getEnv("CORS_ALLOWED_HEADERS", "Origin,Content-Type,Accept,Authorization,X-Requested-With"), ","),

		// Features
		AllowAnonymousUsers: getEnvAsBool("ALLOW_ANONYMOUS_USERS", true),

		// File Upload
		MaxUploadSize: getEnvAsInt64("MAX_UPLOAD_SIZE", 10485760), // 10MB
		UploadPath:    getEnv("UPLOAD_PATH", "./uploads"),

		// Logging
		LogLevel:  getEnv("LOG_LEVEL", "debug"),
		LogFormat: getEnv("LOG_FORMAT", "text"),

		// Email Configuration
		SMTPHost:      getEnv("SMTP_HOST", "sandbox.smtp.mailtrap.io"),
		SMTPPort:      getEnvAsInt("SMTP_PORT", 587),
		SMTPPortStr:   getEnv("SMTP_PORT", "587"),
		SMTPUsername:  getEnv("SMTP_USERNAME", ""),
		SMTPPassword:  getEnv("SMTP_PASSWORD", ""),
		SMTPFromEmail: getEnv("SMTP_FROM_EMAIL", "noreply@teamda.com"),
		SMTPFromName:  getEnv("SMTP_FROM_NAME", "teamDa"),

		// Timezone Configuration
		AppTimeZone: getEnv("APP_TIMEZONE", "Asia/Kolkata"),
		UseUTC:      getEnvAsBool("USE_UTC", false),

		// AWS Configuration
		AWSRegion:                    getEnv("AWS_REGION", "us-east-1"),
		AWSAccessKeyID:               getEnv("AWS_ACCESS_KEY_ID", ""),
		AWSSecretAccessKey:           getEnv("AWS_SECRET_ACCESS_KEY", ""),
		AWSS3BucketName:              getEnv("AWS_S3_BUCKET_NAME", ""),
		AWSPresignedURLExpiryMinutes: getEnvAsInt("AWS_PRESIGNED_URL_EXPIRY_MINUTES", 15),

		//Load Password Config
		UserPlainPasswords: getEnvAsBool("USER_PLAIN_PASSWORDS", false), //Default its false (means storing the passwords in hash format)
	}

	return cfg
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvAsInt64(key string, defaultValue int64) int64 {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.ParseInt(value, 10, 64); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvAsBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}
