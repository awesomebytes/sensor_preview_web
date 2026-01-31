/**
 * Help modal dialog.
 * Provides information about the application and its purpose.
 */

/**
 * Modal dialog for help/about information.
 */
export class HelpModal {
  private modalElement: HTMLElement | null = null;
  private isOpen = false;

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
    this.modalElement = document.createElement('div');
    this.modalElement.id = 'help-modal';
    this.modalElement.className = 'modal-overlay';
    this.modalElement.innerHTML = this.getModalHTML();
    document.body.appendChild(this.modalElement);

    this.setupEventListeners();
  }

  /**
   * Get the modal HTML content.
   */
  private getModalHTML(): string {
    return `
      <div class="modal-content help-modal-content">
        <div class="modal-header">
          <h2>About Sensor Preview Tool</h2>
          <button class="modal-close-btn" id="help-close-btn">&times;</button>
        </div>
        <div class="modal-body help-body">
          <section class="help-section">
            <h3>What is this?</h3>
            <p>
              <strong>Sensor Preview Tool</strong> is a browser-based 3D visualization tool for 
              <em>prototyping your sensor setup</em> and understanding what your system will be able to perceive.
            </p>
            <p>
              Place cameras and LIDARs in a virtual scene, adjust their positions and orientations, 
              and see their fields of view and simulated outputs in real-time.
            </p>
          </section>

          <section class="help-section">
            <h3>Why was this made?</h3>
            <p>
              This tool was born from wanting something <strong>quick to prototype</strong> sensor configurations 
              without needing to:
            </p>
            <ul>
              <li>Install any software or simulation environment</li>
              <li>Write URDF, SDF, or other simulation formats</li>
              <li>Set up a full robotics simulation stack</li>
            </ul>
            <p>
              Just open the browser and start experimenting with sensor placements immediately.
            </p>
          </section>

          <section class="help-section">
            <h3>Export to URDF/SDF</h3>
            <p>
              Once you've designed your sensor configuration, you can <strong>export it as JSON</strong> 
              and give it to an LLM (like ChatGPT, Claude, etc.) to convert it into:
            </p>
            <ul>
              <li>URDF for ROS/ROS2</li>
              <li>SDF for Gazebo</li>
              <li>Other simulation formats</li>
            </ul>
            <p class="help-tip">
              <strong>Tip:</strong> Click "Export" in the sidebar, copy the JSON, and ask the LLM: 
              <em>"Convert this sensor configuration to URDF format"</em>
            </p>
          </section>

          <section class="help-section">
            <h3>Contribute</h3>
            <p>
              This is an open-source project! We're accepting:
            </p>
            <ul>
              <li><strong>Pull requests</strong> with improvements or bug fixes</li>
              <li><strong>Ideas</strong> for new features</li>
              <li><strong>Additional sensor presets</strong> (cameras, LIDARs, depth sensors, etc.)</li>
            </ul>
            <p>
              <a href="https://github.com/awesomebytes/sensor_preview_web" target="_blank" rel="noopener noreferrer" class="help-link">
                <img src="/github_cat_blue.webp" alt="GitHub" class="help-github-icon" />
                github.com/awesomebytes/sensor_preview_web
              </a>
            </p>
          </section>

          <section class="help-section help-controls">
            <h3>Controls</h3>
            <div class="help-controls-grid">
              <div class="help-control">
                <kbd>Left Mouse</kbd>
                <span>Rotate view</span>
              </div>
              <div class="help-control">
                <kbd>Right Mouse</kbd>
                <span>Pan view</span>
              </div>
              <div class="help-control">
                <kbd>Scroll</kbd>
                <span>Zoom in/out</span>
              </div>
            </div>
          </section>
        </div>
        <div class="modal-footer">
          <button class="btn-primary" id="help-ok-btn">Got it!</button>
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
    const closeBtn = this.modalElement.querySelector('#help-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // OK button
    const okBtn = this.modalElement.querySelector('#help-ok-btn');
    if (okBtn) {
      okBtn.addEventListener('click', () => this.close());
    }

    // Click outside to close
    this.modalElement.addEventListener('click', (e) => {
      if (e.target === this.modalElement) {
        this.close();
      }
    });

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  /**
   * Open the modal.
   */
  open(): void {
    if (!this.modalElement) return;
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
