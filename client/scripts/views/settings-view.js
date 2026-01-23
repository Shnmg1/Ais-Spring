// ============================================================================
// SETTINGS VIEW
// ============================================================================

import { setTheme } from '../theme.js';

export function renderSettings() {
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

// Make setTheme globally available for inline handlers
window.setTheme = setTheme;

