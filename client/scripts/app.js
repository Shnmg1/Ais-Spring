// ============================================================================
// TalentFlow SPA - Main Application Entry Point
// ============================================================================

import { initTheme } from './theme.js';
import { renderShell } from './navigation.js';
import { navigate } from './router.js';

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  renderShell('seeker');
  navigate('seeker-home');
});
