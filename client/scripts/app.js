// ============================================================================
// TalentFlow SPA - Main Application Script
// ============================================================================

// Track Chart.js instances for cleanup
const chartInstances = new Map();

// Current role state
let currentRole = 'seeker';

// ============================================================================
// NAVIGATION DATA
// ============================================================================

const navData = {
  seeker: [
    { name: 'Home', icon: 'bi-house-door', id: 'seeker-home' },
    { name: 'My Career', icon: 'bi-person-badge', id: 'seeker-profile' },
    { name: 'Learning Paths', icon: 'bi-book', id: 'seeker-learning' },
    { name: 'Job Board', icon: 'bi-briefcase', id: 'seeker-jobs' }
  ],
  recruiter: [
    { name: 'Home', icon: 'bi-house-door', id: 'recruiter-home' },
    { name: 'Candidate Search', icon: 'bi-search', id: 'recruiter-search' },
    { name: 'Hiring Strategy', icon: 'bi-graph-up', id: 'recruiter-strategy' }
  ],
  auditor: [
    { name: 'Home', icon: 'bi-house-door', id: 'auditor-home' },
    { name: 'Audit Logs', icon: 'bi-journal-text', id: 'auditor-logs' },
    { name: 'Risk Matrix', icon: 'bi-grid-3x3', id: 'auditor-matrix' },
    { name: 'Compliance Reports', icon: 'bi-file-earmark-check', id: 'auditor-reports' }
  ]
};

// ============================================================================
// THEME MANAGEMENT
// ============================================================================

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  
  // Re-render settings if currently on settings page to update radio buttons
  const settingsRadio = document.getElementById('theme' + (theme.charAt(0).toUpperCase() + theme.slice(1)));
  if (settingsRadio) {
    settingsRadio.checked = true;
  }
}

function initTheme() {
  const storedTheme = localStorage.getItem('theme') || 'dark';
  setTheme(storedTheme);
}

// ============================================================================
// CHART LIFECYCLE MANAGEMENT
// ============================================================================

function destroyAllCharts() {
  chartInstances.forEach((chart, key) => {
    chart.destroy();
  });
  chartInstances.clear();
}

function createChart(canvasId, config) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  
  // Destroy existing chart on this canvas if any
  if (chartInstances.has(canvasId)) {
    chartInstances.get(canvasId).destroy();
  }
  
  const chart = new Chart(canvas.getContext('2d'), config);
  chartInstances.set(canvasId, chart);
  return chart;
}

// ============================================================================
// RENDER SHELL
// ============================================================================

function renderShell(role) {
  currentRole = role;
  const app = document.getElementById('app');
  app.innerHTML = '';

  // Main container
  const container = document.createElement('div');
  container.className = 'd-flex vh-100';

  // Sidebar
  const sidebar = document.createElement('div');
  sidebar.className = 'bg-dark text-white p-3 d-flex flex-column';
  sidebar.style.width = '250px';
  sidebar.style.minWidth = '250px';

  // Brand
  const brand = document.createElement('h4');
  brand.className = 'mb-4 fw-bold text-always-white d-flex align-items-center';
  brand.innerHTML = '<img src="../resources/images/TalentFlow%20icon.png" alt="TalentFlow" style="height: 1.5rem;" class="me-2">TalentFlow';
  sidebar.appendChild(brand);

  // Nav pills
  const nav = document.createElement('nav');
  nav.className = 'nav nav-pills flex-column';
  nav.id = 'main-nav';

  const links = navData[role] || [];
  links.forEach((link, index) => {
    const a = document.createElement('a');
    // Removed 'text-white' to allow CSS to control color state
    a.className = 'nav-link mb-2';
    a.href = '#';
    a.dataset.route = link.id;
    // Wrapped content in span for underline styling
    a.innerHTML = `<span class="nav-item-label"><i class="${link.icon} me-2"></i>${link.name}</span>`;
    // Removed 'bg-primary' class, using underline style instead
    if (index === 0) a.classList.add('active');
    nav.appendChild(a);
  });

  sidebar.appendChild(nav);

  // Spacer
  const spacer = document.createElement('div');
  spacer.className = 'flex-grow-1';
  sidebar.appendChild(spacer);

  // Role indicator at bottom of sidebar
  const roleIndicator = document.createElement('div');
  roleIndicator.className = 'small text-muted mt-3';
  roleIndicator.innerHTML = `<i class="bi bi-person-circle me-1"></i>Role: ${role.charAt(0).toUpperCase() + role.slice(1)}`;
  sidebar.appendChild(roleIndicator);

  container.appendChild(sidebar);

  // Main content area
  const main = document.createElement('div');
  main.className = 'd-flex flex-column flex-grow-1 bg-light';

  // Header bar
  const header = document.createElement('div');
  header.className = 'bg-white border-bottom px-4 py-2 d-flex align-items-center justify-content-end';
  header.style.height = '60px';

  header.innerHTML = `
    <button class="btn btn-outline-primary me-3">
      <i class="bi bi-robot me-1"></i>AI Career Agent
    </button>
    <i class="bi bi-bell fs-5 me-3" style="cursor: pointer;"></i>
    <div class="dropdown">
      <a class="d-flex align-items-center text-decoration-none dropdown-toggle text-dark" href="#" data-bs-toggle="dropdown" data-bs-display="static">
        <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2" style="width: 35px; height: 35px;">AC</div>
        <span>Alex Chen</span>
      </a>
      <ul class="dropdown-menu dropdown-menu-end animate-slide">
        <li><a class="dropdown-item" href="#">Profile</a></li>
        <li><a class="dropdown-item" href="#" onclick="navigate('settings'); return false;">Settings</a></li>
        <li><hr class="dropdown-divider"></li>
        <li><a class="dropdown-item" href="#">Logout</a></li>
      </ul>
    </div>
  `;

  main.appendChild(header);

  // Content area
  const contentArea = document.createElement('div');
  contentArea.id = 'content-area';
  contentArea.className = 'p-4 overflow-auto';
  contentArea.style.height = 'calc(100vh - 60px)';

  main.appendChild(contentArea);
  container.appendChild(main);
  app.appendChild(container);

  // Setup nav event listeners
  setupNavListeners();
}

// ============================================================================
// NAVIGATION & ROUTING
// ============================================================================

function setupNavListeners() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;

  nav.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-route]');
    if (!link) return;
    e.preventDefault();

    // Update active state
    nav.querySelectorAll('.nav-link').forEach(l => {
      // Removed bg-primary removal as we don't add it anymore
      l.classList.remove('active');
    });
    // Removed bg-primary addition
    link.classList.add('active');

    // Navigate
    navigate(link.dataset.route);
  });
}

function navigate(routeId) {
  // Destroy existing charts before rendering new content
  destroyAllCharts();

  // Handle special routes that aren't sidebar links
  if (routeId === 'settings') {
    // Clear sidebar active state
    const nav = document.getElementById('main-nav');
    if (nav) {
      nav.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    }
    renderSettings();
    return;
  }

  const routes = {
    // Job Seeker
    'seeker-home': renderSeekerHome,
    'seeker-profile': renderSeekerProfile,
    'seeker-learning': renderSeekerLearning,
    'seeker-jobs': renderSeekerJobs,
    // Recruiter
    'recruiter-home': renderRecruiterHome,
    'recruiter-search': renderCandidateSearch,
    'recruiter-strategy': renderHiringStrategy,
    // Auditor
    'auditor-home': renderAuditorHome,
    'auditor-logs': renderAuditLogs,
    'auditor-matrix': renderRiskMatrix,
    'auditor-reports': renderComplianceReports
  };

  const renderFn = routes[routeId];
  if (renderFn) {
    renderFn();
  } else {
    document.getElementById('content-area').innerHTML = '<p class="text-muted">Page not found.</p>';
  }
}

