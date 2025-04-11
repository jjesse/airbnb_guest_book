# Developer Setup Guide

## Prerequisites

- Node.js 20.x
- MongoDB 7.x
- Docker (optional)

## Local Development

1. Clone repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment:

   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. Start development:

   ```bash
   npm run dev
   ```

## Testing

```bash
npm test
```

## Docker Development

```bash
docker-compose up --build
```

## Common Issues

1. MongoDB connection
2. TypeScript compilation
3. Docker permissions
