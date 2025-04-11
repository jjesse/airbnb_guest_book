# Airbnb Guest Book

A simple web-based guest book application for Airbnb hosts.

![Airbnb Guest Book Overview](assets/overview.png)

## Features

- Web-based guest book form
- Collect guest information (Name, Visiting From, Comments)
- Track repeat guests
- Display all guest entries
- Dockerize deployment
- MongoDB database for persistent storage

## Setup

1. Install dependencies:

```bash
npm install
```

2. Run with Docker Compose:

```bash
docker-compose up --build
```

Access the application at <http://localhost:3000>

## Docker Setup

The application is containerized using Docker and can be run using Docker Compose:

```bash
# Build and start containers
docker-compose up --build

# Stop containers
docker-compose down

# View logs
docker-compose logs -f
```

### Volume Persistence

- MongoDB data: Stored in named volume `mongodb_data`
- Uploads: Stored in named volume `uploads`
- Backups: Stored in local `./backups` directory

### Security Features

- Non-root user execution
- Production hardening
- Volume permission management
- Container restart policies
- Environment variable isolation

## Development

To run MongoDB locally without Docker:

1. Install MongoDB
2. Start MongoDB service
3. Run `npm install && npm start`

## Security

- Application runs as non-root user in Docker
- Uses Node.js LTS Alpine-based image
- Production environment configurations
- Minimal npm dependencies
- JWT-based host authentication
- CSRF protection for all forms
- Rate limiting (100 requests per 15 minutes)
- Protected entry deletion
- File upload validation (5MB limit, image files only)
- Security headers (helmet)
- Comprehensive error handling
- Input sanitization and validation

### Host Authentication

```bash
POST /api/login
Content-Type: application/json

{
    "username": "host",
    "password": "your-password"
}
```

### Protected Endpoints

- Delete entry: `DELETE /api/entries/:id` (requires authentication)

## Backup and Restore

### Manual Backup

```bash
npm run backup
```

### API Endpoints

- Create backup: `POST /api/backup`
- Restore backup: `POST /api/restore/:filename`

Backups are stored in the `backups` directory.

## Documentation

- [API Documentation](docs/API.md)
- [Developer Setup Guide](docs/SETUP.md)
- [Contributing Guidelines](docs/CONTRIBUTING.md)

## TODO List

1. Data Persistence -- Complete
   - Add MongoDB or SQLite database to persist guest entries
   - Implement backup/restore functionality

2. Security & Authentication -- Complete
   - Add host authentication to protect entry deletion
   - Add CSRF protection for forms
   - Add rate limiting for submissions

3. Enhanced Features -- Complete
   - Add entry deletion capability
   - Add photo upload support
   - Add date range filtering for entries
   - Add search functionality
   - Add email notifications for new entries

4. UI/UX Improvements -- Complete
   - Add proper form validation
   - Add loading states
   - Add success/error messages
   - Improve mobile responsiveness
   - Add dark mode support

5. Development Improvements -- Complete
   - Add TypeScript support
   - Add unit tests
   - Add development environment variables
   - Add input sanitization

6. Documentation -- Complete
   - Add API documentation
   - Add developer setup guide
   - Add contribution guidelines

7. Monitoring & Logging -- In Progress
   - Add application logging
   - Add performance monitoring
   - Add error tracking
   - Add audit logging for security events
   - Add health check endpoints

8. CI/CD Pipeline
   - Add GitHub Actions workflow
   - Add automated testing
   - Add Docker image publishing
   - Add deployment automation
   - Add version management

9. Performance Optimization
   - Add response caching
   - Add database indexing
   - Add image optimization
   - Add pagination for entries
   - Add API rate limiting by user

10. Accessibility
    - Add ARIA labels
    - Add keyboard navigation
    - Add screen reader support
    - Add high contrast mode
    - Add font size controls

11. Internationalization
    - Add language selection
    - Add translation system
    - Add RTL support
    - Add date/time localization
    - Add number formatting

12. Analytics & Reporting
    - Use number of days from guest log to calculate how manys days our Airbnb was booked.
    - Add visitor analytics
    - Add entry statistics
    - Add usage reports
    - Add export functionality
    - Add dashboard for hosts

13. Code Quality & Maintenance
    - Add ESLint configuration
    - Add Prettier for code formatting
    - Add Git hooks (husky)
    - Add TypeScript strict mode
    - Add code coverage requirements

14. Testing Improvements
    - Add integration tests
    - Add E2E tests with Cypress
    - Add API contract tests
    - Add load testing
    - Add security testing (SAST/DAST)

15. Infrastructure & DevOps
    - Add infrastructure as code (Terraform)
    - Add container orchestration (K8s)
    - Add service mesh
    - Add backup rotation policy
    - Add disaster recovery plan

16. Security Enhancements
    - Add 2FA authentication
    - Add OAuth provider support
    - Add session management
    - Add API key management
    - Add security headers configuration

17. API Improvements
    - Add API versioning
    - Add OpenAPI/Swagger docs
    - Add GraphQL support
    - Add WebSocket for real-time updates
    - Add API throttling

18. User Experience
    - Add rich text editor for comments
    - Add image gallery view
    - Add guest profile pages
    - Add email templates
    - Add mobile app support

***