function switchRole(newRole) {
  if (!navData[newRole]) {
    console.error(`Unknown role: ${newRole}`);
    return;
  }
  destroyAllCharts();
  renderShell(newRole);
  navigate(`${newRole}-home`);
}

// ============================================================================
// SETTINGS VIEW
// ============================================================================

function renderSettings() {
  const content = document.getElementById('content-area');
  const currentTheme = localStorage.getItem('theme') || 'dark';
  const isDark = currentTheme === 'dark';

  content.innerHTML = `
    <h4 class="mb-4">Settings</h4>
    <div class="row">
      <div class="col-md-8">
        <div class="card mb-4">
          <div class="card-header">
            <i class="bi bi-display me-2"></i>Appearance
          </div>
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="mb-1">Theme Preference</h6>
                <small class="text-muted">Switch between light and dark modes.</small>
              </div>
              <div class="btn-group" role="group">
                <input type="radio" class="btn-check" name="theme-options" id="themeLight" autocomplete="off" ${!isDark ? 'checked' : ''} onchange="setTheme('light')">
                <label class="btn btn-outline-primary" for="themeLight"><i class="bi bi-sun-fill me-1"></i>Light</label>

                <input type="radio" class="btn-check" name="theme-options" id="themeDark" autocomplete="off" ${isDark ? 'checked' : ''} onchange="setTheme('dark')">
                <label class="btn btn-outline-primary" for="themeDark"><i class="bi bi-moon-fill me-1"></i>Dark</label>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <i class="bi bi-bell me-2"></i>Notifications
          </div>
          <div class="card-body">
            <div class="form-check form-switch mb-3">
              <input class="form-check-input" type="checkbox" id="emailNotif" checked>
              <label class="form-check-label" for="emailNotif">Email Notifications</label>
            </div>
            <div class="form-check form-switch mb-3">
              <input class="form-check-input" type="checkbox" id="pushNotif" checked>
              <label class="form-check-label" for="pushNotif">Push Notifications</label>
            </div>
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" id="marketingNotif">
              <label class="form-check-label" for="marketingNotif">Marketing Emails</label>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============================================================================
// JOB SEEKER VIEWS
// ============================================================================

function renderSeekerHome() {
  const content = document.getElementById('content-area');
  content.innerHTML = `
    <h4 class="mb-4">Welcome back, Alex!</h4>
    <div class="row g-4">
      <!-- Smart Match Roles -->
      <div class="col-md-4">
        <div class="card card-uniform h-100">
          <div class="card-body">
            <h5 class="card-title">Smart Match Roles</h5>
            <div class="accordion mb-3" id="rolesAccordion">
              <div class="accordion-item">
                <h2 class="accordion-header">
                  <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#role1">
                    <span class="badge bg-success me-2">95%</span> Staff - Software Engineering
                  </button>
                </h2>
                <div id="role1" class="accordion-collapse collapse show" data-bs-parent="#rolesAccordion">
                  <div class="accordion-body small">
                    <strong>EY</strong><br>
                    Dallas, TX · $85k-105k · Java, Spring Boot
                  </div>
                </div>
              </div>
              <div class="accordion-item">
                <h2 class="accordion-header">
                  <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#role2">
                    <span class="badge bg-success me-2">92%</span> Senior Consultant - Cybersecurity
                  </button>
                </h2>
                <div id="role2" class="accordion-collapse collapse" data-bs-parent="#rolesAccordion">
                  <div class="accordion-body small">
                    <strong>EY</strong><br>
                    Chicago, IL · $95k-120k · Security+, CISSP
                  </div>
                </div>
              </div>
              <div class="accordion-item">
                <h2 class="accordion-header">
                  <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#role3">
                    <span class="badge bg-warning text-dark me-2">87%</span> Senior Manager - Tax Technology
                  </button>
                </h2>
                <div id="role3" class="accordion-collapse collapse" data-bs-parent="#rolesAccordion">
                  <div class="accordion-body small">
                    <strong>EY</strong><br>
                    San Jose, CA · $150k-190k · Python, SQL
                  </div>
                </div>
              </div>
            </div>
            <a href="#" class="explore-link" onclick="navigate('seeker-jobs'); return false;">Explore</a>
          </div>
        </div>
      </div>
      
      <!-- Skill Gap Radar -->
      <div class="col-md-4">
        <div class="card card-uniform h-100">
          <div class="card-body">
            <h5 class="card-title">Skill Gap Analysis</h5>
            <div class="flex-grow-1 d-flex align-items-center justify-content-center">
                <canvas id="skillGapRadar" style="max-height: 250px;"></canvas>
            </div>
            <a href="#" class="explore-link" onclick="navigate('seeker-profile'); return false;">Explore</a>
          </div>
        </div>
      </div>
      
      <!-- Upskilling Roadmap -->
      <div class="col-md-4">
        <div class="card card-uniform h-100">
          <div class="card-body">
            <h5 class="card-title">Upskilling Roadmap</h5>
            <div class="mb-3">
              <div class="d-flex justify-content-between mb-1">
                <span>TypeScript Advanced</span>
                <span class="text-muted">75%</span>
              </div>
              <div class="progress" style="height: 8px;">
                <div class="progress-bar bg-success" style="width: 75%;"></div>
              </div>
            </div>
            <div class="mb-3">
              <div class="d-flex justify-content-between mb-1">
                <span>System Design</span>
                <span class="text-muted">45%</span>
              </div>
              <div class="progress" style="height: 8px;">
                <div class="progress-bar bg-warning" style="width: 45%;"></div>
              </div>
            </div>
            <div class="mb-3">
              <div class="d-flex justify-content-between mb-1">
                <span>AWS Certification</span>
                <span class="text-muted">20%</span>
              </div>
              <div class="progress" style="height: 8px;">
                <div class="progress-bar bg-info" style="width: 20%;"></div>
              </div>
            </div>
            <div class="mb-3">
              <div class="d-flex justify-content-between mb-1">
                <span>GraphQL Mastery</span>
                <span class="text-muted">60%</span>
              </div>
              <div class="progress" style="height: 8px;">
                <div class="progress-bar bg-primary" style="width: 60%;"></div>
              </div>
            </div>
            <a href="#" class="explore-link" onclick="navigate('seeker-learning'); return false;">Explore</a>
          </div>
        </div>
      </div>
    </div>
  `;

  // Create Skill Gap Radar Chart
  createChart('skillGapRadar', {
    type: 'radar',
    data: {
      labels: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'System Design', 'AWS'],
      datasets: [
        {
          label: 'Your Skills',
          data: [90, 75, 85, 70, 45, 30],
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2
        },
        {
          label: 'Target Role',
          data: [85, 90, 90, 80, 75, 60],
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          angleLines: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          pointLabels: {
            color: '#adb5bd'
          },
          ticks: {
            backdropColor: 'transparent',
            color: '#adb5bd'
          }
        }
      },
      plugins: {
        legend: {
            labels: {
                color: '#adb5bd'
            }
        }
      }
    }
  });
}

function renderSeekerProfile() {
  const content = document.getElementById('content-area');
  content.innerHTML = `
    <h4 class="mb-4">My Career Profile</h4>
    <div class="row g-4">
      <!-- Market Value Line Chart -->
      <div class="col-md-6">
        <div class="card h-100">
          <div class="card-header">
            <i class="bi bi-graph-up-arrow me-2"></i>Market Value Trend
          </div>
          <div class="card-body">
            <canvas id="marketValueChart"></canvas>
          </div>
        </div>
      </div>
      
      <!-- Skill Gap Radar -->
      <div class="col-md-6">
        <div class="card h-100">
          <div class="card-header">
            <i class="bi bi-diagram-3 me-2"></i>Skill Gap
          </div>
          <div class="card-body">
            <canvas id="profileSkillRadar"></canvas>
          </div>
        </div>
      </div>
      
      <!-- Verified Skills -->
      <div class="col-md-6">
        <div class="card">
          <div class="card-header bg-success text-white">
            <i class="bi bi-patch-check me-2"></i>Verified Skills
          </div>
          <ul class="list-group list-group-flush">
            <li class="list-group-item d-flex justify-content-between align-items-center">
              JavaScript
              <span class="badge bg-success"><i class="bi bi-check-circle"></i> Verified</span>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
              React
              <span class="badge bg-success"><i class="bi bi-check-circle"></i> Verified</span>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
              Node.js
              <span class="badge bg-success"><i class="bi bi-check-circle"></i> Verified</span>
            </li>
          </ul>
        </div>
      </div>
      
      <!-- Self-Proclaimed Skills -->
      <div class="col-md-6">
        <div class="card">
          <div class="card-header bg-secondary text-white">
            <i class="bi bi-person-check me-2"></i>Self-Proclaimed Skills
          </div>
          <ul class="list-group list-group-flush">
            <li class="list-group-item d-flex justify-content-between align-items-center">
              TypeScript
              <span class="badge bg-secondary">Self-reported</span>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
              GraphQL
              <span class="badge bg-secondary">Self-reported</span>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
              AWS
              <span class="badge bg-secondary">Self-reported</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  `;

  // Market Value Line Chart
  createChart('marketValueChart', {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'Estimated Salary ($k)',
        data: [95, 98, 102, 105, 112, 118],
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          beginAtZero: false,
          min: 80,
          max: 130
        }
      }
    }
  });

  // Profile Skill Radar
  createChart('profileSkillRadar', {
    type: 'radar',
    data: {
      labels: ['Frontend', 'Backend', 'DevOps', 'Database', 'Testing', 'Architecture'],
      datasets: [{
        label: 'Skill Level',
        data: [90, 70, 40, 65, 55, 50],
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      scales: {
        r: {
          beginAtZero: true,
          max: 100
        }
      }
    }
  });
}

function renderSeekerJobs() {
  const content = document.getElementById('content-area');
  
  // Enhanced job data with department and level for filtering
  const jobs = [
    { title: 'Staff - Assurance (External Audit)', company: 'EY', location: 'New York, NY', salary: '$65k-85k', fitScore: 98, department: 'Assurance', level: 'Staff / Associate' },
    { title: 'Senior Consultant - Cybersecurity', company: 'EY', location: 'Chicago, IL', salary: '$95k-120k', fitScore: 94, department: 'Consulting', level: 'Senior Consultant / Senior Associate' },
    { title: 'Manager - Technology Risk', company: 'EY', location: 'London, UK', salary: '$110k-140k', fitScore: 91, department: 'Assurance', level: 'Manager' },
    { title: 'Intern - Data & Analytics', company: 'EY', location: 'Remote', salary: '$30/hr', fitScore: 88, department: 'Consulting', level: 'Intern' },
    { title: 'Senior Manager - Strategy (EY-Parthenon)', company: 'EY', location: 'Boston, MA', salary: '$160k-200k', fitScore: 96, department: 'Strategy', level: 'Senior Manager' },
    { title: 'Director - Business Tax Services', company: 'EY', location: 'Atlanta, GA', salary: '$180k-240k', fitScore: 89, department: 'Tax', level: 'Director' },
    { title: 'Staff - Software Engineering', company: 'EY', location: 'Dallas, TX', salary: '$85k-105k', fitScore: 92, department: 'Internal Functions', level: 'Staff / Associate' },
    { title: 'Associate - People Advisory Services', company: 'EY', location: 'San Francisco, CA', salary: '$75k-95k', fitScore: 85, department: 'Tax', level: 'Staff / Associate' },
    { title: 'Partner - Transaction Diligence', company: 'EY', location: 'New York, NY', salary: '$250k+', fitScore: 97, department: 'Strategy', level: 'Partner / Principal' },
    { title: 'Senior Associate - Supply Chain & Operations', company: 'EY', location: 'Seattle, WA', salary: '$90k-115k', fitScore: 93, department: 'Consulting', level: 'Senior Consultant / Senior Associate' },
    { title: 'Manager - Forensic & Integrity', company: 'EY', location: 'Washington, DC', salary: '$115k-145k', fitScore: 90, department: 'Assurance', level: 'Manager' },
    { title: 'Staff - Climate Change & Sustainability', company: 'EY', location: 'Los Angeles, CA', salary: '$70k-90k', fitScore: 87, department: 'Assurance', level: 'Staff / Associate' },
    { title: 'Intern - Learning & Development', company: 'EY', location: 'Remote', salary: '$25/hr', fitScore: 84, department: 'Internal Functions', level: 'Intern' },
    { title: 'Senior Consultant - Finance Transformation', company: 'EY', location: 'Chicago, IL', salary: '$100k-125k', fitScore: 95, department: 'Consulting', level: 'Senior Consultant / Senior Associate' },
    { title: 'Director - General Counsel', company: 'EY', location: 'New York, NY', salary: '$200k-280k', fitScore: 91, department: 'Internal Functions', level: 'Director' },
    { title: 'Senior Manager - Tax Technology', company: 'EY', location: 'San Jose, CA', salary: '$150k-190k', fitScore: 89, department: 'Tax', level: 'Senior Manager' },
    { title: 'Associate - Network & Infrastructure', company: 'EY', location: 'Alpharetta, GA', salary: '$70k-90k', fitScore: 86, department: 'Internal Functions', level: 'Staff / Associate' },
    { title: 'Staff - Brand, Marketing & Communications', company: 'EY', location: 'London, UK', salary: '$55k-75k', fitScore: 83, department: 'Internal Functions', level: 'Staff / Associate' },
    { title: 'Manager - Turnaround & Restructuring', company: 'EY', location: 'Chicago, IL', salary: '$130k-160k', fitScore: 92, department: 'Strategy', level: 'Manager' },
    { title: 'Senior Consultant - Global Compliance & Reporting', company: 'EY', location: 'Miami, FL', salary: '$95k-115k', fitScore: 88, department: 'Tax', level: 'Senior Consultant / Senior Associate' }
  ];

  // State for active filters
  const activeFilters = {
    departments: new Set(),
    levels: new Set(),
    search: '',
    recommended: false
  };

  content.innerHTML = `
    <h4 class="mb-4">Job Board</h4>
    
    <!-- Filters -->
    <div class="card mb-3">
      <div class="card-body py-3">
        <div class="row g-3 align-items-center">
          <div class="col-md-3">
            <select class="form-select form-select-sm" id="deptFilter">
              <option value="" selected>Add Department...</option>
              <option value="Assurance">Assurance</option>
              <option value="Consulting">Consulting</option>
              <option value="Strategy">Strategy</option>
              <option value="Tax">Tax</option>
              <option value="Internal Functions">Internal Functions</option>
            </select>
          </div>
          <div class="col-md-3">
            <select class="form-select form-select-sm" id="levelFilter">
              <option value="" selected>Add Level...</option>
              <option value="Intern">Intern</option>
              <option value="Staff / Associate">Staff / Associate</option>
              <option value="Senior Consultant / Senior Associate">Senior Consultant / Senior Associate</option>
              <option value="Manager">Manager</option>
              <option value="Senior Manager">Senior Manager</option>
              <option value="Director">Director</option>
              <option value="Partner / Principal">Partner / Principal</option>
            </select>
          </div>
          <div class="col-md-3">
            <input type="text" class="form-control form-control-sm" id="jobSearch" placeholder="Search title, location...">
          </div>
          <div class="col-md-3">
            <div class="form-check form-switch mb-0">
              <input class="form-check-input" type="checkbox" id="recommendedFilter">
              <label class="form-check-label small" for="recommendedFilter">Recommended Only (>85% Fit)</label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Active Filters Container -->
    <div id="activeFilters" class="d-flex flex-wrap gap-2 mb-4" style="min-height: 20px;"></div>

    <!-- Results Area -->
    <div id="jobsContainer" class="row g-3"></div>
  `;

  // Filter and Render Logic
  const renderList = () => {
    // 1. Filter the jobs based on active state
    const filtered = jobs.filter(job => {
      // OR logic: if no departments selected, match all. If some selected, job must match one of them.
      const matchDept = activeFilters.departments.size === 0 || activeFilters.departments.has(job.department);
      
      // OR logic for levels
      const matchLevel = activeFilters.levels.size === 0 || activeFilters.levels.has(job.level);
      
      // Search logic
      const searchLower = activeFilters.search.toLowerCase();
      const matchSearch = !searchLower || 
                          job.title.toLowerCase().includes(searchLower) || 
                          job.location.toLowerCase().includes(searchLower) || 
                          job.company.toLowerCase().includes(searchLower);
      
      // Recommended logic
      const matchRec = !activeFilters.recommended || job.fitScore >= 85;

      return matchDept && matchLevel && matchSearch && matchRec;
    });

    // 2. Render Active Filter Tags
    const filtersContainer = document.getElementById('activeFilters');
    filtersContainer.innerHTML = '';

    const createTag = (text, removeCallback, colorClass = 'bg-secondary') => {
        const tag = document.createElement('span');
        tag.className = `badge ${colorClass} d-flex align-items-center p-2`;
        tag.innerHTML = `
            <span class="me-2">${text}</span>
            <i class="bi bi-x-lg" style="cursor: pointer;"></i>
        `;
        tag.querySelector('i').addEventListener('click', removeCallback);
        filtersContainer.appendChild(tag);
    };

    activeFilters.departments.forEach(dept => {
        createTag(`Dept: ${dept}`, () => {
            activeFilters.departments.delete(dept);
            renderList();
        });
    });

    activeFilters.levels.forEach(lvl => {
        createTag(`Level: ${lvl}`, () => {
            activeFilters.levels.delete(lvl);
            renderList();
        });
    });

    if (activeFilters.search) {
        createTag(`Search: "${activeFilters.search}"`, () => {
            activeFilters.search = '';
            document.getElementById('jobSearch').value = '';
            renderList();
        });
    }

    if (activeFilters.recommended) {
        createTag('Recommended Only', () => {
            activeFilters.recommended = false;
            document.getElementById('recommendedFilter').checked = false;
            renderList();
        }, 'bg-success');
    }

    // 3. Render Job Cards
    const container = document.getElementById('jobsContainer');
    
    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="bi bi-emoji-frown fs-1 text-muted"></i>
          <p class="text-muted mt-2">No jobs found matching your filters.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(job => `
      <div class="col-12">
        <div class="card">
          <div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <div class="d-flex align-items-center mb-1">
                <h5 class="card-title mb-0 me-2">${job.title}</h5>
                <span class="badge bg-light text-dark border me-1">${job.department}</span>
              </div>
              <p class="card-text text-muted mb-0">
                <i class="bi bi-building me-1"></i>${job.company} · 
                <i class="bi bi-geo-alt me-1"></i>${job.location} · 
                <i class="bi bi-cash me-1"></i>${job.salary}
              </p>
            </div>
            <div class="d-flex align-items-center gap-3">
              <div class="text-center">
                <div class="fs-4 fw-bold ${job.fitScore >= 90 ? 'text-success' : job.fitScore >= 80 ? 'text-warning' : 'text-secondary'}">${job.fitScore}%</div>
                <small class="text-muted">AI Fit Score</small>
              </div>
              <button class="btn btn-warning">
                <i class="bi bi-bar-chart me-1"></i>Gap Analysis
              </button>
              <button class="btn btn-primary">
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  };

  // Attach Listeners
  const deptSelect = document.getElementById('deptFilter');
  deptSelect.addEventListener('change', (e) => {
    if (e.target.value) {
        activeFilters.departments.add(e.target.value);
        e.target.value = ''; // Reset to default
        renderList();
    }
  });

  const levelSelect = document.getElementById('levelFilter');
  levelSelect.addEventListener('change', (e) => {
    if (e.target.value) {
        activeFilters.levels.add(e.target.value);
        e.target.value = ''; // Reset to default
        renderList();
    }
  });

  document.getElementById('jobSearch').addEventListener('input', (e) => {
    activeFilters.search = e.target.value;
    renderList();
  });

  document.getElementById('recommendedFilter').addEventListener('change', (e) => {
    activeFilters.recommended = e.target.checked;
    renderList();
  });

  // Initial Render
  renderList();
}

