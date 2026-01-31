/**
 * Sensor list and configuration panel.
 * Handles sensor CRUD operations and real-time pose editing.
 */
import type { App } from '../App';
import type { AppState, ScenarioType } from '../types/state';
import type {
  SensorConfig,
  CameraSensorConfig,
  LidarSensorConfig,
  CameraDistortion,
} from '../types/sensors';
import {
  getCameraPresetIds,
  getLidarPresetIds,
  getPresetDisplayName,
} from '../data/presets';
import { saveState, clearState } from '../utils/storage';
import { ScenarioManager, SCENARIO_DISPLAY_NAMES } from '../scenarios/ScenarioManager';
import { 
  estimateDistortionFromFOV, 
  DISTORTION_TOOLTIPS, 
  DISTORTION_RANGES 
} from '../utils/distortion';

/**
 * Manages the sensor list and configuration panel UI.
 */
export class SensorPanel {
  private app: App;

  // DOM elements
  private sensorListElement: HTMLElement | null = null;
  private configPanel: HTMLElement | null = null;
  private addCameraBtn: HTMLElement | null = null;
  private addLidarBtn: HTMLElement | null = null;

  // Config panel resize state
  private isResizing = false;
  private resizeStartY = 0;
  private resizeStartHeight = 0;

  // Track current config panel sensor to avoid re-rendering
  private currentConfigSensorId: string | null = null;

  // Storage key for persisting config panel height
  private static readonly CONFIG_HEIGHT_KEY = 'config-panel-height';
  private static readonly DEFAULT_CONFIG_HEIGHT = 280;
  private static readonly MIN_CONFIG_HEIGHT = 150;

  constructor(app: App) {
    this.app = app;
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

    if (!this.sensorListElement || !this.configPanel) {
      console.error('SensorPanel: Required DOM elements not found');
      return;
    }

    // Set up add button listeners
    if (this.addCameraBtn) {
      this.addCameraBtn.addEventListener('click', () => {
        this.app.addSensor('camera');
      });
    }

    if (this.addLidarBtn) {
      this.addLidarBtn.addEventListener('click', () => {
        this.app.addSensor('lidar');
      });
    }

    // Set up persistence buttons
    this.setupPersistenceButtons();

    // Set up scenario selector
    this.setupScenarioSelector();

    // Restore saved config panel height
    this.restoreConfigHeight();
  }

  /**
   * Set up scenario selector dropdown.
   */
  private setupScenarioSelector(): void {
    const scenarioOptions = document.getElementById('scenario-options');
    if (!scenarioOptions) return;

    // Create dropdown
    const select = document.createElement('select');
    select.id = 'scenario-select';
    select.className = 'scenario-select';

    // Add options for each scenario
    const scenarios = ScenarioManager.getAvailableScenarios();
    const currentScenario = this.app.getState().scenario;

    scenarios.forEach((scenarioType) => {
      const option = document.createElement('option');
      option.value = scenarioType;
      option.textContent = SCENARIO_DISPLAY_NAMES[scenarioType];
      option.selected = scenarioType === currentScenario;
      select.appendChild(option);
    });

    // Handle selection change
    select.addEventListener('change', (e) => {
      const newScenario = (e.target as HTMLSelectElement).value as ScenarioType;
      this.app.changeScenario(newScenario);
    });

    scenarioOptions.appendChild(select);
  }

