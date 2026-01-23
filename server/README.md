# TalentFlow Server

Backend API server for connecting to the MySQL database.

## Prerequisites

- Node.js 18+ (https://nodejs.org/)

## Setup

1. Install dependencies:
```bash
cd server
npm install
```

2. Start the server:
```bash
npm start
```

3. The server will run on http://localhost:3000

## API Endpoints

- `GET /api/tables` - List all database tables
- `GET /api/tables/:name/structure` - Get table structure
- `GET /api/tables/:name/data` - Get table data
- `GET /api/employees/:id` - Get employee info
- `GET /api/employees/:id/projects` - Get employee projects
- `GET /api/employees/:id/feedback` - Get employee feedback
- `GET /api/employees/:id/skills` - Get employee skills
- `GET /api/employees/:id/recommendations` - Get job recommendations

## Database

Connected to MySQL on AWS RDS:
- Host: lyl3nln24eqcxxot.cbetxkdyhwsb.us-east-1.rds.amazonaws.com
- Database: p6yjzywr2368j0zg
