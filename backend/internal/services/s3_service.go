package services

import (
	"employee-dashboard-api/internal/config"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/sirupsen/logrus"
)

type S3Service struct {
	s3Client   *s3.S3
	bucketName string
	urlExpiry  time.Duration
	logger     *logrus.Logger
}

// NewS3Service initializes S3 and presign clients.
func NewS3Service(
	cfg *config.Config,
	logger *logrus.Logger) (*S3Service, error) {
	if cfg.AWSAccessKeyID == "" || cfg.AWSSecretAccessKey == "" || cfg.AWSS3BucketName == "" {
		return nil, fmt.Errorf("AWS credentials or bucket name not configured")
	}

	// awsCfg, err := config.LoadDefaultConfig(context.TODO(),
	// 	config.WithRegion(cfg.AWSRegion),
	// 	config.WithCredentialsProvider(
	// 		credentials.NewStaticCredentialsProvider(
	// 			cfg.AWSAccessKeyID,
	// 			cfg.AWSSecretAccessKey,
	// 			"", // session token, if any
	// 		),
	// 	),
	// )
	//Create a new AWS session
	sess, err := session.NewSession(&aws.Config{
		Region: aws.String(cfg.AWSRegion),
	})

	if err != nil {
		return nil, fmt.Errorf("failed to load AWS SDK config: %w", err)
	}

	// Create S3 Service client
	s3Client := s3.New(sess)

	return &S3Service{
		s3Client:   s3Client,
		bucketName: cfg.AWSS3BucketName,
		urlExpiry:  time.Duration(cfg.AWSPresignedURLExpiryMinutes) * time.Minute,
		logger:     logger,
	}, nil
}

// GetPresignedURL func generates a pre-signed URL for a given S3 object key
func (s *S3Service) GetPresignedURL(s3Key string) (string, error) {
	// Create a GetObject request
	req, _ := s.s3Client.GetObjectRequest(&s3.GetObjectInput{
		Bucket: aws.String(s.bucketName),
		Key:    aws.String(s3Key),
	})

	// Pre-sign the request with the specified expiration
	urlStr, err := req.Presign(s.urlExpiry)
	if err != nil {
		s.logger.Errorf("failed to presign URL for %s: %v", s3Key, err)
		return "", fmt.Errorf("failed to pre-sign URL for %s: %w", s3Key, err)
	}

	return urlStr, nil
}

//
// /////////////////////////////////////////// without presign URL thing ///////////////////////////////////////////////////////////////////////
// backend/internal/services/s3_service.go
// package services

// import (
// 	"context"
// 	"fmt"

// 	"employee-dashboard-api/internal/config"

// 	awsConfig "github.com/aws/aws-sdk-go-v2/config"
// 	"github.com/aws/aws-sdk-go-v2/credentials"
// 	"github.com/aws/aws-sdk-go-v2/service/s3"
// 	"github.com/sirupsen/logrus"
// )

// type S3Service struct {
// 	s3Client   *s3.Client
// 	bucketName string
// 	awsRegion  string // Added for direct URL construction
// 	logger     *logrus.Logger
// }

// // NewS3Service initializes the S3 client without presign
// func NewS3Service(cfg *config.Config, logger *logrus.Logger) (*S3Service, error) {
// 	if cfg.AWSAccessKeyID == "" || cfg.AWSSecretAccessKey == "" || cfg.AWSS3BucketName == "" {
// 		return nil, fmt.Errorf("AWS credentials or bucket name not configured")
// 	}

// 	awsCfg, err := awsConfig.LoadDefaultConfig(context.TODO(),
// 		awsConfig.WithRegion(cfg.AWSRegion),
// 		awsConfig.WithCredentialsProvider(
// 			credentials.NewStaticCredentialsProvider(
// 				cfg.AWSAccessKeyID,
// 				cfg.AWSSecretAccessKey,
// 				"",
// 			),
// 		),
// 	)
// 	if err != nil {
// 		return nil, fmt.Errorf("failed to load AWS SDK config: %w", err)
// 	}

// 	s3Client := s3.NewFromConfig(awsCfg)

// 	return &S3Service{
// 		s3Client:   s3Client,
// 		bucketName: cfg.AWSS3BucketName,
// 		awsRegion:  cfg.AWSRegion,
// 		logger:     logger,
// 	}, nil
// }

// // GetDirectS3URL constructs a public S3 URL
// func (s *S3Service) GetDirectS3URL(s3Key string) string {
// 	// https://<bucket>.s3.<region>.amazonaws.com/<key>
// 	return fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", s.bucketName, s.awsRegion, s3Key)
// }
