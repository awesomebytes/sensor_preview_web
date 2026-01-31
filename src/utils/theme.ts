/**
 * Theme management utilities.
 * Handles dark/light theme switching with system preference detection.
 */

const THEME_STORAGE_KEY = 'sensor-preview-theme';

export type Theme = 'light' | 'dark' | 'auto';

/**
 * Get the current effective theme (what's actually displayed).
 */
export function getEffectiveTheme(): 'light' | 'dark' {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  
  if (stored === 'light') return 'light';
  if (stored === 'dark') return 'dark';
  
  // Auto: check system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

/**
 * Get the stored theme preference.
 */
export function getStoredTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return 'auto';
}

/**
 * Set the theme.
 * @param theme The theme to set ('light', 'dark', or 'auto')
 */
export function setTheme(theme: Theme): void {
  if (theme === 'auto') {
    localStorage.removeItem(THEME_STORAGE_KEY);
    document.documentElement.removeAttribute('data-theme');
  } else {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
  }
}

/**
 * Toggle between light and dark themes.
 * If currently on auto, will switch to the opposite of system preference.
 */
export function toggleTheme(): void {
  const current = getEffectiveTheme();
  const newTheme = current === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
}

/**
 * Initialize theme based on stored preference or system default.
 * Should be called on app startup.
 */
export function initTheme(): void {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  
  if (stored === 'light' || stored === 'dark') {
    document.documentElement.setAttribute('data-theme', stored);
  }
  // If 'auto' or not set, don't set data-theme - CSS will use media query
}

/**
 * Check if the current theme is light.
 */
export function isLightTheme(): boolean {
  return getEffectiveTheme() === 'light';
}
