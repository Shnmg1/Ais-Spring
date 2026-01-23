// ============================================================================
// NAVIGATION & SHELL RENDERING
// ============================================================================

import { navData } from './config.js';
import { destroyAllCharts } from './charts.js';

// Current role state
let currentRole = 'seeker';

export function getCurrentRole() {
  return currentRole;
}

export function renderShell(role) {
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
    a.className = 'nav-link mb-2';
    a.href = '#';
    a.dataset.route = link.id;
    a.innerHTML = `<span class="nav-item-label"><i class="${link.icon} me-2"></i>${link.name}</span>`;
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
    <a href="#" class="nav-link me-3 text-dark">
      <span class="nav-item-label">AI Career Agent</span>
    </a>
    <i class="bi bi-bell fs-5 me-3" style="cursor: pointer;"></i>
    <div class="dropdown">
      <a class="d-flex align-items-center text-decoration-none dropdown-toggle text-dark" href="#" data-bs-toggle="dropdown" data-bs-display="static">
        <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2" style="width: 35px; height: 35px;">AC</div>
        <span>Alex Chen</span>
      </a>
      <ul class="dropdown-menu dropdown-menu-end animate-slide">
        <li><a class="dropdown-item" href="#" onclick="showPublicProfileModal(); return false;">Public Profile</a></li>
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

export function setupNavListeners() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;

  nav.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-route]');
    if (!link) return;
    e.preventDefault();

    // Update active state
    nav.querySelectorAll('.nav-link').forEach(l => {
      l.classList.remove('active');
    });
    link.classList.add('active');

    // Navigate
    navigate(link.dataset.route);
  });
}

export function switchRole(newRole) {
  if (!navData[newRole]) {
    console.error(`Unknown role: ${newRole}`);
    return;
  }
  destroyAllCharts();
  renderShell(newRole);
  navigate(`${newRole}-home`);
}

// Make switchRole globally available
window.switchRole = switchRole;

