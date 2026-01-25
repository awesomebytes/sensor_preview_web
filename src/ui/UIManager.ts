/**
 * UI orchestration - manages all UI components and their interactions.
 */
import type { App } from '../App';
import { SensorPanel } from './SensorPanel';

/**
 * Manages all UI components and coordinates their interactions.
 */
export class UIManager {
  private app: App;
  private sensorPanel: SensorPanel | null = null;

  constructor(app: App) {
    this.app = app;
  }

  /**
   * Initialize all UI components.
   */
  init(): void {
    // Create sensor panel
    this.sensorPanel = new SensorPanel(this.app);
    this.sensorPanel.init();

    // Initial render
    this.render();
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
  }
}
