# API Documentation

## Authentication

### Login

- **POST** `/api/login`
- **Body**: `{ username: string, password: string }`
- **Response**: `{ token: string }`

## Guest Book Entries

### Get All Entries

- **GET** `/api/entries`
- **Response**: Array of entries
- **Query Parameters**:
  - `query`: Search text
  - `startDate`: ISO date string
  - `endDate`: ISO date string

### Create Entry

- **POST** `/api/entries`
- **Body**: `{ name: string, from: string, comments: string, photo?: string }`
- **Response**: Created entry object

### Delete Entry

- **DELETE** `/api/entries/:id`
- **Auth**: Required
- **Response**: 204 No Content

## Backup & Restore

### Create Backup

- **POST** `/api/backup`
- **Auth**: Required
- **Response**: `{ message: string }`

### Restore Backup

- **POST** `/api/restore/:filename`
- **Auth**: Required
- **Response**: `{ message: string }`
