const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// Database configuration
const dbConfig = {
  host: 'lyl3nln24eqcxxot.cbetxkdyhwsb.us-east-1.rds.amazonaws.com',
  port: 3306,
  user: 'tbrisna6lauu9yh5',
  password: 'ny7lx2ghl3v80049',
  database: 'p6yjzywr2368j0zg',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// ============================================================================
// API ROUTES
// ============================================================================

// Get all tables in database (for exploration)
app.get('/api/tables', async (req, res) => {
  try {
    const [rows] = await pool.query('SHOW TABLES');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get table structure
app.get('/api/tables/:tableName/structure', async (req, res) => {
  try {
    const [rows] = await pool.query(`DESCRIBE ${req.params.tableName}`);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching table structure:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all data from a table (limited)
app.get('/api/tables/:tableName/data', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const [rows] = await pool.query(`SELECT * FROM ${req.params.tableName} LIMIT ?`, [limit]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching table data:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// CAREER PAGE API ROUTES
// ============================================================================

// Get default employee (first employee by ID)
app.get('/api/employees', async (req, res) => {
  try {
    const query = `
      SELECT 
        e.*,
        r.rank_name,
        r.rank_level,
        sl.name as service_line_name,
        subsl.name as sub_service_line_name,
        l.name as location_name,
        l.city,
        l.state_province,
        l.country,
        reg.name as region_name,
        sr.name as super_region_name
      FROM employees e
      LEFT JOIN rank_hierarchy r ON e.rank_id = r.id
      LEFT JOIN service_lines sl ON e.service_line_id = sl.id
      LEFT JOIN sub_service_lines subsl ON e.sub_service_line_id = subsl.id
      LEFT JOIN locations l ON e.location_id = l.id
      LEFT JOIN regions reg ON e.region_id = reg.id
      LEFT JOIN super_regions sr ON e.super_region_id = sr.id
      WHERE e.is_active = 1
      ORDER BY e.id ASC
      LIMIT 1
    `;
    
    const [rows] = await pool.query(query);
    
    if (rows.length === 0) {
      return res.json({ message: 'No employee found', mock: true });
    }
    
    const employee = rows[0];
    const employeeId = employee.employee_id;
    
    // Get related data
    const [skills] = await pool.query(`
      SELECT 
        es.*,
        s.skill_name,
        s.category,
        s.description
      FROM employee_skills es
      JOIN skills s ON es.skill_id = s.skill_id
      WHERE es.employee_id = ?
      ORDER BY es.proficiency_level DESC
    `, [employeeId]);
    
    const [certifications] = await pool.query(`
      SELECT * FROM employee_certifications
      WHERE employee_id = ?
      ORDER BY issue_date DESC
    `, [employeeId]);
    
    const [interests] = await pool.query(`
      SELECT * FROM employee_career_interests
      WHERE employee_id = ?
      ORDER BY priority ASC
    `, [employeeId]);
    
    const [targetRoles] = await pool.query(`
      SELECT * FROM employee_target_roles
      WHERE employee_id = ?
      ORDER BY priority ASC
    `, [employeeId]);
    
    res.json({
      ...employee,
      skills: skills,
      certifications: certifications,
      career_interests: interests,
      target_roles: targetRoles
    });
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get employee by ID (using employee_id field)
app.get('/api/employees/:id', async (req, res) => {
  try {
    const employeeId = req.params.id;
    
    // Try to match by employee_id first, then by id if numeric
    const isNumeric = /^\d+$/.test(employeeId);
    const whereClause = isNumeric 
      ? '(e.employee_id = ? OR e.id = ?)'
      : 'e.employee_id = ?';
    const params = isNumeric ? [employeeId, parseInt(employeeId)] : [employeeId];
    
    const query = `
      SELECT 
        e.*,
        r.rank_name,
        r.rank_level,
        sl.name as service_line_name,
        subsl.name as sub_service_line_name,
        l.name as location_name,
        l.city,
        l.state_province,
        l.country,
        reg.name as region_name,
        sr.name as super_region_name
      FROM employees e
      LEFT JOIN rank_hierarchy r ON e.rank_id = r.id
      LEFT JOIN service_lines sl ON e.service_line_id = sl.id
      LEFT JOIN sub_service_lines subsl ON e.sub_service_line_id = subsl.id
      LEFT JOIN locations l ON e.location_id = l.id
      LEFT JOIN regions reg ON e.region_id = reg.id
      LEFT JOIN super_regions sr ON e.super_region_id = sr.id
      WHERE ${whereClause} AND e.is_active = 1
      LIMIT 1
    `;
    
    const [rows] = await pool.query(query, params);
    
    if (rows.length === 0) {
      return res.json({ message: 'No employee found', mock: true });
    }
    
    const employee = rows[0];
    const empId = employee.employee_id;
    
    // Get related data
    const [skills] = await pool.query(`
      SELECT 
        es.*,
        s.skill_name,
        s.category,
        s.description
      FROM employee_skills es
      JOIN skills s ON es.skill_id = s.skill_id
      WHERE es.employee_id = ?
      ORDER BY es.proficiency_level DESC
    `, [empId]);
    
    const [certifications] = await pool.query(`
      SELECT * FROM employee_certifications
      WHERE employee_id = ?
      ORDER BY issue_date DESC
    `, [empId]);
    
    const [interests] = await pool.query(`
      SELECT * FROM employee_career_interests
      WHERE employee_id = ?
      ORDER BY priority ASC
    `, [empId]);
    
    const [targetRoles] = await pool.query(`
      SELECT * FROM employee_target_roles
      WHERE employee_id = ?
      ORDER BY priority ASC
    `, [empId]);
    
    res.json({
      ...employee,
      skills: skills,
      certifications: certifications,
      career_interests: interests,
      target_roles: targetRoles
    });
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get employee projects (return empty array - no projects table in ERD)
app.get('/api/employees/:id/projects', async (req, res) => {
  try {
    // No projects table in the ERD, return empty array
    res.json([]);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get employee feedback (return empty array - no feedback table in ERD)
app.get('/api/employees/:id/feedback', async (req, res) => {
  try {
    // No feedback table in the ERD, return empty array
    res.json([]);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get employee skills
app.get('/api/employees/:id/skills', async (req, res) => {
  try {
    const employeeId = req.params.id;
    
    // Try to match by employee_id first, then by id if numeric
    const isNumeric = /^\d+$/.test(employeeId);
    const whereClause = isNumeric 
      ? '(es.employee_id = ? OR e.id = ?)'
      : 'es.employee_id = ?';
    const params = isNumeric ? [employeeId, parseInt(employeeId)] : [employeeId];
    
    const query = `
      SELECT 
        es.*,
        s.skill_name,
        s.category,
        s.description
      FROM employee_skills es
      JOIN skills s ON es.skill_id = s.skill_id
      JOIN employees e ON es.employee_id = e.employee_id
      WHERE ${whereClause}
      ORDER BY es.proficiency_level DESC
    `;
    
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get recommended jobs for employee (basic skill matching)
app.get('/api/employees/:id/recommendations', async (req, res) => {
  try {
    const employeeId = req.params.id;
    
    // Get employee skills first
    const isNumeric = /^\d+$/.test(employeeId);
    const empWhereClause = isNumeric 
      ? '(e.employee_id = ? OR e.id = ?)'
      : 'e.employee_id = ?';
    const empParams = isNumeric ? [employeeId, parseInt(employeeId)] : [employeeId];
    
    const [employeeRows] = await pool.query(`
      SELECT employee_id FROM employees 
      WHERE ${empWhereClause} AND is_active = 1
      LIMIT 1
    `, empParams);
    
    if (employeeRows.length === 0) {
      return res.json([]);
    }
    
    const empId = employeeRows[0].employee_id;
    
    // Get employee skills
    const [skills] = await pool.query(`
      SELECT es.skill_id, s.skill_name, es.proficiency_level
      FROM employee_skills es
      JOIN skills s ON es.skill_id = s.skill_id
      WHERE es.employee_id = ?
    `, [empId]);
    
    const skillNames = skills.map(s => s.skill_name.toLowerCase());
    
    // Get jobs and calculate basic match score based on skill mentions
    const [jobs] = await pool.query(`
      SELECT 
        id,
        company,
        title,
        url,
        application_url,
        requisition_id,
        service_line,
        sub_service_line,
        rank_level,
        primary_location,
        location,
        work_model,
        posted_date,
        description,
        matched_skills
      FROM jobs_temp
      WHERE description IS NOT NULL
      ORDER BY posted_date DESC
      LIMIT 50
    `);
    
    // Calculate match scores (basic keyword matching - will be enhanced with LLM later)
    const jobsWithScores = jobs.map(job => {
      try {
        const description = (job.description || '').toLowerCase();
        
        // Safely parse matched_skills JSON
        let matchedSkills = [];
        if (job.matched_skills) {
          try {
            if (typeof job.matched_skills === 'string') {
              matchedSkills = JSON.parse(job.matched_skills);
            } else if (Array.isArray(job.matched_skills)) {
              matchedSkills = job.matched_skills;
            }
          } catch (e) {
            // If parsing fails, use empty array
            matchedSkills = [];
          }
        }
        
        // Ensure matchedSkills is an array
        if (!Array.isArray(matchedSkills)) {
          matchedSkills = [];
        }
        
        let matchCount = 0;
        skillNames.forEach(skillName => {
          if (description.includes(skillName) || 
              matchedSkills.some(ms => {
                const msStr = typeof ms === 'string' ? ms : String(ms);
                return msStr.toLowerCase().includes(skillName);
              })) {
            matchCount++;
          }
        });
        
        const matchScore = skillNames.length > 0 
          ? Math.round((matchCount / skillNames.length) * 100)
          : 0;
        
        return {
          ...job,
          matchScore: matchScore,
          matchedEmployeeSkills: skillNames.filter(skill => 
            description.includes(skill) || 
            matchedSkills.some(ms => {
              const msStr = typeof ms === 'string' ? ms : String(ms);
              return msStr.toLowerCase().includes(skill);
            })
          )
        };
      } catch (error) {
        console.error('Error processing job:', job.id, error);
        return {
          ...job,
          matchScore: 0,
          matchedEmployeeSkills: []
        };
      }
    });
    
    // Sort by match score and return top 10
    const topJobs = jobsWithScores
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10);
    
    res.json(topJobs);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all employees (for testing/exploration)
app.get('/api/employees/all', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const query = `
      SELECT 
        e.id,
        e.employee_id,
        e.first_name,
        e.last_name,
        e.email,
        e.role_title,
        e.years_experience,
        e.years_at_ey,
        r.rank_name,
        sl.name as service_line_name,
        l.name as location_name
      FROM employees e
      LEFT JOIN rank_hierarchy r ON e.rank_id = r.id
      LEFT JOIN service_lines sl ON e.service_line_id = sl.id
      LEFT JOIN locations l ON e.location_id = l.id
      WHERE e.is_active = 1
      ORDER BY e.id ASC
      LIMIT ?
    `;
    
    const [rows] = await pool.query(query, [limit]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get courses for a skill (from skill_courses table)
app.get('/api/skills/:skillId/courses', async (req, res) => {
  try {
    const skillId = req.params.skillId;
    
    // Try to get courses from skill_courses table
    const query = `
      SELECT * FROM skill_courses
      WHERE skill_id = ?
      ORDER BY rating DESC
    `;
    
    const [rows] = await pool.query(query, [skillId]);
    res.json(rows);
  } catch (error) {
    // If table doesn't exist or error, return empty array
    console.error('Error fetching courses:', error);
    res.json([]);
  }
});

// Get all skills
app.get('/api/skills', async (req, res) => {
  try {
    const query = `
      SELECT * FROM skills
      ORDER BY category, skill_name
    `;
    
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get jobs (all or filtered)
app.get('/api/jobs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const serviceLine = req.query.service_line;
    const rankLevel = req.query.rank_level;
    
    let query = `
      SELECT 
        id,
        company,
        title,
        url,
        application_url,
        requisition_id,
        service_line,
        sub_service_line,
        rank_level,
        primary_location,
        location,
        work_model,
        posted_date,
        description,
        matched_skills
      FROM jobs_temp
      WHERE 1=1
    `;
    
    const params = [];
    
    if (serviceLine) {
      query += ' AND service_line = ?';
      params.push(serviceLine);
    }
    
    if (rankLevel) {
      query += ' AND rank_level = ?';
      params.push(rankLevel);
    }
    
    query += ' ORDER BY posted_date DESC LIMIT ?';
    params.push(limit);
    
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generic query endpoint for flexibility
app.post('/api/query', async (req, res) => {
  try {
    const { sql, params } = req.body;
    // Safety: only allow SELECT queries
    if (!sql.trim().toLowerCase().startsWith('select')) {
      return res.status(403).json({ error: 'Only SELECT queries allowed' });
    }
    const [rows] = await pool.query(sql, params || []);
    res.json(rows);
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/pages/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`TalentFlow server running on http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api/tables`);
});
