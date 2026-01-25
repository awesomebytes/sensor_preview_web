import type { AppState } from '../types/state';

const STORAGE_KEY = 'sensor-preview-state';

export function saveState(state: AppState): void {
  try {
    const json = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, json);
  } catch (error) {
    console.error('Failed to save state to localStorage:', error);
  }
}

export function loadState(): AppState | null {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) {
      return null;
    }
    return JSON.parse(json) as AppState;
  } catch (error) {
    console.error('Failed to load state from localStorage:', error);
    return null;
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear state from localStorage:', error);
  }
}