  /**
   * Set up persistence button listeners.
   */
  private setupPersistenceButtons(): void {
    const saveBtn = document.getElementById('save-btn');
    const loadBtn = document.getElementById('load-btn');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const clearBtn = document.getElementById('clear-btn');

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        saveState(this.app.getState());
        alert('Configuration saved to browser storage');
      });
    }

    if (loadBtn) {
      loadBtn.addEventListener('click', () => {
        if (confirm('Reload page and restore saved state?')) {
          location.reload();
        }
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.app.exportConfig();
      });
    }

    if (importBtn) {
      importBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e: Event) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const json = event.target?.result as string;
              this.app.importConfig(json);
            };
            reader.readAsText(file);
          }
        };
        input.click();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Clear all sensors and saved state? This cannot be undone.')) {
          clearState();
          location.reload();
        }
      });
    }
  }

  /**
   * Restore saved config panel height from localStorage.
   */
  private restoreConfigHeight(): void {
    if (!this.configPanel) return;

    const savedHeight = localStorage.getItem(SensorPanel.CONFIG_HEIGHT_KEY);
    if (savedHeight) {
      const height = Math.max(
        SensorPanel.MIN_CONFIG_HEIGHT,
        parseInt(savedHeight, 10)
      );
      this.configPanel.style.height = `${height}px`;
    } else {
      this.configPanel.style.height = `${SensorPanel.DEFAULT_CONFIG_HEIGHT}px`;
    }
  }

  /**
   * Render the entire panel based on app state.
   */
  render(state: AppState): void {
    this.renderSensorList(state);
    this.renderConfigPanel(state);
  }

  /**
   * Only render the sensor list (not the config panel).
   */
  renderSensorListOnly(state: AppState): void {
    this.renderSensorList(state);
  }

  /**
   * Render the sensor list.
   */
  private renderSensorList(state: AppState): void {
    if (!this.sensorListElement) return;

    const { sensors, selectedSensorId } = state;

    if (sensors.length === 0) {
      this.sensorListElement.innerHTML = '<div class="empty-state">No sensors. Click "+ Camera" or "+ LIDAR".</div>';
      return;
    }

    this.sensorListElement.innerHTML = sensors
      .map((sensor) => this.renderSensorItem(sensor, sensor.id === selectedSensorId))
      .join('');

    // Add event listeners
    sensors.forEach((sensor) => {
      // Sensor item click to select/toggle
      const itemEl = document.getElementById(`sensor-item-${sensor.id}`);
      if (itemEl) {
        itemEl.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          // Don't toggle if clicking on controls
          if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('button')) {
            return;
          }
          // Toggle: if already selected, deselect; otherwise select
          if (this.app.getState().selectedSensorId === sensor.id) {
            this.app.selectSensor(null);
          } else {
            this.app.selectSensor(sensor.id);
          }
        });
      }

      // Enable/disable checkbox
      const checkboxEl = document.getElementById(`sensor-enabled-${sensor.id}`) as HTMLInputElement;
      if (checkboxEl) {
        checkboxEl.addEventListener('change', () => {
          this.app.updateSensor(sensor.id, { enabled: checkboxEl.checked }, true);
        });
      }

      // Color picker (smaller)
      const colorEl = document.getElementById(`sensor-color-${sensor.id}`) as HTMLInputElement;
      if (colorEl) {
        colorEl.addEventListener('input', () => {
          this.app.updateSensor(sensor.id, { color: colorEl.value }, true);
        });
      }

      // Delete button
      const deleteBtn = document.getElementById(`sensor-delete-${sensor.id}`);
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.app.removeSensor(sensor.id);
        });
      }

      // Clone button
      const cloneBtn = document.getElementById(`sensor-clone-${sensor.id}`);
      if (cloneBtn) {
        cloneBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.app.cloneSensor(sensor.id);
        });
      }
    });
  }

  /**
   * Render a single sensor item.
   */
  private renderSensorItem(sensor: SensorConfig, isSelected: boolean): string {
    const typeIcon = sensor.type === 'camera' ? '📷' : '📡';
    const selectedClass = isSelected ? 'selected' : '';

    return `
      <div id="sensor-item-${sensor.id}" class="sensor-item ${selectedClass}">
        <input
          type="checkbox"
          id="sensor-enabled-${sensor.id}"
          ${sensor.enabled ? 'checked' : ''}
          title="Enable/disable"
        />
        <span class="sensor-icon">${typeIcon}</span>
        <div class="sensor-info">
          <div class="sensor-name">${this.escapeHtml(sensor.name)}</div>
        </div>
        <div class="sensor-actions">
          <input
            type="color"
            id="sensor-color-${sensor.id}"
            value="${sensor.color}"
            title="Color"
            class="sensor-color-picker-small"
          />
          <button id="sensor-clone-${sensor.id}" class="btn-icon" title="Clone">📋</button>
          <button id="sensor-delete-${sensor.id}" class="btn-icon btn-danger-icon" title="Delete">✕</button>
        </div>
      </div>
    `;
  }

  /**
   * Render the config panel for the selected sensor.
   */
  private renderConfigPanel(state: AppState): void {
    if (!this.configPanel) return;

    const sensor = state.sensors.find((s) => s.id === state.selectedSensorId);

    if (!sensor) {
      // No sensor selected, hide config panel
      this.configPanel.classList.remove('visible');
      this.currentConfigSensorId = null;
      return;
    }

    // Only re-render if different sensor selected
    if (this.currentConfigSensorId === sensor.id) {
      return;
    }
    this.currentConfigSensorId = sensor.id;

    this.configPanel.classList.add('visible');

    const isCam = sensor.type === 'camera';
    const presetIds = isCam ? getCameraPresetIds() : getLidarPresetIds();

    const currentPresetId = sensor.presetId || '';
    
    this.configPanel.innerHTML = `
      <div class="config-resize-handle"></div>
      <div class="config-content">
        <div class="config-row">
          <label class="config-field">
            <span>Name</span>
            <input type="text" id="config-name" value="${this.escapeHtml(sensor.name)}" />
          </label>
          <label class="config-field">
            <span>Preset</span>
            <select id="config-preset">
              <option value="" ${currentPresetId === '' ? 'selected' : ''}>Custom</option>
              ${presetIds.map((id) => `<option value="${id}" ${id === currentPresetId ? 'selected' : ''}>${this.escapeHtml(getPresetDisplayName(id))}</option>`).join('')}
            </select>
          </label>
        </div>

        <div class="config-row config-pose">
          <div class="config-column">
            <h4>Position (m)</h4>
            ${this.renderCompactSlider('x', 'X', sensor.position.x, -10, 10, 0.1)}
            ${this.renderCompactSlider('y', 'Y', sensor.position.y, -10, 10, 0.1)}
            ${this.renderCompactSlider('z', 'Z', sensor.position.z, -10, 10, 0.1)}
          </div>
          <div class="config-column">
            <h4>Rotation (°)</h4>
            ${this.renderCompactSlider('roll', 'R', sensor.rotation.roll, -180, 180, 1)}
            ${this.renderCompactSlider('pitch', 'P', sensor.rotation.pitch, -180, 180, 1)}
            ${this.renderCompactSlider('yaw', 'Y', sensor.rotation.yaw, -180, 180, 1)}
          </div>
        </div>

        ${isCam ? this.renderCameraControls(sensor as CameraSensorConfig) : this.renderLidarControls(sensor as LidarSensorConfig)}
      </div>
    `;

    // Set up resize handle
    this.setupConfigResize();

    // Set up event listeners
    this.setupConfigPanelListeners(sensor);
  }

  /**
   * Set up config panel resize.
   */
  private setupConfigResize(): void {
    if (!this.configPanel) return;

    const resizeHandle = this.configPanel.querySelector('.config-resize-handle');
    if (!resizeHandle) return;

    resizeHandle.addEventListener('mousedown', (e: Event) => {
      const mouseEvent = e as MouseEvent;
      mouseEvent.preventDefault();
      this.isResizing = true;
      this.resizeStartY = mouseEvent.clientY;
      this.resizeStartHeight = this.configPanel!.offsetHeight;

      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    });

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isResizing || !this.configPanel) return;

      const deltaY = this.resizeStartY - e.clientY;
      const newHeight = Math.max(
        SensorPanel.MIN_CONFIG_HEIGHT,
        this.resizeStartHeight + deltaY
      );

      this.configPanel.style.height = `${newHeight}px`;
    };

    const onMouseUp = () => {
      if (!this.isResizing) return;

      this.isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      if (this.configPanel) {
        localStorage.setItem(
          SensorPanel.CONFIG_HEIGHT_KEY,
          String(this.configPanel.offsetHeight)
        );
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  /**
   * Render a compact slider control.
   */
  private renderCompactSlider(
    id: string,
    label: string,
    value: number,
    min: number,
    max: number,
    step: number
  ): string {
    return `
      <div class="compact-slider">
        <label>${label}</label>
        <input type="range" id="config-${id}" min="${min}" max="${max}" step="${step}" value="${value}" />
        <input type="number" id="config-${id}-num" step="${step}" value="${value.toFixed(step < 1 ? 2 : 0)}" />
      </div>
    `;
  }

  /**
   * Render camera-specific controls.
   */
  private renderCameraControls(sensor: CameraSensorConfig): string {
    const overrideFrustum = sensor.overrideFrustumSize ?? false;
    const defaultFrustumSize = this.app.getSettings().projection?.defaultFrustumSize ?? 10;
    const displayFrustumSize = overrideFrustum ? sensor.maxRange : defaultFrustumSize;
    const distortion = sensor.distortion;
    const modelIsFisheye = distortion.model === 'fisheye-equidistant';

    return `
      <div class="config-row">
        <label class="config-field">
          <span>H-FOV (°)</span>
          <input type="number" id="config-hfov" value="${sensor.hFov}" min="1" max="220" step="0.1" />
        </label>
        <label class="config-field">
          <span>V-FOV (°)</span>
          <input type="number" id="config-vfov" value="${sensor.vFov}" min="1" max="220" step="0.1" />
        </label>
        <label class="config-field">
          <span>Width (px)</span>
          <input type="number" id="config-resh" value="${sensor.resolutionH}" min="64" max="4096" step="1" />
        </label>
        <label class="config-field">
          <span>Height (px)</span>
          <input type="number" id="config-resv" value="${sensor.resolutionV}" min="64" max="4096" step="1" />
        </label>
      </div>
      <div class="config-row">
        <label class="config-field config-checkbox">
          <input type="checkbox" id="config-override-frustum" ${overrideFrustum ? 'checked' : ''} />
          <span>Override frustum size</span>
        </label>
        <label class="config-field" id="frustum-size-field" ${!overrideFrustum ? 'style="opacity: 0.5;"' : ''}>
          <span>Frustum Length (m)</span>
          <input type="number" id="config-maxrange" value="${displayFrustumSize}" min="0.1" max="1000" step="0.1" ${!overrideFrustum ? 'disabled' : ''} />
        </label>
      </div>
      
      <div class="config-section-header">
        <span>Lens Distortion</span>
        <button id="config-estimate-distortion" class="btn-small" title="Estimate typical distortion values based on FOV">Estimate from FOV</button>
      </div>
      <div class="config-row">
        <label class="config-field">
          <span title="${this.escapeHtml(DISTORTION_TOOLTIPS.model)}">Model</span>
          <select id="config-distortion-model" title="${this.escapeHtml(DISTORTION_TOOLTIPS.model)}">
            <option value="brown-conrady" ${!modelIsFisheye ? 'selected' : ''}>Brown-Conrady</option>
            <option value="fisheye-equidistant" ${modelIsFisheye ? 'selected' : ''}>Fisheye</option>
          </select>
        </label>
        <label class="config-field config-checkbox">
          <input type="checkbox" id="config-show-distortion" ${sensor.showDistortion ? 'checked' : ''} 
            title="${this.escapeHtml(DISTORTION_TOOLTIPS.showDistortion)}" />
          <span title="${this.escapeHtml(DISTORTION_TOOLTIPS.showDistortion)}">Show distorted</span>
        </label>
      </div>
      <div class="config-row distortion-params">
        <label class="config-field" title="${this.escapeHtml(DISTORTION_TOOLTIPS.k1)}">
          <span>k1</span>
          <input type="number" id="config-k1" value="${distortion.k1}" 
            min="${DISTORTION_RANGES.k1.min}" max="${DISTORTION_RANGES.k1.max}" step="${DISTORTION_RANGES.k1.step}" />
        </label>
        <label class="config-field" title="${this.escapeHtml(DISTORTION_TOOLTIPS.k2)}">
          <span>k2</span>
          <input type="number" id="config-k2" value="${distortion.k2}" 
            min="${DISTORTION_RANGES.k2.min}" max="${DISTORTION_RANGES.k2.max}" step="${DISTORTION_RANGES.k2.step}" />
        </label>
        <label class="config-field" title="${this.escapeHtml(DISTORTION_TOOLTIPS.p1)}">
          <span>p1</span>
          <input type="number" id="config-p1" value="${distortion.p1}" 
            min="${DISTORTION_RANGES.p1.min}" max="${DISTORTION_RANGES.p1.max}" step="${DISTORTION_RANGES.p1.step}" />
        </label>
        <label class="config-field" title="${this.escapeHtml(DISTORTION_TOOLTIPS.p2)}">
          <span>p2</span>
          <input type="number" id="config-p2" value="${distortion.p2}" 
            min="${DISTORTION_RANGES.p2.min}" max="${DISTORTION_RANGES.p2.max}" step="${DISTORTION_RANGES.p2.step}" />
        </label>
      </div>
    `;
  }

  /**
   * Render LIDAR-specific controls.
   */
  private renderLidarControls(sensor: LidarSensorConfig): string {
    // Default values for optional fields
    const showVolume = sensor.showVolume ?? true;
    const showPointCloud = sensor.showPointCloud ?? true;
    const pointCloudColor = sensor.pointCloudColor || sensor.color;

    return `
      <div class="config-row">
        <label class="config-field">
          <span>H-FOV (°)</span>
          <input type="number" id="config-hfov" value="${sensor.hFov}" min="1" max="360" step="0.1" />
        </label>
        <label class="config-field">
          <span>V-FOV (°)</span>
          <input type="number" id="config-vfov" value="${sensor.vFov}" min="0.1" max="180" step="0.1" />
        </label>
        <label class="config-field">
          <span>Channels</span>
          <input type="number" id="config-channels" value="${sensor.channels}" min="1" max="128" step="1" />
        </label>
        <label class="config-field">
          <span>Ang. Res (°)</span>
          <input type="number" id="config-angularresh" value="${sensor.angularResH}" min="0.01" max="10" step="0.01" />
        </label>
      </div>
      <div class="config-row">
        <label class="config-field">
          <span>Min Range (m)</span>
          <input type="number" id="config-minrange" value="${sensor.minRange}" min="0.01" max="100" step="0.1" />
        </label>
        <label class="config-field">
          <span>Max Range (m)</span>
          <input type="number" id="config-maxrange" value="${sensor.maxRange}" min="0.1" max="1000" step="1" />
        </label>
      </div>
      <div class="config-row">
        <label class="config-field config-checkbox">
          <input type="checkbox" id="config-showvolume" ${showVolume ? 'checked' : ''} />
          <span>Show volume</span>
        </label>
        <label class="config-field config-checkbox">
          <input type="checkbox" id="config-showslice" ${sensor.showSlice ? 'checked' : ''} />
          <span>Show slice</span>
        </label>
        <label class="config-field config-checkbox">
          <input type="checkbox" id="config-showpointcloud" ${showPointCloud ? 'checked' : ''} />
          <span>Show point cloud</span>
        </label>
        <label class="config-field">
          <span>Point Color</span>
          <input type="color" id="config-pointcloudcolor" value="${pointCloudColor}" class="config-color-picker" />
        </label>
      </div>
    `;
  }

  /**
   * Set up event listeners for the config panel.
   */
  private setupConfigPanelListeners(sensor: SensorConfig): void {
    // Name input
    const nameInput = document.getElementById('config-name') as HTMLInputElement;
    if (nameInput) {
      nameInput.addEventListener('input', () => {
        this.app.updateSensor(sensor.id, { name: nameInput.value }, true);
      });
    }

    // Preset dropdown
    const presetSelect = document.getElementById('config-preset') as HTMLSelectElement;
    if (presetSelect) {
      presetSelect.addEventListener('change', () => {
        if (presetSelect.value) {
          const currentSensor = this.app.getState().sensors.find((s) => s.id === sensor.id);
          if (!currentSensor) return;
          
          const newId = this.app.addSensor(sensor.type, presetSelect.value);
          this.app.updateSensor(newId, {
            position: currentSensor.position,
            rotation: currentSensor.rotation,
            name: currentSensor.name,
          });
          this.app.removeSensor(sensor.id);
          this.app.selectSensor(newId);
        }
      });
    }

    // Position sliders
    this.setupSlider('x', (value) => {
      const current = this.app.getState().sensors.find((s) => s.id === sensor.id);
      if (current) {
        this.app.updateSensor(sensor.id, {
          position: { ...current.position, x: value },
        });
      }
    });
    this.setupSlider('y', (value) => {
      const current = this.app.getState().sensors.find((s) => s.id === sensor.id);
      if (current) {
        this.app.updateSensor(sensor.id, {
          position: { ...current.position, y: value },
        });
      }
    });
    this.setupSlider('z', (value) => {
      const current = this.app.getState().sensors.find((s) => s.id === sensor.id);
      if (current) {
        this.app.updateSensor(sensor.id, {
          position: { ...current.position, z: value },
        });
      }
    });

    // Rotation sliders
    this.setupSlider('roll', (value) => {
      const current = this.app.getState().sensors.find((s) => s.id === sensor.id);
      if (current) {
        this.app.updateSensor(sensor.id, {
          rotation: { ...current.rotation, roll: value },
        });
      }
    });
    this.setupSlider('pitch', (value) => {
      const current = this.app.getState().sensors.find((s) => s.id === sensor.id);
      if (current) {
        this.app.updateSensor(sensor.id, {
          rotation: { ...current.rotation, pitch: value },
        });
      }
    });
    this.setupSlider('yaw', (value) => {
      const current = this.app.getState().sensors.find((s) => s.id === sensor.id);
      if (current) {
        this.app.updateSensor(sensor.id, {
          rotation: { ...current.rotation, yaw: value },
        });
      }
    });

    // Sensor-specific controls
    if (sensor.type === 'camera') {
      this.setupCameraListeners(sensor as CameraSensorConfig);
    } else if (sensor.type === 'lidar') {
      this.setupLidarListeners(sensor as LidarSensorConfig);
    }
  }

  /**
   * Set up a slider with synchronized range and number inputs.
   */
  private setupSlider(name: string, onChange: (value: number) => void): void {
    const slider = document.getElementById(`config-${name}`) as HTMLInputElement;
    const number = document.getElementById(`config-${name}-num`) as HTMLInputElement;

    if (slider && number) {
      slider.addEventListener('input', () => {
        const value = parseFloat(slider.value);
        number.value = value.toFixed(parseFloat(slider.step) < 1 ? 2 : 0);
        onChange(value);
      });

      number.addEventListener('change', () => {
        const value = parseFloat(number.value);
        if (!isNaN(value)) {
          slider.value = String(value);
          onChange(value);
        }
      });
    }
  }

  /**
   * Clear the preset selection (set to Custom) and update the dropdown.
   */
  private clearPresetSelection(sensorId: string): void {
    this.app.updateSensor(sensorId, { presetId: undefined });
    const presetSelect = document.getElementById('config-preset') as HTMLSelectElement;
    if (presetSelect) {
      presetSelect.value = '';
    }
  }

  /**
   * Set up camera-specific listeners.
   */
  private setupCameraListeners(sensor: CameraSensorConfig): void {
    this.setupNumberInput('config-hfov', (value) => {
      this.app.updateSensor(sensor.id, { hFov: value });
      this.clearPresetSelection(sensor.id);
    });

    this.setupNumberInput('config-vfov', (value) => {
      this.app.updateSensor(sensor.id, { vFov: value });
      this.clearPresetSelection(sensor.id);
    });

    this.setupNumberInput('config-resh', (value) => {
      this.app.updateSensor(sensor.id, { resolutionH: Math.round(value) });
      this.clearPresetSelection(sensor.id);
    });

    this.setupNumberInput('config-resv', (value) => {
      this.app.updateSensor(sensor.id, { resolutionV: Math.round(value) });
      this.clearPresetSelection(sensor.id);
    });

    // Override frustum size checkbox
    const overrideCheckbox = document.getElementById('config-override-frustum') as HTMLInputElement;
    const maxRangeInput = document.getElementById('config-maxrange') as HTMLInputElement;
    const frustumSizeField = document.getElementById('frustum-size-field') as HTMLElement;

    if (overrideCheckbox && maxRangeInput && frustumSizeField) {
      overrideCheckbox.addEventListener('change', () => {
        const isOverride = overrideCheckbox.checked;
        maxRangeInput.disabled = !isOverride;
        frustumSizeField.style.opacity = isOverride ? '1' : '0.5';
        
        if (isOverride) {
          // When enabling override, use the current input value
          const value = parseFloat(maxRangeInput.value);
          this.app.updateSensor(sensor.id, { overrideFrustumSize: true, maxRange: value });
        } else {
          // When disabling override, reset to global default
          const defaultSize = this.app.getSettings().projection?.defaultFrustumSize ?? 10;
          maxRangeInput.value = String(defaultSize);
          this.app.updateSensor(sensor.id, { overrideFrustumSize: false });
        }
      });
    }

    this.setupNumberInput('config-maxrange', (value) => {
      if (overrideCheckbox?.checked) {
        this.app.updateSensor(sensor.id, { maxRange: value, overrideFrustumSize: true });
      }
    });

    // Distortion controls
    this.setupDistortionListeners(sensor);
  }

  /**
   * Set up distortion control listeners.
   */
  private setupDistortionListeners(sensor: CameraSensorConfig): void {
    // Distortion model dropdown
    const modelSelect = document.getElementById('config-distortion-model') as HTMLSelectElement;
    if (modelSelect) {
      modelSelect.addEventListener('change', () => {
        const currentSensor = this.app.getState().sensors.find(s => s.id === sensor.id) as CameraSensorConfig;
        if (currentSensor) {
          const model = modelSelect.value as 'brown-conrady' | 'fisheye-equidistant';
          this.app.updateSensor(sensor.id, {
            distortion: { ...currentSensor.distortion, model }
          });
        }
      });
    }

    // Show distortion toggle
    const showDistortionCheckbox = document.getElementById('config-show-distortion') as HTMLInputElement;
    if (showDistortionCheckbox) {
      showDistortionCheckbox.addEventListener('change', () => {
        this.app.updateSensor(sensor.id, { showDistortion: showDistortionCheckbox.checked });
      });
    }

    // Estimate from FOV button
    const estimateBtn = document.getElementById('config-estimate-distortion');
    if (estimateBtn) {
      estimateBtn.addEventListener('click', () => {
        const currentSensor = this.app.getState().sensors.find(s => s.id === sensor.id) as CameraSensorConfig;
        if (currentSensor) {
          const estimated = estimateDistortionFromFOV(currentSensor.hFov);
          this.app.updateSensor(sensor.id, { distortion: estimated });
          // Update the UI inputs
          this.updateDistortionInputs(estimated);
        }
      });
    }

    // Distortion coefficient inputs
    this.setupDistortionInput('config-k1', sensor, 'k1');
    this.setupDistortionInput('config-k2', sensor, 'k2');
    this.setupDistortionInput('config-p1', sensor, 'p1');
    this.setupDistortionInput('config-p2', sensor, 'p2');
  }

  /**
   * Set up a distortion coefficient input.
   */
  private setupDistortionInput(
    inputId: string, 
    sensor: CameraSensorConfig, 
    key: keyof CameraDistortion
  ): void {
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (input) {
      input.addEventListener('change', () => {
        const value = parseFloat(input.value);
        if (!isNaN(value)) {
          const currentSensor = this.app.getState().sensors.find(s => s.id === sensor.id) as CameraSensorConfig;
          if (currentSensor) {
            this.app.updateSensor(sensor.id, {
              distortion: { ...currentSensor.distortion, [key]: value }
            });
          }
        }
      });
    }
  }

  /**
   * Update distortion input fields with new values.
   */
  private updateDistortionInputs(distortion: CameraDistortion): void {
    const k1Input = document.getElementById('config-k1') as HTMLInputElement;
    const k2Input = document.getElementById('config-k2') as HTMLInputElement;
    const p1Input = document.getElementById('config-p1') as HTMLInputElement;
    const p2Input = document.getElementById('config-p2') as HTMLInputElement;
    const modelSelect = document.getElementById('config-distortion-model') as HTMLSelectElement;

    if (k1Input) k1Input.value = String(distortion.k1);
    if (k2Input) k2Input.value = String(distortion.k2);
    if (p1Input) p1Input.value = String(distortion.p1);
    if (p2Input) p2Input.value = String(distortion.p2);
    if (modelSelect) modelSelect.value = distortion.model;
  }

  /**
   * Set up LIDAR-specific listeners.
   */
  private setupLidarListeners(sensor: LidarSensorConfig): void {
    this.setupNumberInput('config-hfov', (value) => {
      this.app.updateSensor(sensor.id, { hFov: value });
      this.clearPresetSelection(sensor.id);
    });

    this.setupNumberInput('config-vfov', (value) => {
      this.app.updateSensor(sensor.id, { vFov: value });
      this.clearPresetSelection(sensor.id);
    });

    this.setupNumberInput('config-channels', (value) => {
      this.app.updateSensor(sensor.id, { channels: Math.round(value) });
      this.clearPresetSelection(sensor.id);
    });

    this.setupNumberInput('config-angularresh', (value) => {
      this.app.updateSensor(sensor.id, { angularResH: value });
      this.clearPresetSelection(sensor.id);
    });

    this.setupNumberInput('config-minrange', (value) => {
      this.app.updateSensor(sensor.id, { minRange: value });
      this.clearPresetSelection(sensor.id);
    });

    this.setupNumberInput('config-maxrange', (value) => {
      this.app.updateSensor(sensor.id, { maxRange: value });
      this.clearPresetSelection(sensor.id);
    });

    // Show volume checkbox (doesn't affect preset)
    const showVolumeCheckbox = document.getElementById('config-showvolume') as HTMLInputElement;
    if (showVolumeCheckbox) {
      showVolumeCheckbox.addEventListener('change', () => {
        this.app.updateSensor(sensor.id, { showVolume: showVolumeCheckbox.checked });
      });
    }

    // Show slice checkbox (doesn't affect preset)
    const showSliceCheckbox = document.getElementById('config-showslice') as HTMLInputElement;
    if (showSliceCheckbox) {
      showSliceCheckbox.addEventListener('change', () => {
        this.app.updateSensor(sensor.id, { showSlice: showSliceCheckbox.checked });
      });
    }

    // Show point cloud checkbox (doesn't affect preset)
    const showPointCloudCheckbox = document.getElementById('config-showpointcloud') as HTMLInputElement;
    if (showPointCloudCheckbox) {
      showPointCloudCheckbox.addEventListener('change', () => {
        this.app.updateSensor(sensor.id, { showPointCloud: showPointCloudCheckbox.checked });
      });
    }

    // Point cloud color picker (doesn't affect preset)
    const pointCloudColorInput = document.getElementById('config-pointcloudcolor') as HTMLInputElement;
    if (pointCloudColorInput) {
      pointCloudColorInput.addEventListener('input', () => {
        this.app.updateSensor(sensor.id, { pointCloudColor: pointCloudColorInput.value });
      });
    }
  }

  /**
   * Set up a number input with change event (not input event to allow typing).
   */
  private setupNumberInput(id: string, onChange: (value: number) => void): void {
    const input = document.getElementById(id) as HTMLInputElement;
    if (input) {
      // Use 'change' event so user can type full value before updating
      input.addEventListener('change', () => {
        const value = parseFloat(input.value);
        if (!isNaN(value)) {
          onChange(value);
        }
      });
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
   * Dispose of the panel.
   */
  dispose(): void {
    // Event listeners will be cleaned up when elements are removed
  }
}
