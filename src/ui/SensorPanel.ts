/**
 * Sensor list and configuration panel.
 * Handles sensor CRUD operations and real-time pose editing.
 */
import type { SensorManager } from '../sensors/SensorManager';
import type {
  SensorConfig,
  CameraSensorConfig,
  LidarSensorConfig,
  Vector3,
  EulerAngles,
} from '../types/sensors';
import { generateUUID } from '../utils/uuid';
import {
  CAMERA_PRESETS,
  LIDAR_PRESETS,
  getCameraPresetIds,
  getLidarPresetIds,
  getPresetDisplayName,
  getNextSensorColor,
} from '../data/presets';

/**
 * Callback for sensor selection changes.
 */
export type SensorSelectCallback = (sensorId: string | null) => void;

/**
 * Callback for when sensors are added/removed/changed.
 */
export type SensorsChangedCallback = () => void;

/**
 * Manages the sensor list and configuration panel UI.
 */
export class SensorPanel {
  private sensorManager: SensorManager;
  private onSelect: SensorSelectCallback;
  private onChanged: SensorsChangedCallback;

  // DOM elements
  private sensorListElement: HTMLElement | null = null;
  private configPanel: HTMLElement | null = null;
  private addCameraBtn: HTMLElement | null = null;
  private addLidarBtn: HTMLElement | null = null;

  // Config panel resize state
  private resizeHandle: HTMLElement | null = null;
  private isResizing = false;
  private resizeStartY = 0;
  private resizeStartHeight = 0;

  // Currently selected sensor
  private selectedSensorId: string | null = null;

  // Counter for naming new sensors
  private cameraCounter = 0;
  private lidarCounter = 0;

  // Storage key for persisting config panel height
  private static readonly CONFIG_HEIGHT_KEY = 'config-panel-height';
  private static readonly DEFAULT_CONFIG_HEIGHT = 300;
  private static readonly MIN_CONFIG_HEIGHT = 150;

  constructor(
    sensorManager: SensorManager,
    onSelect: SensorSelectCallback,
    onChanged: SensorsChangedCallback
  ) {
    this.sensorManager = sensorManager;
    this.onSelect = onSelect;
    this.onChanged = onChanged;
  }

  /**
   * Initialize the panel and set up event listeners.
   */
  init(): void {
    // Get DOM elements
    this.sensorListElement = document.getElementById('sensor-list');
    this.configPanel = document.getElementById('config-panel');
    this.addCameraBtn = document.getElementById('add-camera-btn');
    this.addLidarBtn = document.getElementById('add-lidar-btn');

    console.log('SensorPanel.init() - DOM elements found:', {
      sensorList: !!this.sensorListElement,
      configPanel: !!this.configPanel,
      addCameraBtn: !!this.addCameraBtn,
      addLidarBtn: !!this.addLidarBtn,
    });

    if (!this.sensorListElement || !this.configPanel) {
      console.error('SensorPanel: Required DOM elements not found');
      return;
    }

    // Set up add button listeners
    if (this.addCameraBtn) {
      this.addCameraBtn.addEventListener('click', () => this.addCamera());
    }

    if (this.addLidarBtn) {
      this.addLidarBtn.addEventListener('click', () => this.addLidar());
    }

    // Initialize counters from existing sensors
    this.initCounters();

    // Set up config panel resize
    this.setupConfigResize();
  }

  /**
   * Initialize sensor counters from existing sensors.
   */
  private initCounters(): void {
    const configs = this.sensorManager.getAllConfigs();
    for (const config of configs) {
      if (config.type === 'camera') {
        this.cameraCounter++;
      } else if (config.type === 'lidar') {
        this.lidarCounter++;
      }
    }
  }

  /**
   * Set up config panel resize functionality.
   */
  private setupConfigResize(): void {
    if (!this.configPanel) return;

    // Create resize handle
    this.resizeHandle = document.createElement('div');
    this.resizeHandle.className = 'config-resize-handle';
    this.resizeHandle.title = 'Drag to resize';

    // Event listeners
    this.resizeHandle.addEventListener('mousedown', this.onResizeStart);
    document.addEventListener('mousemove', this.onResizeMove);
    document.addEventListener('mouseup', this.onResizeEnd);
  }

