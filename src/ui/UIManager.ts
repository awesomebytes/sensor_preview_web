/**
 * UI orchestration - manages all UI components and their interactions.
 */
import type { App } from '../App';
import { SensorPanel } from './SensorPanel';
import { SettingsModal } from './SettingsModal';
import { HelpModal } from './HelpModal';
import { initTheme, toggleTheme } from '../utils/theme';

/**
 * Manages all UI components and coordinates their interactions.
 */
export class UIManager {
  private app: App;
  private sensorPanel: SensorPanel | null = null;
  private settingsModal: SettingsModal | null = null;
  private helpModal: HelpModal | null = null;

  constructor(app: App) {
    this.app = app;
  }

  /**
   * Initialize all UI components.
   */
  init(): void {
    // Initialize theme (must be early to prevent flash)
    initTheme();

    // Create sensor panel
    this.sensorPanel = new SensorPanel(this.app);
    this.sensorPanel.init();

    // Create settings modal
    this.settingsModal = new SettingsModal(this.app);
    this.settingsModal.init();

    // Create help modal
    this.helpModal = new HelpModal();
    this.helpModal.init();

    // Setup header button handlers
    this.setupHeaderButtons();

    // Initial render
    this.render();
  }

  /**
   * Setup header button event handlers.
   */
  private setupHeaderButtons(): void {
    const resetViewBtn = document.getElementById('reset-view-btn');
    if (resetViewBtn) {
      resetViewBtn.addEventListener('click', () => {
        this.app.resetCamera();
      });
    }

    // Settings button - opens projection settings modal
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        this.settingsModal?.toggle();
      });
    }

    // Help button - opens help modal
    const helpBtn = document.getElementById('help-btn');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => {
        this.helpModal?.toggle();
      });
    }

    // Theme toggle button
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        toggleTheme();
      });
    }
  }

  /**
   * Re-render all UI components based on current app state.
   */
  render(): void {
    if (this.sensorPanel) {
      const state = this.app.getState();
      this.sensorPanel.render(state);
    }
  }

  /**
   * Only re-render the sensor list (not the config panel).
   */
  renderSensorList(): void {
    if (this.sensorPanel) {
      const state = this.app.getState();
      this.sensorPanel.renderSensorListOnly(state);
    }
  }

  /**
   * Dispose of all UI resources.
   */
  dispose(): void {
    if (this.sensorPanel) {
      this.sensorPanel.dispose();
    }
    if (this.settingsModal) {
      this.settingsModal.dispose();
    }
    if (this.helpModal) {
      this.helpModal.dispose();
    }
  }
}
