# EY Career & Course Scrapers

Node.js scrapers for collecting job listings and training courses.

## Scrapers

### 1. EY Jobs Scraper
Scrapes job listings from [ey.jobs](https://ey.jobs/jobs/) with descriptions and qualifications.

**Filters:** Excludes entry-level roles, internships, campus recruiting.

```bash
node scrape_and_save.js
```

**Output:** `ey_jobs.json`

### 2. Course Scraper
Matches courses to 54 defined skills:
- **Udemy** - Loaded from `udemy_courses.json` (manually populated)
- **Credly (EY Badges)** - Scraped from credly.com

Uses fuzzy matching to find relevant courses per skill.

```bash
# First, populate udemy_courses.json with courses
# Then run:
node course_scraper.js
```

**Output:** `skill_courses.json`

## Setup

```bash
npm install
```

Required packages: `puppeteer`, `cheerio`, `axios`

## Files

| File | Description |
|------|-------------|
| `ey_scraper.js` | EY jobs scraper class |
| `scrape_and_save.js` | Entry point for jobs scraper |
| `course_scraper.js` | Course scraper (Credly + manual Udemy) |
| `skills_data.js` | 54 skills with keywords for matching |
| `udemy_courses.json` | Manual Udemy course list (edit this) |
| `ey_jobs.json` | Scraped job listings |
| `skill_courses.json` | Matched courses by skill |

## Output Format

### Jobs (`ey_jobs.json`)
```json
{
  "requisition_id": "ABC123...",
  "title": "Senior Manager - Consulting",
  "url": "https://ey.jobs/...",
  "primary_location": "New York, NY",
  "service_line": "Consulting",
  "rank_level": "Manager",
  "description": "Full job description...",
  "qualifications_skills": "Requirements..."
}
```

### Courses (`skill_courses.json`)
```json
{
  "skills": [
    {
      "skill_id": "A001",
      "skill_name": "Prompt Engineering",
      "category": "GenAI",
      "courses": [
        {
          "platform": "udemy",
          "title": "ChatGPT Prompt Engineering",
          "url": "https://udemy.com/course/...",
          "match_score": 0.85
        }
      ]
    }
  ],
  "metadata": {
    "scraped_at": "2026-01-18T...",
    "total_skills": 54,
    "total_courses": 287
  }
}
```

## Running Both Scrapers

You can run both scrapers simultaneously in separate terminals:

```bash
# Terminal 1
node scrape_and_save.js

# Terminal 2
node course_scraper.js
```

## Notes

- Uses Puppeteer with request interception for faster scraping
- Parallel processing (15 tabs) for bulk operations
- Progress saved incrementally to avoid data loss
