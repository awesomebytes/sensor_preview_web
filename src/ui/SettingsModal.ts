/**
 * Projection Settings modal dialog.
 * Allows configuring global visualization settings for sensors.
 */
import type { App } from '../App';
import type { ProjectionSettings, CoordinateSystem } from '../types/state';
import { DEFAULT_PROJECTION_SETTINGS } from '../types/state';

/**
 * Modal dialog for projection settings.
 */
export class SettingsModal {
  private app: App;
  private modalElement: HTMLElement | null = null;
  private isOpen = false;

  constructor(app: App) {
    this.app = app;
  }

  /**
   * Initialize the modal.
   */
  init(): void {
    this.createModal();
  }

  /**
   * Create the modal DOM structure.
   */
  private createModal(): void {
    // Create modal container
    this.modalElement = document.createElement('div');
    this.modalElement.id = 'settings-modal';
    this.modalElement.className = 'modal-overlay';
    this.modalElement.innerHTML = this.getModalHTML();
    document.body.appendChild(this.modalElement);

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Get the modal HTML content.
   */
  private getModalHTML(): string {
    const settings = this.app.getSettings();
    const projection = settings.projection || DEFAULT_PROJECTION_SETTINGS;

    return `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Projection Settings</h2>
          <button class="modal-close-btn" id="settings-close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <section class="settings-section">
            <h3>Coordinate System</h3>
            <div class="settings-row">
              <label class="radio-label">
                <input type="radio" name="coord-system" value="ros" ${settings.coordinateSystem === 'ros' ? 'checked' : ''} />
                <span>ROS (X-forward, Z-up)</span>
              </label>
              <label class="radio-label">
                <input type="radio" name="coord-system" value="threejs" ${settings.coordinateSystem === 'threejs' ? 'checked' : ''} />
                <span>Three.js (Y-up)</span>
              </label>
            </div>
          </section>

          <section class="settings-section">
            <h3>Sensor Visualization</h3>
            <div class="settings-row">
              <label class="settings-field">
                <span>Axes Size (m)</span>
                <input type="number" id="settings-axes-size" value="${projection.axesSize}" min="0.1" max="5" step="0.1" />
              </label>
              <label class="settings-field">
                <span>Label Size</span>
                <input type="number" id="settings-label-size" value="${projection.labelSize}" min="0.5" max="3" step="0.1" />
              </label>
            </div>
            <p class="settings-hint">Axes: RGB = XYZ (Red=forward, Green=left, Blue=up in ROS)</p>
          </section>

          <section class="settings-section">
            <h3>Camera Frustum</h3>
            <div class="settings-row">
              <label class="settings-field">
                <span>Default Frustum Length (m)</span>
                <input type="number" id="settings-frustum-size" value="${projection.defaultFrustumSize}" min="1" max="1000" step="1" />
              </label>
            </div>
            <p class="settings-hint">Per-sensor override available in camera config panel</p>
          </section>

          <section class="settings-section">
            <h3>LIDAR Point Cloud</h3>
            <div class="settings-row">
              <label class="settings-field">
                <span>Point Size (m)</span>
                <select id="settings-lidar-point-size">
                  <option value="0.02" ${projection.lidarPointSize === 0.02 ? 'selected' : ''}>Tiny (0.02m)</option>
                  <option value="0.05" ${projection.lidarPointSize === 0.05 ? 'selected' : ''}>Small (0.05m) - default</option>
                  <option value="0.15" ${projection.lidarPointSize === 0.15 ? 'selected' : ''}>Medium (0.15m)</option>
                  <option value="0.5" ${projection.lidarPointSize === 0.5 ? 'selected' : ''}>Large (0.5m)</option>
                  <option value="1.5" ${projection.lidarPointSize === 1.5 ? 'selected' : ''}>X-Large (1.5m) - city/highway</option>
                  <option value="3" ${projection.lidarPointSize === 3 ? 'selected' : ''}>XX-Large (3m)</option>
                </select>
              </label>
            </div>
          </section>

          <section class="settings-section">
            <h3>Scene Colors</h3>
            <div class="settings-row">
              <label class="settings-field">
                <span>Background</span>
                <input type="color" id="settings-bg-color" value="${projection.backgroundColor || '#f0f5fa'}" />
              </label>
              <label class="settings-field">
                <span>Floor</span>
                <input type="color" id="settings-floor-color" value="${projection.floorColor || '#c8d6e5'}" />
              </label>
            </div>
          </section>

          <section class="settings-section">
            <h3>Floor Grid</h3>
            <div class="settings-row">
              <label class="settings-checkbox">
                <input type="checkbox" id="settings-distance-markers" ${projection.showDistanceMarkers !== false ? 'checked' : ''} />
                <span>Show distance markers</span>
              </label>
            </div>
            <p class="settings-hint">Distance markers adapt to scenario size (closer marks near center)</p>
          </section>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="settings-reset-btn">Reset to Defaults</button>
          <button class="btn-primary" id="settings-apply-btn">Apply</button>
        </div>
      </div>
    `;
  }

  /**
   * Set up event listeners for the modal.
   */
  private setupEventListeners(): void {
    if (!this.modalElement) return;

    // Close button
    const closeBtn = this.modalElement.querySelector('#settings-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Click outside to close
    this.modalElement.addEventListener('click', (e) => {
      if (e.target === this.modalElement) {
        this.close();
      }
    });

    // Apply button
    const applyBtn = this.modalElement.querySelector('#settings-apply-btn');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => this.applySettings());
    }

    // Reset button
    const resetBtn = this.modalElement.querySelector('#settings-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetToDefaults());
    }

    // Coordinate system radio buttons - apply immediately
    const coordRadios = this.modalElement.querySelectorAll('input[name="coord-system"]');
    coordRadios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        const value = (e.target as HTMLInputElement).value as CoordinateSystem;
        this.app.updateSettings({ coordinateSystem: value });
      });
    });

    // Auto-apply on input change for projection settings
    const autoApplyInputs = [
      '#settings-axes-size',
      '#settings-label-size',
      '#settings-frustum-size',
      '#settings-lidar-point-size',
      '#settings-bg-color',
      '#settings-floor-color',
      '#settings-distance-markers',
    ];

    autoApplyInputs.forEach((selector) => {
      const input = this.modalElement!.querySelector(selector);
      if (input) {
        input.addEventListener('change', () => this.applySettings());
      }
    });
  }

  /**
   * Apply the current settings.
   */
  private applySettings(): void {
    if (!this.modalElement) return;

    const axesSizeInput = this.modalElement.querySelector('#settings-axes-size') as HTMLInputElement;
    const labelSizeInput = this.modalElement.querySelector('#settings-label-size') as HTMLInputElement;
    const frustumSizeInput = this.modalElement.querySelector('#settings-frustum-size') as HTMLInputElement;
    const lidarPointSizeSelect = this.modalElement.querySelector('#settings-lidar-point-size') as HTMLSelectElement;

    const bgColorInput = this.modalElement.querySelector('#settings-bg-color') as HTMLInputElement;
    const floorColorInput = this.modalElement.querySelector('#settings-floor-color') as HTMLInputElement;
    const distanceMarkersCheckbox = this.modalElement.querySelector('#settings-distance-markers') as HTMLInputElement;

    const projection: ProjectionSettings = {
      axesSize: parseFloat(axesSizeInput?.value || '0.3'),
      labelSize: parseFloat(labelSizeInput?.value || '1.0'),
      defaultFrustumSize: parseFloat(frustumSizeInput?.value || '10'),
      lidarPointSize: parseFloat(lidarPointSizeSelect?.value || '0.05'),
      backgroundColor: bgColorInput?.value || '#f0f5fa',
      floorColor: floorColorInput?.value || '#c8d6e5',
      showDistanceMarkers: distanceMarkersCheckbox?.checked ?? true,
    };

    this.app.updateProjectionSettings(projection);
  }

  /**
   * Reset settings to defaults.
   */
  private resetToDefaults(): void {
    if (!this.modalElement) return;

    // Update input values
    const axesSizeInput = this.modalElement.querySelector('#settings-axes-size') as HTMLInputElement;
    const labelSizeInput = this.modalElement.querySelector('#settings-label-size') as HTMLInputElement;
    const frustumSizeInput = this.modalElement.querySelector('#settings-frustum-size') as HTMLInputElement;
    const lidarPointSizeSelect = this.modalElement.querySelector('#settings-lidar-point-size') as HTMLSelectElement;

    const bgColorInput = this.modalElement.querySelector('#settings-bg-color') as HTMLInputElement;
    const floorColorInput = this.modalElement.querySelector('#settings-floor-color') as HTMLInputElement;
    const distanceMarkersCheckbox = this.modalElement.querySelector('#settings-distance-markers') as HTMLInputElement;

    if (axesSizeInput) axesSizeInput.value = String(DEFAULT_PROJECTION_SETTINGS.axesSize);
    if (labelSizeInput) labelSizeInput.value = String(DEFAULT_PROJECTION_SETTINGS.labelSize);
    if (frustumSizeInput) frustumSizeInput.value = String(DEFAULT_PROJECTION_SETTINGS.defaultFrustumSize);
    if (lidarPointSizeSelect) lidarPointSizeSelect.value = String(DEFAULT_PROJECTION_SETTINGS.lidarPointSize);
    if (bgColorInput) bgColorInput.value = DEFAULT_PROJECTION_SETTINGS.backgroundColor;
    if (floorColorInput) floorColorInput.value = DEFAULT_PROJECTION_SETTINGS.floorColor;
    if (distanceMarkersCheckbox) distanceMarkersCheckbox.checked = DEFAULT_PROJECTION_SETTINGS.showDistanceMarkers;

    // Apply the defaults
    this.app.updateProjectionSettings({ ...DEFAULT_PROJECTION_SETTINGS });
  }

  /**
   * Open the modal.
   */
  open(): void {
    if (!this.modalElement) return;

    // Refresh the modal content with current settings
    this.modalElement.innerHTML = this.getModalHTML();
    this.setupEventListeners();

    this.modalElement.classList.add('visible');
    this.isOpen = true;
  }

  /**
   * Close the modal.
   */
  close(): void {
    if (!this.modalElement) return;

    this.modalElement.classList.remove('visible');
    this.isOpen = false;
  }

  /**
   * Toggle the modal.
   */
  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Check if the modal is open.
   */
  getIsOpen(): boolean {
    return this.isOpen;
  }

  /**
   * Dispose of the modal.
   */
  dispose(): void {
    if (this.modalElement) {
      this.modalElement.remove();
      this.modalElement = null;
    }
  }
}
