import type { AppState, AppSettings, ProjectionSettings } from './types/state';
import type { SensorConfig, SensorType, CameraSensorConfig } from './types/sensors';
import { Scene } from './core/Scene';
import { SensorManager } from './sensors/SensorManager';
import { ScenarioManager } from './scenarios/ScenarioManager';
import { UIManager } from './ui/UIManager';
import { PreviewPanel } from './ui/PreviewPanel';
import { generateUuid } from './utils/uuid';
import { DEFAULT_STATE, DEFAULT_SETTINGS, DEFAULT_PROJECTION_SETTINGS } from './types/state';
import { saveState, loadState } from './utils/storage';
import { applyPreset } from './data/presets';

export class App {
  private state: AppState;
  private scene: Scene;
  private sensorManager: SensorManager;
  private scenarioManager: ScenarioManager;
  private uiManager: UIManager;
  private previewPanel: PreviewPanel;

  constructor() {
    this.state = this.getInitialState();
    this.scene = new Scene();
    this.sensorManager = new SensorManager(this.scene);
    this.scenarioManager = new ScenarioManager(
      (obj) => this.scene.addToWorld(obj),
      (obj) => this.scene.removeFromWorld(obj)
    );
    this.previewPanel = new PreviewPanel(this.scene.getRenderer());
    this.uiManager = new UIManager(this);
  }

  init(): void {
    // Initialize 3D scene
    const viewportEl = document.getElementById('viewport');
    if (!viewportEl) {
      throw new Error('Viewport element not found');
    }
    this.scene.init(viewportEl);

    // Initialize UI
    this.uiManager.init();

    // Set scene for initial scenario
    this.scene.setScenarioType(this.state.scenario);

    // Load scenario
    this.scenarioManager.loadScenario(this.state.scenario);

    // Load saved state or default
    this.loadSavedState();

    // Start render loop
    this.scene.getRenderManager().onBeforeRender((time: number, deltaTime: number) => {
      this.onRenderFrame(time, deltaTime);
    });
    this.scene.getRenderManager().start();
  }

  private getInitialState(): AppState {
    return {
      ...DEFAULT_STATE,
      settings: { 
        ...DEFAULT_SETTINGS,
        projection: { ...DEFAULT_PROJECTION_SETTINGS },
      },
    };
  }

  private loadSavedState(): void {
    const savedState = loadState();
    if (savedState) {
      console.log('Loading saved state:', savedState);
      
      // Backward compatibility: convert old 'household' to 'household-large'
      // and 'warehouse' to 'household-large' (warehouse was never implemented)
      if ((savedState.scenario as string) === 'household' || 
          (savedState.scenario as string) === 'warehouse') {
        savedState.scenario = 'household-large';
      }
      
      this.state = savedState;
      
      // Restore coordinate system
      this.scene.getCoordinateSystem().setCoordinateSystem(this.state.settings.coordinateSystem);
      
      // Restore scenario if different from default
      if (this.state.scenario !== this.scenarioManager.getCurrentType()) {
        this.scenarioManager.loadScenario(this.state.scenario);
      }
      
      // Restore sensors
      for (const sensorConfig of this.state.sensors) {
        this.sensorManager.createSensor(sensorConfig);
      }
      
      // Ensure projection settings exist (backward compatibility)
      if (!this.state.settings.projection) {
        this.state.settings.projection = { ...DEFAULT_PROJECTION_SETTINGS };
      }

      // Apply saved projection settings to all sensors and scene
      this.applyProjectionSettingsToAllSensors();
      this.applySceneSettings();
      
      // Update UI to reflect loaded state
      this.uiManager.render();
      
      // Select first sensor if any
      if (this.state.sensors.length > 0) {
        this.selectSensor(this.state.sensors[0].id);
      }
    }
  }

  private onRenderFrame(time: number, deltaTime: number): void {
    // Update camera preview if a camera is selected
    const selectedSensor = this.getSelectedSensor();
    if (selectedSensor && selectedSensor.type === 'camera') {
      const cameraSensor = this.sensorManager.getSensor(selectedSensor.id);
      if (cameraSensor) {
        this.previewPanel.update();
      }
    }
  }