  private onResizeStart = (e: MouseEvent): void => {
    if (!this.configPanel) return;
    
    this.isResizing = true;
    this.resizeStartY = e.clientY;
    this.resizeStartHeight = this.configPanel.offsetHeight;
    
    if (this.resizeHandle) {
      this.resizeHandle.classList.add('dragging');
    }
    
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  };

  private onResizeMove = (e: MouseEvent): void => {
    if (!this.isResizing || !this.configPanel) return;

    // Calculate new height (dragging up decreases height)
    const deltaY = e.clientY - this.resizeStartY;
    const newHeight = Math.max(
      SensorPanel.MIN_CONFIG_HEIGHT,
      Math.min(
        window.innerHeight * 0.8,
        this.resizeStartHeight - deltaY
      )
    );

    this.configPanel.style.height = `${newHeight}px`;
    this.configPanel.style.maxHeight = `${newHeight}px`;
  };

  private onResizeEnd = (): void => {
    if (!this.isResizing) return;

    this.isResizing = false;
    
    if (this.resizeHandle) {
      this.resizeHandle.classList.remove('dragging');
    }
    
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    // Save height to localStorage
    if (this.configPanel) {
      try {
        const height = this.configPanel.offsetHeight;
        localStorage.setItem(SensorPanel.CONFIG_HEIGHT_KEY, String(height));
      } catch {
        // Ignore localStorage errors
      }
    }
  };

  /**
   * Restore config panel height from localStorage.
   */
  private restoreConfigHeight(): void {
    if (!this.configPanel) return;

    try {
      const saved = localStorage.getItem(SensorPanel.CONFIG_HEIGHT_KEY);
      const height = saved ? parseInt(saved, 10) : SensorPanel.DEFAULT_CONFIG_HEIGHT;
      
      if (!isNaN(height) && height >= SensorPanel.MIN_CONFIG_HEIGHT) {
        const maxHeight = window.innerHeight * 0.8;
        const finalHeight = Math.min(height, maxHeight);
        this.configPanel.style.height = `${finalHeight}px`;
        this.configPanel.style.maxHeight = `${finalHeight}px`;
      }
    } catch {
      // Ignore errors
    }
  }

  /**
   * Add a new camera sensor.
   */
  private addCamera(): void {
    this.cameraCounter++;
    const id = generateUUID();
    const sensorCount = this.sensorManager.getSensorCount();

    const config: CameraSensorConfig = {
      id,
      name: `Camera ${this.cameraCounter}`,
      type: 'camera',
      enabled: true,
      position: { x: 0, y: 0, z: 1.5 },
      rotation: { roll: 0, pitch: 0, yaw: 0 },
      color: getNextSensorColor(sensorCount),
      hFov: 70,
      vFov: 45,
      resolutionH: 1920,
      resolutionV: 1080,
      minRange: 0.1,
      maxRange: 10,
    };

    try {
      this.sensorManager.createSensor(config);
      this.onChanged();
      this.selectSensor(id);
    } catch (error) {
      console.error('Failed to create camera:', error);
    }
  }

  /**
   * Add a new LIDAR sensor.
   */
  private addLidar(): void {
    this.lidarCounter++;
    const id = generateUUID();
    const sensorCount = this.sensorManager.getSensorCount();

    const config: LidarSensorConfig = {
      id,
      name: `LIDAR ${this.lidarCounter}`,
      type: 'lidar',
      enabled: true,
      position: { x: 0, y: 0, z: 1.5 },
      rotation: { roll: 0, pitch: 0, yaw: 0 },
      color: getNextSensorColor(sensorCount),
      hFov: 360,
      vFov: 30,
      channels: 16,
      angularResH: 0.4,
      minRange: 0.1,
      maxRange: 100,
    };

    try {
      this.sensorManager.createSensor(config);
      this.onChanged();
      this.selectSensor(id);
    } catch (error) {
      console.error('Failed to create LIDAR:', error);
    }
  }

  /**
   * Select a sensor.
   */
  private selectSensor(sensorId: string | null): void {
    this.selectedSensorId = sensorId;
    this.onSelect(sensorId);
  }