function renderSeekerLearning() {
  const content = document.getElementById('content-area');
  content.innerHTML = `
    <h4 class="mb-4">Learning Paths</h4>
    <div class="row g-4">
      <!-- Course Progress -->
      <div class="col-md-6">
        <div class="card">
          <div class="card-header">
            <i class="bi bi-mortarboard me-2"></i>Current Courses
          </div>
          <div class="card-body">
            <div class="mb-4">
              <div class="d-flex justify-content-between mb-1">
                <strong>TypeScript Masterclass</strong>
                <span>75%</span>
              </div>
              <div class="progress" style="height: 20px;">
                <div class="progress-bar bg-success progress-bar-striped progress-bar-animated" style="width: 75%;">75%</div>
              </div>
              <small class="text-muted">12 of 16 modules completed</small>
            </div>
            <div class="mb-4">
              <div class="d-flex justify-content-between mb-1">
                <strong>AWS Solutions Architect</strong>
                <span>30%</span>
              </div>
              <div class="progress" style="height: 20px;">
                <div class="progress-bar bg-info progress-bar-striped progress-bar-animated" style="width: 30%;">30%</div>
              </div>
              <small class="text-muted">6 of 20 modules completed</small>
            </div>
            <div class="mb-4">
              <div class="d-flex justify-content-between mb-1">
                <strong>System Design Fundamentals</strong>
                <span>45%</span>
              </div>
              <div class="progress" style="height: 20px;">
                <div class="progress-bar bg-warning progress-bar-striped progress-bar-animated" style="width: 45%;">45%</div>
              </div>
              <small class="text-muted">9 of 20 modules completed</small>
            </div>
            <div class="mb-2">
              <div class="d-flex justify-content-between mb-1">
                <strong>GraphQL Complete Guide</strong>
                <span>60%</span>
              </div>
              <div class="progress" style="height: 20px;">
                <div class="progress-bar bg-primary progress-bar-striped progress-bar-animated" style="width: 60%;">60%</div>
              </div>
              <small class="text-muted">9 of 15 modules completed</small>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Learning Settings -->
      <div class="col-md-6">
        <div class="card">
          <div class="card-header">
            <i class="bi bi-gear me-2"></i>Learning Preferences
          </div>
          <div class="card-body">
            <div class="form-check form-switch mb-3">
              <input class="form-check-input" type="checkbox" id="dailyReminders" checked>
              <label class="form-check-label" for="dailyReminders">Daily Learning Reminders</label>
            </div>
            <div class="form-check form-switch mb-3">
              <input class="form-check-input" type="checkbox" id="weeklyReports" checked>
              <label class="form-check-label" for="weeklyReports">Weekly Progress Reports</label>
            </div>
            <div class="form-check form-switch mb-3">
              <input class="form-check-input" type="checkbox" id="autoEnroll">
              <label class="form-check-label" for="autoEnroll">Auto-enroll in Recommended Courses</label>
            </div>
            <div class="form-check form-switch mb-3">
              <input class="form-check-input" type="checkbox" id="peerLearning" checked>
              <label class="form-check-label" for="peerLearning">Peer Learning Groups</label>
            </div>
            <hr>
            <div class="mb-3">
              <label class="form-label">Daily Learning Goal</label>
              <select class="form-select">
                <option>15 minutes</option>
                <option selected>30 minutes</option>
                <option>1 hour</option>
                <option>2 hours</option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label">Preferred Learning Time</label>
              <select class="form-select">
                <option>Morning (6am - 12pm)</option>
                <option selected>Afternoon (12pm - 6pm)</option>
                <option>Evening (6pm - 12am)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============================================================================
// RECRUITER VIEWS
// ============================================================================

function renderRecruiterHome() {
  const content = document.getElementById('content-area');
  content.innerHTML = `
    <h4 class="mb-4">Recruiter Dashboard</h4>
    
    <!-- Market Landscape Heatmap -->
    <div class="card card-uniform mb-4">
      <div class="card-body">
        <h5 class="card-title">Market Landscape Heatmap</h5>
        <div class="row g-2">
          <div class="col-md-3">
            <div class="p-3 bg-danger text-white rounded text-center" data-bs-toggle="tooltip" title="High demand, low supply: Frontend React">
              <strong>Frontend React</strong><br>
              <small>High Demand</small>
            </div>
          </div>
          <div class="col-md-3">
            <div class="p-3 bg-warning text-dark rounded text-center" data-bs-toggle="tooltip" title="Moderate demand: Backend Node.js">
              <strong>Backend Node.js</strong><br>
              <small>Moderate</small>
            </div>
          </div>
          <div class="col-md-3">
            <div class="p-3 bg-success text-white rounded text-center" data-bs-toggle="tooltip" title="Good supply: Java Developers">
              <strong>Java Developers</strong><br>
              <small>Good Supply</small>
            </div>
          </div>
          <div class="col-md-3">
            <div class="p-3 bg-danger text-white rounded text-center" data-bs-toggle="tooltip" title="High demand, low supply: ML Engineers">
              <strong>ML Engineers</strong><br>
              <small>Critical Shortage</small>
            </div>
          </div>
        </div>
        <div class="row g-2 mt-2">
          <div class="col-md-3">
            <div class="p-3 bg-warning text-dark rounded text-center" data-bs-toggle="tooltip" title="Moderate demand: DevOps Engineers">
              <strong>DevOps</strong><br>
              <small>Moderate</small>
            </div>
          </div>
          <div class="col-md-3">
            <div class="p-3 bg-success text-white rounded text-center" data-bs-toggle="tooltip" title="Good supply: QA Engineers">
              <strong>QA Engineers</strong><br>
              <small>Good Supply</small>
            </div>
          </div>
          <div class="col-md-3">
            <div class="p-3 bg-danger text-white rounded text-center" data-bs-toggle="tooltip" title="High demand: Data Scientists">
              <strong>Data Scientists</strong><br>
              <small>High Demand</small>
            </div>
          </div>
          <div class="col-md-3">
            <div class="p-3 bg-warning text-dark rounded text-center" data-bs-toggle="tooltip" title="Moderate demand: Mobile Developers">
              <strong>Mobile Dev</strong><br>
              <small>Moderate</small>
            </div>
          </div>
        </div>
        <a href="#" class="explore-link" onclick="navigate('recruiter-strategy'); return false;">Explore</a>
      </div>
    </div>
    
    <div class="row g-4">
      <!-- Candidate Matching Table -->
      <div class="col-md-7">
        <div class="card card-uniform h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="card-title mb-0">Candidate Matching</h5>
                <div class="form-check form-switch mb-0">
                  <input class="form-check-input" type="checkbox" id="blindMode">
                  <label class="form-check-label text-white" for="blindMode">Blind Mode</label>
                </div>
            </div>
            <div class="table-responsive">
                <table class="table table-hover mb-0 text-white">
                  <thead>
                    <tr>
                      <th class="text-white">Candidate</th>
                      <th class="text-white">Match Score</th>
                      <th class="text-white">Skills</th>
                      <th class="text-white">Experience</th>
                      <th class="text-white">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Sarah Johnson</td>
                      <td><span class="badge bg-success">96%</span></td>
                      <td>React, TypeScript, Node.js</td>
                      <td>5 years</td>
                      <td><button class="btn btn-sm btn-outline-primary">View</button></td>
                    </tr>
                    <tr>
                      <td>Michael Chen</td>
                      <td><span class="badge bg-success">92%</span></td>
                      <td>Vue, JavaScript, Python</td>
                      <td>4 years</td>
                      <td><button class="btn btn-sm btn-outline-primary">View</button></td>
                    </tr>
                    <tr>
                      <td>Emily Davis</td>
                      <td><span class="badge bg-warning text-dark">85%</span></td>
                      <td>React, CSS, GraphQL</td>
                      <td>3 years</td>
                      <td><button class="btn btn-sm btn-outline-primary">View</button></td>
                    </tr>
                    <tr>
                      <td>James Wilson</td>
                      <td><span class="badge bg-warning text-dark">82%</span></td>
                      <td>Angular, Java, AWS</td>
                      <td>6 years</td>
                      <td><button class="btn btn-sm btn-outline-primary">View</button></td>
                    </tr>
                  </tbody>
                </table>
            </div>
            <a href="#" class="explore-link" onclick="navigate('recruiter-search'); return false;">Explore</a>
          </div>
        </div>
      </div>
      
      <!-- Cost vs Build Calculator -->
      <div class="col-md-5">
        <div class="card card-uniform h-100">
          <div class="card-body">
            <h5 class="card-title">Cost vs. Build Calculator</h5>
            <canvas id="costBuildChart"></canvas>
            <a href="#" class="explore-link" onclick="navigate('recruiter-strategy'); return false;">Explore</a>
          </div>
        </div>
      </div>
    </div>
  `;

  // Initialize tooltips
  const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
  tooltipTriggerList.forEach(el => new bootstrap.Tooltip(el));

  // Cost vs Build Grouped Bar Chart
  createChart('costBuildChart', {
    type: 'bar',
    data: {
      labels: ['Junior Dev', 'Mid Dev', 'Senior Dev', 'Lead Dev'],
      datasets: [
        {
          label: 'Hire Cost ($k)',
          data: [75, 110, 150, 200],
          backgroundColor: 'rgba(54, 162, 235, 0.8)'
        },
        {
          label: 'Train/Build Cost ($k)',
          data: [45, 65, 90, 120],
          backgroundColor: 'rgba(255, 159, 64, 0.8)'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.1)' },
          ticks: { color: '#adb5bd' }
        },
        x: {
          grid: { color: 'rgba(255,255,255,0.1)' },
          ticks: { color: '#adb5bd' }
        }
      },
      plugins: {
        legend: { labels: { color: '#adb5bd' } }
      }
    }
  });
}

function renderCandidateSearch() {
  const content = document.getElementById('content-area');
  
  const candidates = [
    { name: 'Sarah Johnson', role: 'Frontend Developer', skills: ['React', 'TypeScript', 'Node.js'], experience: '5 years', match: 96 },
    { name: 'Michael Chen', role: 'Full Stack Developer', skills: ['Vue', 'Python', 'PostgreSQL'], experience: '4 years', match: 92 },
    { name: 'Emily Davis', role: 'UI Developer', skills: ['React', 'CSS', 'GraphQL'], experience: '3 years', match: 85 },
    { name: 'James Wilson', role: 'Backend Developer', skills: ['Java', 'Spring', 'AWS'], experience: '6 years', match: 82 }
  ];

  content.innerHTML = `
    <h4 class="mb-4">Candidate Search</h4>
    <div class="row g-4">
      <!-- Search & Candidate List -->
      <div class="col-md-5">
        <div class="card">
          <div class="card-header">
            <i class="bi bi-search me-2"></i>Find Candidates
          </div>
          <div class="card-body">
            <div class="input-group mb-3">
              <input type="text" class="form-control" placeholder="Search by skills, role...">
              <button class="btn btn-primary"><i class="bi bi-search"></i></button>
            </div>
            <div class="list-group" id="candidateList">
              ${candidates.map((c, i) => `
                <a href="#" class="list-group-item list-group-item-action ${i === 0 ? 'active' : ''}" data-candidate="${i}">
                  <div class="d-flex justify-content-between">
                    <strong>${c.name}</strong>
                    <span class="badge ${c.match >= 90 ? 'bg-success' : 'bg-warning text-dark'}">${c.match}%</span>
                  </div>
                  <small class="${i === 0 ? 'text-light' : 'text-muted'}">${c.role} · ${c.experience}</small>
                </a>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Selected Candidate Profile -->
      <div class="col-md-7">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span><i class="bi bi-person me-2"></i>Candidate Profile</span>
            <span class="badge bg-success fs-6">96% Match</span>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-6">
                <h5>Sarah Johnson</h5>
                <p class="text-muted mb-1">Frontend Developer</p>
                <p class="text-muted mb-3">5 years experience</p>
                <h6>Skills</h6>
                <div class="mb-3">
                  <span class="badge bg-primary me-1">React</span>
                  <span class="badge bg-primary me-1">TypeScript</span>
                  <span class="badge bg-primary me-1">Node.js</span>
                  <span class="badge bg-secondary me-1">GraphQL</span>
                  <span class="badge bg-secondary me-1">AWS</span>
                </div>
                <h6>Education</h6>
                <p class="small text-muted">B.S. Computer Science, Stanford University</p>
              </div>
              <div class="col-md-6">
                <h6 class="text-center mb-3">Skill Gap Analysis</h6>
                <canvas id="candidateSkillRadar"></canvas>
              </div>
            </div>
          </div>
          <div class="card-footer">
            <button class="btn btn-primary me-2"><i class="bi bi-envelope me-1"></i>Contact</button>
            <button class="btn btn-outline-secondary me-2"><i class="bi bi-bookmark me-1"></i>Save</button>
            <button class="btn btn-outline-secondary"><i class="bi bi-share me-1"></i>Share</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Candidate Skill Radar
  createChart('candidateSkillRadar', {
    type: 'radar',
    data: {
      labels: ['React', 'TypeScript', 'Node.js', 'System Design', 'AWS', 'Testing'],
      datasets: [
        {
          label: 'Candidate',
          data: [95, 85, 80, 65, 50, 70],
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 2
        },
        {
          label: 'Role Requirements',
          data: [90, 90, 75, 70, 60, 80],
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        r: {
          beginAtZero: true,
          max: 100
        }
      }
    }
  });
}

function renderHiringStrategy() {
  const content = document.getElementById('content-area');
  content.innerHTML = `
    <h4 class="mb-4">Hiring Strategy Planner</h4>
    
    <!-- Define Scenario -->
    <div class="card mb-4">
      <div class="card-header">
        <i class="bi bi-sliders me-2"></i>Define Scenario
      </div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-3">
            <label class="form-label">Role Type</label>
            <select class="form-select">
              <option>Frontend Developer</option>
              <option>Backend Developer</option>
              <option>Full Stack Developer</option>
              <option>DevOps Engineer</option>
              <option>Data Scientist</option>
            </select>
          </div>
          <div class="col-md-3">
            <label class="form-label">Seniority Level</label>
            <select class="form-select">
              <option>Junior</option>
              <option selected>Mid-Level</option>
              <option>Senior</option>
              <option>Lead</option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label">Headcount</label>
            <input type="number" class="form-control" value="3">
          </div>
          <div class="col-md-2">
            <label class="form-label">Timeline</label>
            <select class="form-select">
              <option>1 month</option>
              <option selected>3 months</option>
              <option>6 months</option>
              <option>12 months</option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label">Location</label>
            <select class="form-select">
              <option selected>Remote</option>
              <option>On-site</option>
              <option>Hybrid</option>
            </select>
          </div>
        </div>
        <div class="row g-3 mt-2">
          <div class="col-md-4">
            <label class="form-label">Budget per Hire</label>
            <div class="input-group">
              <span class="input-group-text">$</span>
              <input type="number" class="form-control" value="120000">
            </div>
          </div>
          <div class="col-md-4">
            <label class="form-label">Strategy</label>
            <select class="form-select">
              <option selected>Hire Externally</option>
              <option>Train Internal</option>
              <option>Hybrid Approach</option>
            </select>
          </div>
          <div class="col-md-4 d-flex align-items-end">
            <button class="btn btn-primary w-100">
              <i class="bi bi-calculator me-2"></i>Calculate Impact
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Projected Impact -->
    <div class="card">
      <div class="card-header bg-success text-white">
        <i class="bi bi-graph-up me-2"></i>Projected Impact
      </div>
      <div class="card-body">
        <div class="row g-4 text-center">
          <div class="col-md-3">
            <div class="border rounded p-3">
              <h2 class="text-primary mb-0">$360k</h2>
              <small class="text-muted">Total Cost</small>
            </div>
          </div>
          <div class="col-md-3">
            <div class="border rounded p-3">
              <h2 class="text-success mb-0">45 days</h2>
              <small class="text-muted">Avg. Time to Hire</small>
            </div>
          </div>
          <div class="col-md-3">
            <div class="border rounded p-3">
              <h2 class="text-info mb-0">87%</h2>
              <small class="text-muted">Success Probability</small>
            </div>
          </div>
          <div class="col-md-3">
            <div class="border rounded p-3">
              <h2 class="text-warning mb-0">+23%</h2>
              <small class="text-muted">Team Capacity Increase</small>
            </div>
          </div>
        </div>
        <div class="alert alert-info mt-4 mb-0">
          <i class="bi bi-lightbulb me-2"></i>
          <strong>AI Recommendation:</strong> Based on current market conditions, consider a hybrid approach. 
          Train 1 internal candidate while hiring 2 externally to reduce costs by 18% and improve retention.
        </div>
      </div>
    </div>
  `;
}

// ============================================================================
// AUDITOR VIEWS
// ============================================================================

function renderAuditorHome() {
  const content = document.getElementById('content-area');
  content.innerHTML = `
    <h4 class="mb-4">AI Governance Dashboard</h4>
    
    <!-- Traffic Light Status Banner -->
    <div class="alert alert-danger d-flex align-items-center mb-4">
      <div class="me-4">
        <i class="bi bi-circle-fill text-success fs-3 me-2"></i>
        <i class="bi bi-circle-fill text-warning fs-3 me-2"></i>
        <i class="bi bi-circle-fill text-danger fs-3"></i>
      </div>
      <div class="flex-grow-1">
        <strong>System Status:</strong> Attention Required
      </div>
      <span class="badge bg-danger fs-6">
        <i class="bi bi-exclamation-triangle me-1"></i>Risk Detected
      </span>
    </div>
    
    <div class="row g-4">
      <!-- Fairness Monitor -->
      <div class="col-md-4">
        <div class="card card-uniform h-100">
          <div class="card-body">
            <h5 class="card-title">Fairness Monitor</h5>
            <div class="alert alert-warning small py-2 mb-3">
              <i class="bi bi-exclamation-triangle me-1"></i>
              Gender disparity detected in Senior roles
            </div>
            <canvas id="fairnessChart"></canvas>
            <a href="#" class="explore-link" onclick="navigate('auditor-reports'); return false;">Explore</a>
          </div>
        </div>
      </div>
      
      <!-- Black Box Decision Log -->
      <div class="col-md-4">
        <div class="card card-uniform h-100">
          <div class="card-body">
            <h5 class="card-title">Black Box Decision Log</h5>
            <div class="input-group input-group-sm mb-3">
              <input type="text" class="form-control" placeholder="Search decisions...">
              <button class="btn btn-outline-secondary"><i class="bi bi-search"></i></button>
            </div>
            <div class="list-group list-group-flush overflow-auto mb-3" style="max-height: 250px;">
              <div class="list-group-item small bg-transparent text-white border-secondary">
                <div class="d-flex justify-content-between">
                  <strong>Candidate #4521</strong>
                  <span class="badge bg-danger">Rejected</span>
                </div>
                <small class="text-muted">Score: 45 | Reason: Skill mismatch</small>
              </div>
              <div class="list-group-item small bg-transparent text-white border-secondary">
                <div class="d-flex justify-content-between">
                  <strong>Candidate #4520</strong>
                  <span class="badge bg-success">Approved</span>
                </div>
                <small class="text-muted">Score: 92 | Top match for role</small>
              </div>
              <div class="list-group-item small bg-transparent text-white border-secondary">
                <div class="d-flex justify-content-between">
                  <strong>Candidate #4519</strong>
                  <span class="badge bg-warning text-dark">Pending</span>
                </div>
                <small class="text-muted">Score: 78 | Needs review</small>
              </div>
              <div class="list-group-item small bg-transparent text-white border-secondary">
                <div class="d-flex justify-content-between">
                  <strong>Candidate #4518</strong>
                  <span class="badge bg-success">Approved</span>
                </div>
                <small class="text-muted">Score: 88 | Strong skills match</small>
              </div>
              <div class="list-group-item small bg-transparent text-white border-secondary">
                <div class="d-flex justify-content-between">
                  <strong>Candidate #4517</strong>
                  <span class="badge bg-danger">Rejected</span>
                </div>
                <small class="text-muted">Score: 32 | Experience gap</small>
              </div>
            </div>
            <a href="#" class="explore-link" onclick="navigate('auditor-logs'); return false;">Explore</a>
          </div>
        </div>
      </div>
      
      <!-- Privacy Shield -->
      <div class="col-md-4">
        <div class="card card-uniform h-100">
          <div class="card-body">
            <h5 class="card-title">Privacy Shield</h5>
            <div class="text-center mb-3">
              <div class="position-relative d-inline-block" style="width: 120px; height: 120px;">
                <svg viewBox="0 0 36 36" class="w-100 h-100">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#444" stroke-width="3"/>
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#198754" stroke-width="3" stroke-dasharray="85, 100"/>
                </svg>
                <div class="position-absolute top-50 start-50 translate-middle">
                  <strong class="fs-4 text-white">85%</strong>
                </div>
              </div>
              <div class="small text-muted mt-2">Compliance Score</div>
            </div>
            <div class="form-check form-switch mb-2">
              <input class="form-check-input" type="checkbox" id="piiMasking" checked>
              <label class="form-check-label small text-white" for="piiMasking">PII Auto-Masking</label>
            </div>
            <div class="form-check form-switch mb-2">
              <input class="form-check-input" type="checkbox" id="dataRetention" checked>
              <label class="form-check-label small text-white" for="dataRetention">Data Retention Policy</label>
            </div>
            <div class="form-check form-switch mb-3">
              <input class="form-check-input" type="checkbox" id="auditTrail" checked>
              <label class="form-check-label small text-white" for="auditTrail">Audit Trail Enabled</label>
            </div>
            <button class="btn btn-danger w-100 btn-sm mb-2">
              <i class="bi bi-trash me-1"></i>Purge Expired Data
            </button>
            <a href="#" class="explore-link" onclick="navigate('auditor-matrix'); return false;">Explore</a>
          </div>
        </div>
      </div>
    </div>
  `;

  // Fairness Chart (Grouped Bar)
  createChart('fairnessChart', {
    type: 'bar',
    data: {
      labels: ['Junior', 'Mid', 'Senior', 'Lead'],
      datasets: [
        {
          label: 'Male',
          data: [45, 52, 68, 75],
          backgroundColor: 'rgba(54, 162, 235, 0.8)'
        },
        {
          label: 'Female',
          data: [55, 48, 32, 25],
          backgroundColor: 'rgba(255, 99, 132, 0.8)'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        title: {
          display: true,
          text: 'Hiring by Gender (%)',
          color: '#adb5bd'
        },
        legend: {
            labels: { color: '#adb5bd' }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          grid: { color: 'rgba(255,255,255,0.1)' },
          ticks: { color: '#adb5bd' }
        },
        x: {
            grid: { color: 'rgba(255,255,255,0.1)' },
            ticks: { color: '#adb5bd' }
        }
      }
    }
  });
}

function renderAuditLogs() {
  const content = document.getElementById('content-area');
  
  const logs = [
    { id: 'LOG-001', timestamp: '2026-01-13 14:32:15', action: 'Candidate Scored', actor: 'AI Engine', target: 'Candidate #4521', result: 'Score: 45', vector: { skills: 0.3, experience: 0.2, culture: 0.15, education: 0.35 } },
    { id: 'LOG-002', timestamp: '2026-01-13 14:30:42', action: 'Application Rejected', actor: 'AI Engine', target: 'Candidate #4521', result: 'Threshold not met', vector: { skills: 0.3, experience: 0.2, culture: 0.15, education: 0.35 } },
    { id: 'LOG-003', timestamp: '2026-01-13 14:28:11', action: 'Candidate Scored', actor: 'AI Engine', target: 'Candidate #4520', result: 'Score: 92', vector: { skills: 0.85, experience: 0.9, culture: 0.88, education: 0.95 } },
    { id: 'LOG-004', timestamp: '2026-01-13 14:25:33', action: 'Application Approved', actor: 'AI Engine', target: 'Candidate #4520', result: 'Passed to recruiter', vector: { skills: 0.85, experience: 0.9, culture: 0.88, education: 0.95 } },
    { id: 'LOG-005', timestamp: '2026-01-13 14:20:05', action: 'Bias Check', actor: 'Fairness Monitor', target: 'Senior Dev Pipeline', result: 'Warning: Gender disparity', vector: { male_ratio: 0.68, female_ratio: 0.32, threshold: 0.4 } },
    { id: 'LOG-006', timestamp: '2026-01-13 14:15:22', action: 'Data Access', actor: 'Recruiter: John Smith', target: 'Candidate #4519', result: 'Profile viewed', vector: null },
    { id: 'LOG-007', timestamp: '2026-01-13 14:10:18', action: 'Model Update', actor: 'System', target: 'Scoring Model v2.3', result: 'Deployed', vector: { accuracy: 0.94, fairness: 0.89, recall: 0.91 } }
  ];

  content.innerHTML = `
    <h4 class="mb-4">Audit Logs</h4>
    
    <!-- Filters -->
    <div class="card mb-4">
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-3">
            <input type="text" class="form-control" placeholder="Search logs...">
          </div>
          <div class="col-md-2">
            <select class="form-select">
              <option value="">All Actions</option>
              <option>Candidate Scored</option>
              <option>Application Approved</option>
              <option>Application Rejected</option>
              <option>Bias Check</option>
              <option>Data Access</option>
              <option>Model Update</option>
            </select>
          </div>
          <div class="col-md-2">
            <select class="form-select">
              <option value="">All Actors</option>
              <option>AI Engine</option>
              <option>Fairness Monitor</option>
              <option>System</option>
              <option>Human</option>
            </select>
          </div>
          <div class="col-md-2">
            <input type="date" class="form-control" value="2026-01-13">
          </div>
          <div class="col-md-2">
            <input type="date" class="form-control" value="2026-01-13">
          </div>
          <div class="col-md-1">
            <button class="btn btn-primary w-100"><i class="bi bi-funnel"></i></button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Logs Table -->
    <div class="card">
      <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead class="table-light">
            <tr>
              <th>Log ID</th>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Actor</th>
              <th>Target</th>
              <th>Result</th>
              <th>Reasoning Vector</th>
            </tr>
          </thead>
          <tbody>
            ${logs.map(log => `
              <tr>
                <td><code>${log.id}</code></td>
                <td class="small">${log.timestamp}</td>
                <td>${log.action}</td>
                <td>${log.actor}</td>
                <td>${log.target}</td>
                <td><span class="badge ${log.result.includes('Warning') ? 'bg-warning text-dark' : 'bg-secondary'}">${log.result}</span></td>
                <td>
                  ${log.vector ? `
                    <button class="btn btn-sm btn-outline-info vector-btn" 
                      data-bs-toggle="popover" 
                      data-bs-trigger="click"
                      data-bs-html="true"
                      data-bs-title="Score Weights"
                      data-bs-content="${Object.entries(log.vector).map(([k, v]) => `<strong>${k}:</strong> ${v}`).join('<br>')}">
                      <i class="bi bi-info-circle"></i> View
                    </button>
                  ` : '<span class="text-muted">N/A</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Initialize popovers
  const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
  popoverTriggerList.forEach(el => new bootstrap.Popover(el));
}

function renderRiskMatrix() {
  const content = document.getElementById('content-area');
  content.innerHTML = `
    <h4 class="mb-4">Risk Matrix</h4>
    
    <div class="card">
      <div class="card-header">
        <i class="bi bi-grid-3x3 me-2"></i>AI Risk Assessment (Likelihood vs Impact)
      </div>
      <div class="card-body">
        <canvas id="riskMatrixChart" style="max-height: 500px;"></canvas>
      </div>
      <div class="card-footer">
        <div class="row text-center small">
          <div class="col">
            <span class="badge bg-success me-1">&nbsp;</span> Low Risk
          </div>
          <div class="col">
            <span class="badge bg-warning me-1">&nbsp;</span> Medium Risk
          </div>
          <div class="col">
            <span class="badge bg-danger me-1">&nbsp;</span> High Risk
          </div>
        </div>
      </div>
    </div>
  `;

  // Risk Matrix Scatter/Bubble Chart
  createChart('riskMatrixChart', {
    type: 'bubble',
    data: {
      datasets: [
        {
          label: 'Bias in Scoring',
          data: [{ x: 4, y: 4.5, r: 20 }],
          backgroundColor: 'rgba(255, 99, 132, 0.7)',
          borderColor: 'rgba(255, 99, 132, 1)'
        },
        {
          label: 'Data Breach',
          data: [{ x: 2, y: 5, r: 15 }],
          backgroundColor: 'rgba(255, 99, 132, 0.7)',
          borderColor: 'rgba(255, 99, 132, 1)'
        },
        {
          label: 'Model Drift',
          data: [{ x: 3.5, y: 3, r: 18 }],
          backgroundColor: 'rgba(255, 206, 86, 0.7)',
          borderColor: 'rgba(255, 206, 86, 1)'
        },
        {
          label: 'Compliance Violation',
          data: [{ x: 2.5, y: 4, r: 16 }],
          backgroundColor: 'rgba(255, 206, 86, 0.7)',
          borderColor: 'rgba(255, 206, 86, 1)'
        },
        {
          label: 'UI Errors',
          data: [{ x: 4, y: 1.5, r: 12 }],
          backgroundColor: 'rgba(75, 192, 192, 0.7)',
          borderColor: 'rgba(75, 192, 192, 1)'
        },
        {
          label: 'Slow Response',
          data: [{ x: 3, y: 1, r: 10 }],
          backgroundColor: 'rgba(75, 192, 192, 0.7)',
          borderColor: 'rgba(75, 192, 192, 1)'
        },
        {
          label: 'Privacy Leakage',
          data: [{ x: 1.5, y: 4.5, r: 14 }],
          backgroundColor: 'rgba(255, 206, 86, 0.7)',
          borderColor: 'rgba(255, 206, 86, 1)'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        x: {
          title: {
            display: true,
            text: 'Likelihood',
            font: { weight: 'bold' }
          },
          min: 0,
          max: 5,
          ticks: {
            stepSize: 1,
            callback: (value) => ['', 'Very Low', 'Low', 'Medium', 'High', 'Very High'][value] || ''
          }
        },
        y: {
          title: {
            display: true,
            text: 'Impact',
            font: { weight: 'bold' }
          },
          min: 0,
          max: 5,
          ticks: {
            stepSize: 1,
            callback: (value) => ['', 'Negligible', 'Minor', 'Moderate', 'Major', 'Critical'][value] || ''
          }
        }
      },
      plugins: {
        legend: {
          position: 'right'
        }
      }
    }
  });
}

function renderComplianceReports() {
  const content = document.getElementById('content-area');
  
  const reports = [
    { name: 'GDPR Compliance Report', description: 'Data protection and privacy compliance status', icon: 'bi-shield-check', lastGenerated: '2026-01-10' },
    { name: 'Bias Audit Report', description: 'AI fairness and bias detection analysis', icon: 'bi-balance-scale', lastGenerated: '2026-01-08' },
    { name: 'EEOC Compliance Report', description: 'Equal employment opportunity metrics', icon: 'bi-people', lastGenerated: '2026-01-05' },
    { name: 'Data Retention Report', description: 'PII storage and retention policy adherence', icon: 'bi-database', lastGenerated: '2026-01-12' },
    { name: 'Model Performance Report', description: 'AI model accuracy and drift analysis', icon: 'bi-graph-up', lastGenerated: '2026-01-11' },
    { name: 'Access Audit Report', description: 'User access patterns and security review', icon: 'bi-key', lastGenerated: '2026-01-09' }
  ];

  content.innerHTML = `
    <h4 class="mb-4">Compliance Reports</h4>
    
    <div class="row g-3">
      ${reports.map(report => `
        <div class="col-md-6">
          <div class="card">
            <div class="card-body d-flex align-items-center">
              <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 50px; height: 50px;">
                <i class="${report.icon} fs-4"></i>
              </div>
              <div class="flex-grow-1">
                <h6 class="mb-1">${report.name}</h6>
                <p class="small text-muted mb-0">${report.description}</p>
                <small class="text-muted">Last generated: ${report.lastGenerated}</small>
              </div>
              <button class="btn btn-primary">
                <i class="bi bi-file-earmark-arrow-down me-1"></i>Generate
              </button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
    
    <div class="card mt-4">
      <div class="card-header">
        <i class="bi bi-calendar-check me-2"></i>Scheduled Reports
      </div>
      <div class="card-body">
        <table class="table table-sm mb-0">
          <thead>
            <tr>
              <th>Report</th>
              <th>Frequency</th>
              <th>Next Run</th>
              <th>Recipients</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>GDPR Compliance</td>
              <td>Weekly</td>
              <td>2026-01-20</td>
              <td>compliance@company.com</td>
              <td><span class="badge bg-success">Active</span></td>
            </tr>
            <tr>
              <td>Bias Audit</td>
              <td>Monthly</td>
              <td>2026-02-01</td>
              <td>hr@company.com, legal@company.com</td>
              <td><span class="badge bg-success">Active</span></td>
            </tr>
            <tr>
              <td>Model Performance</td>
              <td>Daily</td>
              <td>2026-01-14</td>
              <td>mlops@company.com</td>
              <td><span class="badge bg-success">Active</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  renderShell('seeker');
  navigate('seeker-home');
});

// Expose switchRole globally for console access
window.switchRole = switchRole;
