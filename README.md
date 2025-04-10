# Airbnb Guest Book

A simple web-based guest book application for Airbnb hosts.

## Features

- Web-based guest book form
- Collect guest information (Name, Visiting From, Comments)
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

4. UI/UX Improvements
   - Add proper form validation
   - Add loading states
   - Add success/error messages
   - Improve mobile responsiveness
   - Add dark mode support

5. Development Improvements
   - Add TypeScript support
   - Add unit tests
   - Add GitHub Actions/GitLab CI pipeline
   - Add development environment variables
   - Add input sanitization

6. Documentation
   - Add API documentation
   - Add developer setup guide
   - Add contribution guidelines

***
