// ============================================================================
// ROUTER
// ============================================================================

import { destroyAllCharts } from './charts.js';
import { renderSettings } from './views/settings-view.js';
import { 
  renderSeekerHome, 
  renderSeekerProfile, 
  renderCareer, 
  renderSeekerJobs, 
  renderSeekerLearning 
} from './views/seeker-views.js';
import { 
  renderRecruiterHome, 
  renderCandidateSearch, 
  renderHiringStrategy 
} from './views/recruiter-views.js';
import { 
  renderAuditorHome, 
  renderAuditLogs, 
  renderRiskMatrix, 
  renderComplianceReports 
} from './views/auditor-views.js';

export function navigate(routeId) {
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
    'seeker-career': renderCareer,
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

// Make navigate globally available
window.navigate = navigate;

