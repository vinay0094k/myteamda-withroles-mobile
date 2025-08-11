# Employee Dashboard API

A comprehensive REST API for the Employee Dashboard mobile application built with Go, Gin, and PostgreSQL.

## Features

- 🔐 User authentication (register, login, logout) with optional anonymous support
- JWT-based authorization
- 🔄 API versioning (v1, v2, etc.)
- 👤 Anonymous user support (configurable)
- PostgreSQL database with GORM
- RESTful API design
- 🌐 CORS middleware
- 📝 Comprehensive logging for development
- ⚙️ Environment-based configuration
- 🛡️ Proper HTTP status codes and error handling
- 🔍 Request ID tracking

## Quick Start

### Prerequisites

- Go 1.21 or higher
- PostgreSQL 12 or higher
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd backend
```

2. Install dependencies:
```bash
go mod download
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Create PostgreSQL database:
```sql
CREATE DATABASE employee_dashboard;
```

5. Run the application:
```bash
go run main.go
```

The API will be available at `http://localhost:8080`

## Environment Configuration

Copy `.env.example` to `.env` and configure the following variables:

### Database Configuration
- `DB_HOST`: PostgreSQL host (default: localhost)
- `DB_PORT`: PostgreSQL port (default: 5432)
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password
- `DB_NAME`: Database name
- `DB_SSLMODE`: SSL mode (default: disable)

### Server Configuration
- `PORT`: Server port (default: 8080)
- `GIN_MODE`: Gin mode (debug, release, test)

### JWT Configuration
- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_EXPIRY_HOURS`: Token expiry time in hours (default: 24)

### CORS Configuration
- `CORS_ALLOWED_ORIGINS`: Comma-separated list of allowed origins
- `CORS_ALLOWED_METHODS`: Comma-separated list of allowed HTTP methods
- `CORS_ALLOWED_HEADERS`: Comma-separated list of allowed headers

### Features
- `ALLOW_ANONYMOUS_USERS`: Enable anonymous user access (default: true)

### File Upload
- `MAX_UPLOAD_SIZE`: Maximum file upload size in bytes (default: 10MB)
- `UPLOAD_PATH`: Directory for uploaded files (default: ./uploads)

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/me` - Get current user info

### User Management
- `GET /api/v1/users/profile` - Get user profile
- `PUT /api/v1/users/profile` - Update user profile
- `PUT /api/v1/users/password` - Change password
- `GET /api/v1/users/:id/assets` - Get user assets

### Leave Management
- `GET /api/v1/leaves` - Get user leaves
- `POST /api/v1/leaves` - Apply for leave
- `PUT /api/v1/leaves/:id` - Update leave application
- `DELETE /api/v1/leaves/:id` - Cancel leave application
- `GET /api/v1/leaves/balance` - Get leave balance
- `GET /api/v1/leaves/types` - Get leave types

### Timesheet Management
- `GET /api/v1/timesheets` - Get timesheet entries
- `POST /api/v1/timesheets` - Create time entry
- `PUT /api/v1/timesheets/:id` - Update time entry
- `DELETE /api/v1/timesheets/:id` - Delete time entry
- `POST /api/v1/timesheets/submit` - Submit timesheet
- `GET /api/v1/timesheets/summary` - Get timesheet summary

### Calendar & Events
- `GET /api/v1/events` - Get calendar events
- `GET /api/v1/events/birthdays` - Get birthday events
- `GET /api/v1/events/anniversaries` - Get work anniversaries
- `GET /api/v1/events/holidays` - Get holidays

### Document Management
- `GET /api/v1/documents` - Get user documents
- `POST /api/v1/documents/upload` - Upload document
- `DELETE /api/v1/documents/:id` - Delete document
- `GET /api/v1/documents/:id/download` - Download document
- `GET /api/v1/documents/categories` - Get document categories

### News & Announcements
- `GET /api/v1/news` - Get latest news
- `GET /api/v1/news/company` - Get company news
- `GET /api/v1/announcements` - Get announcements

### Learning & Development
- `GET /api/v1/learning/sessions` - Get learning sessions
- `POST /api/v1/learning/enroll` - Enroll in session
- `GET /api/v1/learning/topics` - Get topics

### Sports & Activities
- `GET /api/v1/sports/events` - Get sports events
- `GET /api/v1/sports/facilities` - Get facilities

### Policies
- `GET /api/v1/policies` - Get company policies
- `GET /api/v1/policies/:id` - Get specific policy

## Database Schema

The API uses PostgreSQL with the following main tables:

- `users` - User accounts and profiles
- `departments` - Company departments
- `leave_types` - Types of leave available
- `leave_applications` - Leave requests
- `leave_balances` - User leave balances
- `projects` - Company projects
- `timesheet_entries` - Time tracking entries
- `events` - Calendar events
- `documents` - User documents
- `assets` - Company assets
- `news` - News and announcements
- `learning_sessions` - Training sessions
- `learning_enrollments` - Session enrollments
- `sports_events` - Sports events
- `sports_facilities` - Sports facilities
- `policies` - Company policies
- `notifications` - User notifications

## Authentication & Authorization

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Anonymous Users

When `ALLOW_ANONYMOUS_USERS` is enabled, some endpoints can be accessed without authentication. Anonymous users have limited access to public content.

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message",
  "request_id": "unique-request-id"
}
```

## Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "message": "Success message",
  "data": { ... },
  "request_id": "unique-request-id"
}
```

## Development

### Running in Development Mode

```bash
export GIN_MODE=debug
go run main.go
```

### Building for Production

```bash
go build -o employee-dashboard-api main.go
```

### Database Migrations

The application automatically runs database migrations on startup using GORM's AutoMigrate feature.

## Logging

The API includes comprehensive logging with request IDs for tracing. Logs include:

- Request/response details
- Database operations
- Error tracking
- Performance metrics

## File Uploads

The API supports file uploads for documents with:

- Configurable file size limits
- Secure file storage
- MIME type validation
- User-specific directories

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.