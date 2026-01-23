// ============================================================================
// THEME MANAGEMENT
// ============================================================================

export function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  
  // Re-render settings if currently on settings page to update radio buttons
  const settingsRadio = document.getElementById('theme' + (theme.charAt(0).toUpperCase() + theme.slice(1)));
  if (settingsRadio) {
    settingsRadio.checked = true;
  }
}

export function initTheme() {
  const storedTheme = localStorage.getItem('theme') || 'dark';
  setTheme(storedTheme);
}

