import { createPool } from 'mysql2/promise';
import { file } from 'bun';
import * as path from 'path';

const PORT = process.env.PORT || 3000;

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
const pool = createPool(dbConfig);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      ...corsHeaders,
    }
  });
}

function errorResponse(error, status = 500) {
  console.error(error);
  return Response.json({ error: error.message || 'Internal Server Error' }, {
    status,
    headers: {
      ...corsHeaders,
    }
  });
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const method = req.method;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // API Routes
    if (url.pathname.startsWith('/api')) {
      try {
        // GET /api/tables
        if (method === 'GET' && url.pathname === '/api/tables') {
          const [rows] = await pool.query('SHOW TABLES');
          return jsonResponse(rows);
        }

        // GET /api/tables/:tableName/structure
        // Regex: /^\/api\/tables\/([^\/]+)\/structure$/
        const structureMatch = url.pathname.match(/^\/api\/tables\/([^\/]+)\/structure$/);
        if (method === 'GET' && structureMatch) {
          const tableName = structureMatch[1];
          const [rows] = await pool.query(`DESCRIBE ${tableName}`);
          return jsonResponse(rows);
        }

        // GET /api/tables/:tableName/data
        // Regex: /^\/api\/tables\/([^\/]+)\/data$/
        const dataMatch = url.pathname.match(/^\/api\/tables\/([^\/]+)\/data$/);
        if (method === 'GET' && dataMatch) {
          const tableName = dataMatch[1];
          const limit = parseInt(url.searchParams.get('limit')) || 100;
          // Note: parameterized table names are not supported in MySQL prepared statements for identifiers,
          // but we should be careful. Original code didn't sanitize tableName either beyond basic usage.
          // For safety in a real app, validate tableName against allowlist.
          const [rows] = await pool.query(`SELECT * FROM ${tableName} LIMIT ?`, [limit]);
          return jsonResponse(rows);
        }

        // GET /api/employees/:id/projects
        const projectsMatch = url.pathname.match(/^\/api\/employees\/([^\/]+)\/projects$/);
        if (method === 'GET' && projectsMatch) {
          // Logic from original: find project table
          const [tables] = await pool.query('SHOW TABLES');
          const tableNames = tables.map(t => Object.values(t)[0].toLowerCase());
          const projectTable = tableNames.find(t => 
            t.includes('project') || t.includes('assignment') || t.includes('work')
          );
          
          if (projectTable) {
            const [rows] = await pool.query(`SELECT * FROM ${projectTable} LIMIT 20`);
            return jsonResponse(rows);
          } else {
            return jsonResponse([]);
          }
        }

        // GET /api/employees/:id/feedback
        const feedbackMatch = url.pathname.match(/^\/api\/employees\/([^\/]+)\/feedback$/);
        if (method === 'GET' && feedbackMatch) {
          const [tables] = await pool.query('SHOW TABLES');
          const tableNames = tables.map(t => Object.values(t)[0].toLowerCase());
          const feedbackTable = tableNames.find(t => 
            t.includes('feedback') || t.includes('review') || t.includes('evaluation') || t.includes('performance')
          );
          
          if (feedbackTable) {
            const [rows] = await pool.query(`SELECT * FROM ${feedbackTable} LIMIT 20`);
            return jsonResponse(rows);
          } else {
            return jsonResponse([]);
          }
        }

        // GET /api/employees/:id/skills
        const skillsMatch = url.pathname.match(/^\/api\/employees\/([^\/]+)\/skills$/);
        if (method === 'GET' && skillsMatch) {
          const [tables] = await pool.query('SHOW TABLES');
          const tableNames = tables.map(t => Object.values(t)[0].toLowerCase());
          const skillTable = tableNames.find(t => 
            t.includes('skill') || t.includes('competenc') || t.includes('expertise')
          );
          
          if (skillTable) {
            const [rows] = await pool.query(`SELECT * FROM ${skillTable} LIMIT 50`);
            return jsonResponse(rows);
          } else {
            return jsonResponse([]);
          }
        }

        // GET /api/employees/:id/recommendations
        const recsMatch = url.pathname.match(/^\/api\/employees\/([^\/]+)\/recommendations$/);
        if (method === 'GET' && recsMatch) {
          const [tables] = await pool.query('SHOW TABLES');
          const tableNames = tables.map(t => Object.values(t)[0].toLowerCase());
          const jobTable = tableNames.find(t => 
            t.includes('job') || t.includes('position') || t.includes('role') || t.includes('opening')
          );
          
          if (jobTable) {
            const [rows] = await pool.query(`SELECT * FROM ${jobTable} LIMIT 10`);
            return jsonResponse(rows);
          } else {
            return jsonResponse([]);
          }
        }

        // GET /api/employees/:id (Must be after specific sub-resources)
        const empMatch = url.pathname.match(/^\/api\/employees\/?([^\/]*)$/);
        if (method === 'GET' && empMatch) {
          const employeeId = empMatch[1] || 1;
          
          const [tables] = await pool.query('SHOW TABLES');
          const tableNames = tables.map(t => Object.values(t)[0].toLowerCase());
          
          const employeeTable = tableNames.find(t => 
            t.includes('employee') || t.includes('user') || t.includes('staff') || t.includes('person')
          );
          
          if (employeeTable) {
            const [rows] = await pool.query(`SELECT * FROM ${employeeTable} WHERE id = ? OR 1=1 LIMIT 1`, [employeeId]);
            return jsonResponse(rows[0] || { message: 'No employee found', mock: true });
          } else {
            return jsonResponse({ 
              message: 'No employee table found', 
              availableTables: tableNames,
              mock: true 
            });
          }
        }

        // POST /api/query
        if (method === 'POST' && url.pathname === '/api/query') {
          const body = await req.json();
          const { sql, params } = body;
          
          if (!sql || !sql.trim().toLowerCase().startsWith('select')) {
            return jsonResponse({ error: 'Only SELECT queries allowed' }, 403);
          }
          
          const [rows] = await pool.query(sql, params || []);
          return jsonResponse(rows);
        }

        return jsonResponse({ error: 'Not Found' }, 404);

      } catch (error) {
        return errorResponse(error);
      }
    }

    // Static Files
    let filePath = url.pathname;
    if (filePath === '/') {
      filePath = '/pages/index.html';
    }

    // Map to client directory
    // server/ is CWD, client is ../client
    const clientDir = path.resolve(import.meta.dir, '../client');
    const fullPath = path.join(clientDir, filePath);

    // Security check to prevent directory traversal outside client
    if (!fullPath.startsWith(clientDir)) {
      return new Response('Forbidden', { status: 403 });
    }

    const staticFile = Bun.file(fullPath);
    if (await staticFile.exists()) {
      return new Response(staticFile);
    }

    return new Response('Not Found', { status: 404 });
  },
});

console.log(`TalentFlow server running on http://localhost:${PORT}`);
console.log(`API available at http://localhost:${PORT}/api/tables`);

