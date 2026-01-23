// ============================================================================
// API UTILITIES AND HELPER FUNCTIONS
// ============================================================================

import { API_BASE, mockCareerData } from './config.js';

export async function fetchCareerData() {
  try {
    // Try to fetch from API
    const [tablesRes] = await Promise.all([
      fetch(`${API_BASE}/tables`).then(r => r.ok ? r.json() : null)
    ]);
    
    if (!tablesRes) {
      console.log('API not available, using mock data');
      return { ...mockCareerData, fromDatabase: false };
    }
    
    // API is available - fetch real data
    const [employee, projects, feedback, skills, recommendations] = await Promise.all([
      fetch(`${API_BASE}/employees/1`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/employees/1/projects`).then(r => r.json()).catch(() => []),
      fetch(`${API_BASE}/employees/1/feedback`).then(r => r.json()).catch(() => []),
      fetch(`${API_BASE}/employees/1/skills`).then(r => r.json()).catch(() => []),
      fetch(`${API_BASE}/employees/1/recommendations`).then(r => r.json()).catch(() => [])
    ]);
    
    return {
      employee: employee || mockCareerData.employee,
      projects: projects.length > 0 ? projects : mockCareerData.projects,
      feedback: feedback.length > 0 ? feedback : mockCareerData.feedback,
      skills: skills.length > 0 ? skills : mockCareerData.skills,
      recommendations: recommendations.length > 0 ? recommendations : mockCareerData.recommendations,
      publicProfile: (employee && employee.publicProfile) ? employee.publicProfile : mockCareerData.publicProfile,
      availableTables: tablesRes,
      fromDatabase: true
    };
  } catch (error) {
    console.log('Error fetching career data:', error);
    return { ...mockCareerData, fromDatabase: false };
  }
}

export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getInitials(name) {
  if (!name) return '';
  return String(name)
    .trim()
    .split(/\s+/)
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function clampRating(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return 0;
  return Math.max(1, Math.min(5, Math.round(num)));
}

export function buildPublicProfileData(data) {
  const fallback = (data && data.publicProfile) ? data.publicProfile : (mockCareerData.publicProfile || {});
  const employee = (data && data.employee) ? data.employee : {};
  const skills = Array.isArray(data && data.skills) ? data.skills : [];
  const recommendations = Array.isArray(data && data.recommendations) ? data.recommendations : [];

  const name = employee.name || fallback.name || 'Employee';
  const title = employee.title || fallback.title || '';
  const department = employee.department || (fallback.org && fallback.org.department) || '';
  const location = employee.location || (fallback.contact && fallback.contact.location) || '';

  const contact = {
    phone: employee.phone || (fallback.contact && fallback.contact.phone) || '',
    email: employee.email || (fallback.contact && fallback.contact.email) || '',
    location
  };

  const org = {
    company: (fallback.org && fallback.org.company) || '',
    businessUnit: (fallback.org && fallback.org.businessUnit) || '',
    division: (fallback.org && fallback.org.division) || '',
    department
  };

  const skillHighlights = (() => {
    const sorted = skills.slice().sort((a, b) => (b.level || 0) - (a.level || 0));
    const first = sorted[0];
    const second = sorted[1];
    if (first && second) {
      return {
        left: { label: first.name, score: clampRating((first.level || 0) / 20) },
        right: { label: second.name, score: clampRating((second.level || 0) / 20) }
      };
    }
    return fallback.skillHighlights || {
      left: { label: 'Problem Solving', score: 4 },
      right: { label: 'Business Processes', score: 4 }
    };
  })();

  const targetRoles = recommendations.length
    ? recommendations.map(r => r.title).slice(0, 3)
    : (fallback.targetRoles || []);

  const tags = (() => {
    const tagCandidates = skills.filter(s => s.verified).map(s => s.name);
    const unique = Array.from(new Set(tagCandidates));
    return unique.length ? unique.slice(0, 4) : (fallback.tags || []);
  })();

  return {
    spotlightLabel: fallback.spotlightLabel || 'Spotlight',
    status: fallback.status || { label: 'Available', backOn: '' },
    name,
    title,
    department,
    location,
    contact,
    bio: fallback.bio || '',
    manager: fallback.manager || { name: '', title: '' },
    org,
    absence: fallback.absence || { range: '', label: '' },
    skillHighlights,
    competencies: fallback.competencies || [],
    reportingLine: fallback.reportingLine || [],
    targetRoles,
    tags,
    timeLabel: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  };
}

// Helper function to show database tables in a modal
export function showDatabaseInfo() {
  const tables = window._dbTables || [];
  const tableNames = tables.map(t => Object.values(t)[0]);
  
  // Create modal HTML
  const modalHtml = `
    <div class="modal fade" id="dbInfoModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content bg-dark text-white">
          <div class="modal-header border-secondary">
            <h5 class="modal-title"><i class="bi bi-database me-2"></i>Database Tables</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p class="text-muted mb-3">Connected to MySQL database with ${tableNames.length} tables:</p>
            <div class="list-group">
              ${tableNames.map(name => `
                <div class="list-group-item bg-transparent text-white border-secondary d-flex justify-content-between align-items-center">
                  <span><i class="bi bi-table me-2 text-warning"></i>${name}</span>
                  <a href="http://localhost:3000/api/tables/${name}/data" target="_blank" class="btn btn-sm btn-outline-info">
                    <i class="bi bi-eye"></i>
                  </a>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="modal-footer border-secondary">
            <a href="http://localhost:3000/api/tables" target="_blank" class="btn btn-outline-warning">
              <i class="bi bi-code-slash me-1"></i>View API
            </a>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Remove existing modal if any
  const existing = document.getElementById('dbInfoModal');
  if (existing) existing.remove();
  
  // Add and show modal
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const modal = new bootstrap.Modal(document.getElementById('dbInfoModal'));
  modal.show();
}

// Make showDatabaseInfo available globally
window.showDatabaseInfo = showDatabaseInfo;