  // State getters
  getState(): AppState {
    return this.state;
  }

  getSettings(): AppSettings {
    return this.state.settings;
  }

  getSelectedSensor(): SensorConfig | null {
    if (!this.state.selectedSensorId) {
      return null;
    }
    return this.state.sensors.find(s => s.id === this.state.selectedSensorId) || null;
  }

  // Sensor CRUD operations
  addSensor(type: SensorType, presetId?: string): string {
    // Create new sensor config
    const id = generateUuid();
    const baseSensor: Partial<SensorConfig> = {
      id,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${this.state.sensors.length + 1}`,
      type,
      enabled: true,
      position: { x: 0, y: 0, z: 1.5 },
      rotation: { roll: 0, pitch: 0, yaw: 0 },
      color: type === 'camera' ? '#00ff00' : '#0066ff',
    };

    // Apply preset if provided
    let sensorConfig: SensorConfig;
    if (presetId) {
      sensorConfig = applyPreset(baseSensor as SensorConfig, type, presetId);
      // Store the preset ID so we can show it in the dropdown
      sensorConfig.presetId = presetId;
    } else {
      // Default sensor config (custom, no preset)
      if (type === 'camera') {
        sensorConfig = {
          ...baseSensor,
          type: 'camera',
          hFov: 70,
          vFov: 43,
          resolutionH: 1920,
          resolutionV: 1080,
          minRange: 0.1,
          maxRange: 50,
          presetId: undefined, // Custom
        } as SensorConfig;
      } else if (type === 'lidar') {
        sensorConfig = {
          ...baseSensor,
          type: 'lidar',
          hFov: 360,
          vFov: 30,
          channels: 16,
          angularResH: 0.2,
          minRange: 0.1,
          maxRange: 100,
          showSlice: true,
          showVolume: true,
          showPointCloud: true,
          presetId: undefined, // Custom
          // pointCloudColor defaults to undefined, which means use sensor color
        } as SensorConfig;
      } else {
        throw new Error(`Unsupported sensor type: ${type}`);
      }
    }

    // Update state
    this.state = {
      ...this.state,
      sensors: [...this.state.sensors, sensorConfig],
      selectedSensorId: id,
    };

    // Create sensor in 3D scene
    const sensor = this.sensorManager.createSensor(sensorConfig);

    // Apply current projection settings
    const projection = this.state.settings.projection;
    if (projection) {
      sensor.updateAxesSize(projection.axesSize);
      sensor.updateLabelSize(projection.labelSize);
      
      if (type === 'lidar') {
        (sensor as any).setPointSize(projection.lidarPointSize);
      }
      
      if (type === 'camera') {
        // Use default frustum size unless overridden
        (sensor as any).setFrustumLength(projection.defaultFrustumSize);
      }
    }

    // Update UI
    this.uiManager.render();

    // Save state
    this.saveStateDebounced();

    console.log('Added sensor:', sensorConfig);
    return id;
  }

  removeSensor(id: string): void {
    // Remove from state
    this.state = {
      ...this.state,
      sensors: this.state.sensors.filter(s => s.id !== id),
      selectedSensorId: this.state.selectedSensorId === id ? null : this.state.selectedSensorId,
    };

    // Remove from 3D scene
    this.sensorManager.removeSensor(id);

    // Update UI
    this.uiManager.render();

    // Save state
    this.saveStateDebounced();

    console.log('Removed sensor:', id);
  }

  updateSensor(id: string, changes: Partial<SensorConfig>, updateUI = false): void {
    // Find sensor in state
    const sensorIndex = this.state.sensors.findIndex(s => s.id === id);
    if (sensorIndex === -1) {
      console.warn('Sensor not found:', id);
      return;
    }

    const oldConfig = this.state.sensors[sensorIndex];
    const newConfig = { ...oldConfig, ...changes } as SensorConfig;

    // Update state
    const newSensors = [...this.state.sensors];
    newSensors[sensorIndex] = newConfig;
    this.state = {
      ...this.state,
      sensors: newSensors,
    };

    // Update 3D sensor
    this.sensorManager.updateSensor(id, newConfig);

    // Handle camera-specific updates
    if (newConfig.type === 'camera') {
      const camConfig = newConfig as CameraSensorConfig;
      const sensor = this.sensorManager.getSensor(id);
      if (sensor) {
        // Update frustum length based on override setting
        const projection = this.state.settings.projection;
        if (camConfig.overrideFrustumSize) {
          (sensor as any).setFrustumLength(camConfig.maxRange);
        } else if (projection) {
          (sensor as any).setFrustumLength(projection.defaultFrustumSize);
        }
      }
    }

    // Update label if name changed
    if (changes.name !== undefined) {
      const sensor = this.sensorManager.getSensor(id);
      if (sensor) {
        sensor.updateLabel(changes.name);
      }
    }

    // Only update UI if explicitly requested (e.g., for name/color changes in sensor list)
    if (updateUI) {
      this.uiManager.renderSensorList();
    }

    // Save state
    this.saveStateDebounced();
  }

  selectSensor(id: string | null): void {
    this.state = {
      ...this.state,
      selectedSensorId: id,
    };

    // Update preview panel if selecting a camera
    if (id) {
      const sensor = this.state.sensors.find((s) => s.id === id);
      if (sensor && sensor.type === 'camera') {
        const cameraSensor = this.sensorManager.getSensor(id);
        if (cameraSensor) {
          this.previewPanel.setCamera(cameraSensor as any);
        }
      } else {
        this.previewPanel.setCamera(null);
      }
    } else {
      this.previewPanel.setCamera(null);
    }

    // Update UI
    this.uiManager.render();
  }

  cloneSensor(id: string): string {
    const sensor = this.state.sensors.find(s => s.id === id);
    if (!sensor) {
      console.warn('Sensor not found:', id);
      return '';
    }

    // Create clone with offset position
    const newId = generateUuid();
    const clonedSensor: SensorConfig = {
      ...sensor,
      id: newId,
      name: `${sensor.name} (copy)`,
      position: {
        x: sensor.position.x + 0.5,
        y: sensor.position.y + 0.5,
        z: sensor.position.z,
      },
    };

    // Update state
    this.state = {
      ...this.state,
      sensors: [...this.state.sensors, clonedSensor],
      selectedSensorId: newId,
    };

    // Create sensor in 3D scene
    this.sensorManager.createSensor(clonedSensor);

    // Update UI
    this.uiManager.render();

    // Save state
    this.saveStateDebounced();

    console.log('Cloned sensor:', clonedSensor);
    return newId;
  }

  // Settings
  updateSettings(changes: Partial<AppSettings>): void {
    this.state = {
      ...this.state,
      settings: { ...this.state.settings, ...changes },
    };

    // Apply coordinate system change if needed
    if (changes.coordinateSystem) {
      this.scene.getCoordinateSystem().setCoordinateSystem(changes.coordinateSystem);
    }

    // Update UI
    this.uiManager.render();

    // Save state
    this.saveStateDebounced();
  }

  changeScenario(scenario: typeof this.state.scenario): void {
    this.state = {
      ...this.state,
      scenario,
    };

    // Update scene for new scenario (floor size, camera limits)
    this.scene.setScenarioType(scenario);

    // Load scenario objects
    this.scenarioManager.loadScenario(scenario);

    // Recompute all LIDAR point clouds for the new scenario
    this.sensorManager.recomputeAllLidarPointClouds();

    // Save state
    this.saveStateDebounced();
  }

  /**
   * Reset the camera to look at the origin.
   */
  resetCamera(): void {
    this.scene.resetCamera();
  }

  /**
   * Set the point size for all LIDAR sensors.
   * @param size Point size in meters
   */
  setLidarPointSize(size: number): void {
    // Update settings
    this.state = {
      ...this.state,
      settings: { 
        ...this.state.settings, 
        pointSize: size,
        projection: {
          ...this.state.settings.projection,
          lidarPointSize: size,
        },
      },
    };

    // Update all LIDAR sensors
    this.sensorManager.setAllLidarPointSize(size);

    // Save state
    this.saveStateDebounced();
  }

  /**
   * Update projection settings and apply to all sensors.
   */
  updateProjectionSettings(projection: ProjectionSettings): void {
    // Update settings
    this.state = {
      ...this.state,
      settings: {
        ...this.state.settings,
        projection: { ...projection },
        pointSize: projection.lidarPointSize, // Keep in sync for backward compat
      },
    };

    // Apply to all sensors
    this.applyProjectionSettingsToAllSensors();

    // Apply scene settings (background, floor, markers)
    this.applySceneSettings();

    // Save state
    this.saveStateDebounced();
  }

  /**
   * Apply scene-related projection settings.
   */
  private applySceneSettings(): void {
    const projection = this.state.settings.projection;
    if (!projection) return;

    // Apply background color
    if (projection.backgroundColor) {
      this.scene.setBackgroundColor(projection.backgroundColor);
    }

    // Apply floor color
    if (projection.floorColor) {
      this.scene.setFloorColor(projection.floorColor);
    }

    // Apply distance markers setting
    this.scene.setShowDistanceMarkers(projection.showDistanceMarkers ?? true);
  }

  /**
   * Apply current projection settings to all sensors.
   */
  private applyProjectionSettingsToAllSensors(): void {
    const projection = this.state.settings.projection;
    if (!projection) return;

    // Update all sensors
    for (const sensorConfig of this.state.sensors) {
      const sensor = this.sensorManager.getSensor(sensorConfig.id);
      if (!sensor) continue;

      // Update axes size
      sensor.updateAxesSize(projection.axesSize);

      // Update label size
      sensor.updateLabelSize(projection.labelSize);

      // Update LIDAR point size
      if (sensorConfig.type === 'lidar') {
        (sensor as any).setPointSize(projection.lidarPointSize);
      }

      // Update camera frustum size (if not overridden)
      if (sensorConfig.type === 'camera') {
        const camConfig = sensorConfig as CameraSensorConfig;
        if (!camConfig.overrideFrustumSize) {
          (sensor as any).setFrustumLength(projection.defaultFrustumSize);
        }
      }
    }
  }

  // Persistence
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  private saveStateDebounced(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      saveState(this.state);
      console.log('State saved to LocalStorage');
    }, 500);
  }

  exportConfig(): void {
    const json = JSON.stringify(this.state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sensor-config.json';
    a.click();
    URL.revokeObjectURL(url);
    console.log('Exported configuration');
  }

  importConfig(json: string): void {
    try {
      const imported = JSON.parse(json) as AppState;

      // Validate basic structure
      if (!imported.sensors || !Array.isArray(imported.sensors)) {
        throw new Error('Invalid configuration: missing sensors array');
      }

      // Clear existing sensors
      for (const sensor of this.state.sensors) {
        this.sensorManager.removeSensor(sensor.id);
      }

      // Apply imported state
      this.state = imported;

      // Restore coordinate system
      this.scene.getCoordinateSystem().setCoordinateSystem(this.state.settings.coordinateSystem);

      // Restore scenario
      this.scenarioManager.loadScenario(this.state.scenario);

      // Restore sensors
      for (const sensorConfig of this.state.sensors) {
        this.sensorManager.createSensor(sensorConfig);
      }

      // Update UI
      this.uiManager.render();

      // Select first sensor if any
      if (this.state.sensors.length > 0) {
        this.selectSensor(this.state.sensors[0].id);
      }

      // Save to LocalStorage
      saveState(this.state);

      console.log('Imported configuration:', imported);
    } catch (error) {
      console.error('Failed to import configuration:', error);
      alert(`Failed to import configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