  /**
   * Render the sensor list.
   */
  renderSensorList(configs: SensorConfig[], selectedId: string | null): void {
    if (!this.sensorListElement) return;

    this.selectedSensorId = selectedId;

    if (configs.length === 0) {
      this.sensorListElement.innerHTML = `
        <p class="text-muted text-center" style="padding: 16px;">
          No sensors yet.<br>Click a button above to add one.
        </p>
      `;
      return;
    }

    this.sensorListElement.innerHTML = configs
      .map((config) => this.renderSensorItem(config, selectedId))
      .join('');

    // Add event listeners to sensor items
    for (const config of configs) {
      const item = this.sensorListElement.querySelector(
        `[data-sensor-id="${config.id}"]`
      );
      if (item) {
        // Click to select
        item.addEventListener('click', (e) => {
          // Don't select if clicking on checkbox
          if ((e.target as HTMLElement).tagName === 'INPUT') return;
          this.selectSensor(config.id);
        });

        // Checkbox for enable/disable
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox) {
          checkbox.addEventListener('change', (e) => {
            const enabled = (e.target as HTMLInputElement).checked;
            this.sensorManager.setSensorEnabled(config.id, enabled);
            this.onChanged();
          });
        }
      }
    }
  }

  /**
   * Render a single sensor item.
   */
  private renderSensorItem(
    config: SensorConfig,
    selectedId: string | null
  ): string {
    const isSelected = config.id === selectedId;
    const typeLabel = config.type.charAt(0).toUpperCase() + config.type.slice(1);

    return `
      <div class="sensor-item ${isSelected ? 'selected' : ''}" data-sensor-id="${config.id}">
        <input type="checkbox" ${config.enabled ? 'checked' : ''} title="Enable/disable sensor" />
        <div class="sensor-color-indicator" style="background-color: ${config.color};"></div>
        <div class="sensor-item-info">
          <div class="sensor-item-name">${this.escapeHtml(config.name)}</div>
          <div class="sensor-item-type">${typeLabel}</div>
        </div>
      </div>
    `;
  }

  /**
   * Show the config panel for a sensor.
   */
  showConfigPanel(config: SensorConfig): void {
    console.log('showConfigPanel called for:', config.name, config.id);
    
    if (!this.configPanel) {
      console.error('Config panel element not found!');
      return;
    }

    const html = this.renderConfigPanel(config);
    console.log('Config panel HTML length:', html.length);
    
    this.configPanel.innerHTML = html;
    
    // Add resize handle at the top
    if (this.resizeHandle && this.configPanel.firstChild) {
      this.configPanel.insertBefore(this.resizeHandle, this.configPanel.firstChild);
    }
    
    this.configPanel.classList.add('visible');
    
    // Restore saved height
    this.restoreConfigHeight();
    
    console.log('Config panel visible class added, element:', this.configPanel);

    // Set up event listeners for all inputs
    this.setupConfigPanelListeners(config);
  }

  /**
   * Hide the config panel.
   */
  hideConfigPanel(): void {
    if (!this.configPanel) return;
    this.configPanel.classList.remove('visible');
    this.configPanel.innerHTML = '';
  }

  /**
   * Render the configuration panel HTML.
   */
  private renderConfigPanel(config: SensorConfig): string {
    const isCamera = config.type === 'camera';
    const presetOptions = isCamera
      ? getCameraPresetIds()
          .map(
            (id) => `<option value="${id}">${getPresetDisplayName(id)}</option>`
          )
          .join('')
      : getLidarPresetIds()
          .map(
            (id) => `<option value="${id}">${getPresetDisplayName(id)}</option>`
          )
          .join('');

    let sensorSpecificFields = '';
    if (config.type === 'camera') {
      const cam = config as CameraSensorConfig;
      sensorSpecificFields = `
        <div class="form-section">
          <h3>Camera Settings</h3>
          <div class="form-row">
            <div class="form-group">
              <label for="hFov">H-FOV (°)</label>
              <input type="number" id="hFov" value="${cam.hFov}" min="1" max="360" step="0.1" />
            </div>
            <div class="form-group">
              <label for="vFov">V-FOV (°)</label>
              <input type="number" id="vFov" value="${cam.vFov}" min="1" max="180" step="0.1" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="resolutionH">Resolution H (px)</label>
              <input type="number" id="resolutionH" value="${cam.resolutionH}" min="1" max="8192" step="1" />
            </div>
            <div class="form-group">
              <label for="resolutionV">Resolution V (px)</label>
              <input type="number" id="resolutionV" value="${cam.resolutionV}" min="1" max="8192" step="1" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="minRange">Min Range (m)</label>
              <input type="number" id="minRange" value="${cam.minRange}" min="0" max="1000" step="0.1" />
            </div>
            <div class="form-group">
              <label for="maxRange">Max Range (m)</label>
              <input type="number" id="maxRange" value="${cam.maxRange}" min="0.1" max="1000" step="0.1" />
            </div>
          </div>
        </div>
      `;
    } else if (config.type === 'lidar') {
      const lidar = config as LidarSensorConfig;
      sensorSpecificFields = `
        <div class="form-section">
          <h3>LIDAR Settings</h3>
          <div class="form-row">
            <div class="form-group">
              <label for="hFov">H-FOV (°)</label>
              <input type="number" id="hFov" value="${lidar.hFov}" min="1" max="360" step="0.1" />
            </div>
            <div class="form-group">
              <label for="vFov">V-FOV (°)</label>
              <input type="number" id="vFov" value="${lidar.vFov}" min="0.1" max="180" step="0.1" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="channels">Channels</label>
              <input type="number" id="channels" value="${lidar.channels}" min="1" max="128" step="1" />
            </div>
            <div class="form-group">
              <label for="angularResH">Angular Res H (°)</label>
              <input type="number" id="angularResH" value="${lidar.angularResH}" min="0.01" max="10" step="0.01" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="minRange">Min Range (m)</label>
              <input type="number" id="minRange" value="${lidar.minRange}" min="0" max="1000" step="0.1" />
            </div>
            <div class="form-group">
              <label for="maxRange">Max Range (m)</label>
              <input type="number" id="maxRange" value="${lidar.maxRange}" min="0.1" max="1000" step="0.1" />
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="config-panel-content">
        <div class="config-header">
          <h2>Sensor Configuration</h2>
          <button class="close-btn" id="close-config-btn" title="Close">&times;</button>
        </div>
        
        <div class="form-section">
          <div class="form-row">
            <div class="form-group" style="flex: 2;">
              <label for="sensor-name">Name</label>
              <input type="text" id="sensor-name" value="${this.escapeHtml(config.name)}" />
            </div>
            <div class="form-group" style="flex: 1;">
              <label for="sensor-color">Color</label>
              <input type="color" id="sensor-color" value="${config.color}" />
            </div>
          </div>
          <div class="form-group">
            <label for="sensor-preset">Apply Preset</label>
            <select id="sensor-preset">
              <option value="">-- Select Preset --</option>
              ${presetOptions}
            </select>
          </div>
        </div>

        <div class="form-section">
          <h3>Position (meters)</h3>
          <div class="slider-group">
            <label for="pos-x">X</label>
            <input type="range" id="pos-x-slider" min="-10" max="10" step="0.01" value="${config.position.x}" />
            <input type="number" id="pos-x" value="${config.position.x}" min="-100" max="100" step="0.01" />
          </div>
          <div class="slider-group">
            <label for="pos-y">Y</label>
            <input type="range" id="pos-y-slider" min="-10" max="10" step="0.01" value="${config.position.y}" />
            <input type="number" id="pos-y" value="${config.position.y}" min="-100" max="100" step="0.01" />
          </div>
          <div class="slider-group">
            <label for="pos-z">Z</label>
            <input type="range" id="pos-z-slider" min="0" max="5" step="0.01" value="${config.position.z}" />
            <input type="number" id="pos-z" value="${config.position.z}" min="-100" max="100" step="0.01" />
          </div>
        </div>

        <div class="form-section">
          <h3>Rotation (degrees)</h3>
          <div class="slider-group">
            <label for="rot-roll">Roll</label>
            <input type="range" id="rot-roll-slider" min="-180" max="180" step="0.5" value="${config.rotation.roll}" />
            <input type="number" id="rot-roll" value="${config.rotation.roll}" min="-180" max="180" step="0.5" />
          </div>
          <div class="slider-group">
            <label for="rot-pitch">Pitch</label>
            <input type="range" id="rot-pitch-slider" min="-180" max="180" step="0.5" value="${config.rotation.pitch}" />
            <input type="number" id="rot-pitch" value="${config.rotation.pitch}" min="-180" max="180" step="0.5" />
          </div>
          <div class="slider-group">
            <label for="rot-yaw">Yaw</label>
            <input type="range" id="rot-yaw-slider" min="-180" max="180" step="0.5" value="${config.rotation.yaw}" />
            <input type="number" id="rot-yaw" value="${config.rotation.yaw}" min="-180" max="180" step="0.5" />
          </div>
        </div>

        ${sensorSpecificFields}

        <div class="config-actions">
          <button id="clone-sensor-btn">Clone</button>
          <button id="delete-sensor-btn" class="danger">Delete</button>
        </div>
      </div>
    `;
  }

  /**
   * Set up event listeners for the config panel.
   */
  private setupConfigPanelListeners(config: SensorConfig): void {
    if (!this.configPanel) return;

    // Close button
    const closeBtn = this.configPanel.querySelector('#close-config-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.selectSensor(null);
      });
    }

    // Name input
    const nameInput = this.configPanel.querySelector(
      '#sensor-name'
    ) as HTMLInputElement;
    if (nameInput) {
      nameInput.addEventListener('input', () => {
        this.sensorManager.updateSensor(config.id, { name: nameInput.value });
        this.onChanged();
      });
    }

    // Color input
    const colorInput = this.configPanel.querySelector(
      '#sensor-color'
    ) as HTMLInputElement;
    if (colorInput) {
      colorInput.addEventListener('input', () => {
        this.sensorManager.updateSensor(config.id, { color: colorInput.value });
        this.onChanged();
      });
    }

    // Preset dropdown
    const presetSelect = this.configPanel.querySelector(
      '#sensor-preset'
    ) as HTMLSelectElement;
    if (presetSelect) {
      presetSelect.addEventListener('change', () => {
        this.applyPreset(config.id, config.type, presetSelect.value);
        presetSelect.value = ''; // Reset dropdown
      });
    }

    // Position sliders and inputs
    this.setupPositionControls(config);

    // Rotation sliders and inputs
    this.setupRotationControls(config);

    // Sensor-specific fields
    this.setupSensorSpecificControls(config);

    // Delete button
    const deleteBtn = this.configPanel.querySelector('#delete-sensor-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        this.deleteSensor(config.id);
      });
    }

    // Clone button
    const cloneBtn = this.configPanel.querySelector('#clone-sensor-btn');
    if (cloneBtn) {
      cloneBtn.addEventListener('click', () => {
        this.cloneSensor(config.id);
      });
    }
  }

  /**
   * Set up position slider and input controls.
   */
  private setupPositionControls(config: SensorConfig): void {
    const axes = ['x', 'y', 'z'] as const;

    for (const axis of axes) {
      const slider = this.configPanel?.querySelector(
        `#pos-${axis}-slider`
      ) as HTMLInputElement;
      const input = this.configPanel?.querySelector(
        `#pos-${axis}`
      ) as HTMLInputElement;

      if (slider && input) {
        // Slider input event (real-time)
        slider.addEventListener('input', () => {
          input.value = slider.value;
          this.updatePosition(config.id, axis, parseFloat(slider.value));
        });

        // Number input event
        input.addEventListener('input', () => {
          slider.value = input.value;
          this.updatePosition(config.id, axis, parseFloat(input.value));
        });
      }
    }
  }

  /**
   * Set up rotation slider and input controls.
   */
  private setupRotationControls(config: SensorConfig): void {
    const angles = [
      { prop: 'roll', id: 'rot-roll' },
      { prop: 'pitch', id: 'rot-pitch' },
      { prop: 'yaw', id: 'rot-yaw' },
    ] as const;

    for (const { prop, id } of angles) {
      const slider = this.configPanel?.querySelector(
        `#${id}-slider`
      ) as HTMLInputElement;
      const input = this.configPanel?.querySelector(
        `#${id}`
      ) as HTMLInputElement;

      if (slider && input) {
        // Slider input event (real-time)
        slider.addEventListener('input', () => {
          input.value = slider.value;
          this.updateRotation(config.id, prop, parseFloat(slider.value));
        });

        // Number input event
        input.addEventListener('input', () => {
          slider.value = input.value;
          this.updateRotation(config.id, prop, parseFloat(input.value));
        });
      }
    }
  }

  /**
   * Set up sensor-specific control listeners.
   */
  private setupSensorSpecificControls(config: SensorConfig): void {
    if (!this.configPanel) return;

    if (config.type === 'camera') {
      this.setupCameraControls(config);
    } else if (config.type === 'lidar') {
      this.setupLidarControls(config);
    }
  }

  /**
   * Set up camera-specific controls.
   */
  private setupCameraControls(config: SensorConfig): void {
    const fields = [
      'hFov',
      'vFov',
      'resolutionH',
      'resolutionV',
      'minRange',
      'maxRange',
    ] as const;

    for (const field of fields) {
      const input = this.configPanel?.querySelector(
        `#${field}`
      ) as HTMLInputElement;
      if (input) {
        input.addEventListener('input', () => {
          const value = parseFloat(input.value);
          if (!isNaN(value)) {
            this.sensorManager.updateSensor(config.id, { [field]: value });
          }
        });
      }
    }
  }

  /**
   * Set up LIDAR-specific controls.
   */
  private setupLidarControls(config: SensorConfig): void {
    const fields = [
      'hFov',
      'vFov',
      'channels',
      'angularResH',
      'minRange',
      'maxRange',
    ] as const;

    for (const field of fields) {
      const input = this.configPanel?.querySelector(
        `#${field}`
      ) as HTMLInputElement;
      if (input) {
        input.addEventListener('input', () => {
          const value = parseFloat(input.value);
          if (!isNaN(value)) {
            this.sensorManager.updateSensor(config.id, { [field]: value });
          }
        });
      }
    }
  }

  /**
   * Update sensor position.
   */
  private updatePosition(
    sensorId: string,
    axis: 'x' | 'y' | 'z',
    value: number
  ): void {
    const sensor = this.sensorManager.getSensor(sensorId);
    if (!sensor) return;

    const currentConfig = sensor.getConfig();
    const newPosition: Vector3 = {
      ...currentConfig.position,
      [axis]: value,
    };

    this.sensorManager.updateSensorPose(
      sensorId,
      newPosition,
      currentConfig.rotation
    );
  }

  /**
   * Update sensor rotation.
   */
  private updateRotation(
    sensorId: string,
    angle: 'roll' | 'pitch' | 'yaw',
    value: number
  ): void {
    const sensor = this.sensorManager.getSensor(sensorId);
    if (!sensor) return;

    const currentConfig = sensor.getConfig();
    const newRotation: EulerAngles = {
      ...currentConfig.rotation,
      [angle]: value,
    };

    this.sensorManager.updateSensorPose(
      sensorId,
      currentConfig.position,
      newRotation
    );
  }

  /**
   * Apply a preset to a sensor.
   */
  private applyPreset(
    sensorId: string,
    sensorType: string,
    presetId: string
  ): void {
    if (!presetId) return;

    const preset =
      sensorType === 'camera'
        ? CAMERA_PRESETS[presetId]
        : LIDAR_PRESETS[presetId];

    if (!preset) {
      console.warn(`Preset not found: ${presetId}`);
      return;
    }

    this.sensorManager.updateSensor(sensorId, preset);
    this.onChanged();

    // Refresh config panel with new values
    const sensor = this.sensorManager.getSensor(sensorId);
    if (sensor) {
      this.showConfigPanel(sensor.getConfig());
    }
  }

  /**
   * Delete a sensor.
   */
  private deleteSensor(sensorId: string): void {
    this.sensorManager.removeSensor(sensorId);
    this.selectSensor(null);
    this.onChanged();
  }

  /**
   * Clone a sensor.
   */
  private cloneSensor(sensorId: string): void {
    const sensor = this.sensorManager.getSensor(sensorId);
    if (!sensor) return;

    const originalConfig = sensor.getConfig();
    const newId = generateUUID();

    // Offset the position slightly
    const newConfig: SensorConfig = {
      ...originalConfig,
      id: newId,
      name: `${originalConfig.name} (copy)`,
      position: {
        x: originalConfig.position.x + 0.5,
        y: originalConfig.position.y + 0.5,
        z: originalConfig.position.z,
      },
      color: getNextSensorColor(this.sensorManager.getSensorCount()),
    };

    try {
      this.sensorManager.createSensor(newConfig);
      this.onChanged();
      this.selectSensor(newId);
    } catch (error) {
      console.error('Failed to clone sensor:', error);
    }
  }

  /**
   * Escape HTML special characters.
   */
  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    // Remove resize event listeners
    if (this.resizeHandle) {
      this.resizeHandle.removeEventListener('mousedown', this.onResizeStart);
    }
    document.removeEventListener('mousemove', this.onResizeMove);
    document.removeEventListener('mouseup', this.onResizeEnd);

    this.hideConfigPanel();
    if (this.sensorListElement) {
      this.sensorListElement.innerHTML = '';
    }
  }
}
