# TalentFlow Server

Backend API server for connecting to the MySQL database.

## Prerequisites

**Option A (Recommended):** Bun - https://bun.sh

**Option B:** Node.js 18+ - https://nodejs.org

## Setup with Bun (Recommended)

```bash
cd server
bun install
bun start
```

For development with hot reload:
```bash
bun dev
```

## Setup with Node.js

```bash
cd server
npm install
npm run start:node
```

## Server

The server will run on http://localhost:3000

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
