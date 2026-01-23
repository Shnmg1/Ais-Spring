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

// Get employee by ID (or default employee)
app.get('/api/employees/:id?', async (req, res) => {
  try {
    const employeeId = req.params.id || 1;
    
    // Try to find employees table - adjust query based on actual table structure
    const [tables] = await pool.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0].toLowerCase());
    
    // Look for employee-related tables
    const employeeTable = tableNames.find(t => 
      t.includes('employee') || t.includes('user') || t.includes('staff') || t.includes('person')
    );
    
    if (employeeTable) {
      const [rows] = await pool.query(`SELECT * FROM ${employeeTable} WHERE id = ? OR 1=1 LIMIT 1`, [employeeId]);
      res.json(rows[0] || { message: 'No employee found', mock: true });
    } else {
      res.json({ 
        message: 'No employee table found', 
        availableTables: tableNames,
        mock: true 
      });
    }
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get employee projects
app.get('/api/employees/:id/projects', async (req, res) => {
  try {
    const [tables] = await pool.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0].toLowerCase());
    
    const projectTable = tableNames.find(t => 
      t.includes('project') || t.includes('assignment') || t.includes('work')
    );
    
    if (projectTable) {
      const [rows] = await pool.query(`SELECT * FROM ${projectTable} LIMIT 20`);
      res.json(rows);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get employee feedback
app.get('/api/employees/:id/feedback', async (req, res) => {
  try {
    const [tables] = await pool.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0].toLowerCase());
    
    const feedbackTable = tableNames.find(t => 
      t.includes('feedback') || t.includes('review') || t.includes('evaluation') || t.includes('performance')
    );
    
    if (feedbackTable) {
      const [rows] = await pool.query(`SELECT * FROM ${feedbackTable} LIMIT 20`);
      res.json(rows);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get employee skills
app.get('/api/employees/:id/skills', async (req, res) => {
  try {
    const [tables] = await pool.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0].toLowerCase());
    
    const skillTable = tableNames.find(t => 
      t.includes('skill') || t.includes('competenc') || t.includes('expertise')
    );
    
    if (skillTable) {
      const [rows] = await pool.query(`SELECT * FROM ${skillTable} LIMIT 50`);
      res.json(rows);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get recommended jobs for employee
app.get('/api/employees/:id/recommendations', async (req, res) => {
  try {
    const [tables] = await pool.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0].toLowerCase());
    
    const jobTable = tableNames.find(t => 
      t.includes('job') || t.includes('position') || t.includes('role') || t.includes('opening')
    );
    
    if (jobTable) {
      const [rows] = await pool.query(`SELECT * FROM ${jobTable} LIMIT 10`);
      res.json(rows);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error fetching recommendations:', error);
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
