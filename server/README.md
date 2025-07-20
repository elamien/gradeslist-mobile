# Gradeslist Server

Server-side API for scraping Gradescope data reliably.

## Setup

1. Install dependencies:
```bash
cd server
npm install
```

2. Start the server:
```bash
npm run dev  # Development with auto-reload
# or
npm start   # Production
```

3. Server will run on http://localhost:3001

## API Endpoints

### Test Connection
```bash
POST /api/gradescope/test
{
  "email": "your-email@example.com",
  "password": "your-password"
}
```

### Fetch Courses
```bash
POST /api/gradescope/courses
{
  "email": "your-email@example.com", 
  "password": "your-password",
  "term": "summer 2025"  // optional
}
```

### Fetch Assignments
```bash
POST /api/gradescope/assignments
{
  "email": "your-email@example.com",
  "password": "your-password", 
  "courseId": "123456"
}
```

### Fetch All Data
```bash
POST /api/gradescope/all
{
  "email": "your-email@example.com",
  "password": "your-password",
  "term": "summer 2025"  // optional
}
```

## Security Features

- Rate limiting (100 requests per 15 minutes)
- CORS protection
- Helmet security headers
- Input validation
- Session caching (10 minute cache)

## Deployment

Can be deployed to:
- Heroku
- Vercel
- Railway
- AWS EC2
- Any Node.js hosting platform