/**
 * UI orchestration - manages all UI components and their interactions.
 */
import type { SensorManager } from '../sensors/SensorManager';
import type { PreviewPanel } from './PreviewPanel';
import type { Scene } from '../core/Scene';
import type { SensorConfig, CameraSensorConfig } from '../types/sensors';
import { SensorPanel } from './SensorPanel';
import { CameraSensor } from '../sensors/CameraSensor';

/**
 * Callback for when sensor selection changes.
 */
export type SensorSelectionCallback = (sensorId: string | null) => void;

/**
 * Manages all UI components and coordinates their interactions.
 */
export class UIManager {
  private sensorManager: SensorManager;
  private previewPanel: PreviewPanel;
  private scene: Scene;

  private sensorPanel: SensorPanel | null = null;
  private selectedSensorId: string | null = null;

  // External selection callbacks
  private selectionCallbacks: SensorSelectionCallback[] = [];

  constructor(
    sensorManager: SensorManager,
    previewPanel: PreviewPanel,
    scene: Scene
  ) {
    this.sensorManager = sensorManager;
    this.previewPanel = previewPanel;
    this.scene = scene;
  }

  /**
   * Initialize all UI components.
   */
  init(): void {
    // Create sensor panel
    this.sensorPanel = new SensorPanel(
      this.sensorManager,
      (id) => this.onSensorSelect(id),
      () => this.onSensorsChanged()
    );

    this.sensorPanel.init();

    // Initial render
    this.refreshSensorList();
  }

  /**
   * Handle sensor selection.
   */
  private onSensorSelect(sensorId: string | null): void {
    this.selectedSensorId = sensorId;

    // Update config panel
    if (this.sensorPanel) {
      if (sensorId) {
        const sensor = this.sensorManager.getSensor(sensorId);
        if (sensor) {
          this.sensorPanel.showConfigPanel(sensor.getConfig());
        }
      } else {
        this.sensorPanel.hideConfigPanel();
      }
    }

    // Update preview panel (only for cameras)
    if (sensorId) {
      const sensor = this.sensorManager.getSensor(sensorId);
      if (sensor instanceof CameraSensor) {
        this.previewPanel.setCamera(sensor);
      } else {
        this.previewPanel.setCamera(null);
      }
    } else {
      this.previewPanel.setCamera(null);
    }

    // Notify external callbacks
    for (const callback of this.selectionCallbacks) {
      callback(sensorId);
    }
  }

  /**
   * Handle sensors changed (added/removed/updated).
   */
  private onSensorsChanged(): void {
    this.refreshSensorList();
  }

  /**
   * Refresh the sensor list display.
   */
  refreshSensorList(): void {
    if (this.sensorPanel) {
      const configs = this.sensorManager.getAllConfigs();
      this.sensorPanel.renderSensorList(configs, this.selectedSensorId);
    }
  }

  /**
   * Select a sensor by ID.
   */
  selectSensor(sensorId: string | null): void {
    this.onSensorSelect(sensorId);
    this.refreshSensorList();
  }

  /**
   * Get the currently selected sensor ID.
   */
  getSelectedSensorId(): string | null {
    return this.selectedSensorId;
  }

  /**
   * Register a callback for sensor selection changes.
   */
  onSensorSelection(callback: SensorSelectionCallback): void {
    this.selectionCallbacks.push(callback);
  }

  /**
   * Update sensor config and refresh UI.
   */
  updateSensorConfig(sensorId: string, changes: Partial<SensorConfig>): void {
    this.sensorManager.updateSensor(sensorId, changes);
    this.refreshSensorList();

    // If this is the selected sensor, update config panel
    if (sensorId === this.selectedSensorId && this.sensorPanel) {
      const sensor = this.sensorManager.getSensor(sensorId);
      if (sensor) {
        // Note: config panel is updated in real-time through input events,
        // this is for when the sensor is updated from elsewhere
      }
    }
  }

  /**
   * Dispose of all UI resources.
   */
  dispose(): void {
    if (this.sensorPanel) {
      this.sensorPanel.dispose();
    }
    this.selectionCallbacks = [];
  }
}
