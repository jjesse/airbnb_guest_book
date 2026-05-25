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

### Export Entries

- **GET** `/api/entries/export?format=json|csv`
- **Auth**: Required
- **Response**: Downloadable JSON or CSV file of all entries

## Analytics & Reporting

### Dashboard Metrics

- **GET** `/api/analytics/dashboard`
- **Auth**: Required
- **Response**: `{ totalStays, totalGuests, repeatGuestRate, totalBookedDays, occupancyByMonth }`

### Entry Statistics

- **GET** `/api/analytics/statistics`
- **Auth**: Required
- **Response**: `{ averageStayDuration, totalBookedDays, mostCommonOriginCities }`

## Backup & Restore

### Create Backup

- **POST** `/api/backup`
- **Auth**: Required
- **Response**: `{ message: string }`

### Restore Backup

- **POST** `/api/restore/:filename`
- **Auth**: Required
- **Response**: `{ message: string }`
