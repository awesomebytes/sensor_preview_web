import * as THREE from 'three';
import type { CameraSensor } from '../sensors/CameraSensor';

/**
 * Manages the camera preview display panel.
 * Renders the scene from a camera sensor's perspective and displays it in the UI.
 * The panel is resizable by dragging the top edge.
 */
export class PreviewPanel {
  private container: HTMLElement;
  private previewElement: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer: THREE.WebGLRenderer;

  // Current camera being previewed
  private currentCamera: CameraSensor | null = null;

  // Header element for camera name
  private headerElement: HTMLElement;

  // Content wrapper
  private contentWrapper: HTMLElement;

  // Resize handle
  private resizeHandle: HTMLElement;
  private isResizing = false;
  private startY = 0;
  private startHeight = 0;

  // Pixel buffer for reading render target
  private pixelBuffer: Uint8Array | null = null;
  private lastWidth = 0;
  private lastHeight = 0;

  // Storage key for persisting height
  private static readonly STORAGE_KEY = 'preview-panel-height';
  private static readonly DEFAULT_HEIGHT = 300;
  private static readonly MIN_HEIGHT = 100;
  private static readonly MAX_HEIGHT_RATIO = 0.8; // 80% of viewport

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;

    // Get DOM elements
    const container = document.getElementById('preview-container');
    const previewElement = document.getElementById('camera-preview');

    if (!container || !previewElement) {
      throw new Error('Preview container elements not found in DOM');
    }

    this.container = container;
    this.previewElement = previewElement;

    // Create resize handle at the top
    this.resizeHandle = document.createElement('div');
    this.resizeHandle.className = 'preview-resize-handle';
    this.resizeHandle.title = 'Drag to resize';
    this.container.insertBefore(this.resizeHandle, this.container.firstChild);

    // Create content wrapper
    this.contentWrapper = document.createElement('div');
    this.contentWrapper.className = 'preview-content';

    // Create header for camera name
    this.headerElement = document.createElement('div');
    this.headerElement.className = 'preview-header';
    this.contentWrapper.appendChild(this.headerElement);

    // Move preview element into content wrapper
    this.contentWrapper.appendChild(this.previewElement);
    this.container.appendChild(this.contentWrapper);

    // Create canvas for displaying the preview
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.objectFit = 'contain';
    this.previewElement.appendChild(this.canvas);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D canvas context');
    }
    this.ctx = ctx;

    // Setup resize functionality
    this.setupResize();

    // Restore saved height
    this.restoreHeight();

    // Initially hidden
    this.hide();
  }

  /**
   * Setup resize drag functionality.
   */
  private setupResize(): void {
    this.resizeHandle.addEventListener('mousedown', this.onResizeStart);
    document.addEventListener('mousemove', this.onResizeMove);
    document.addEventListener('mouseup', this.onResizeEnd);
  }

  private onResizeStart = (e: MouseEvent): void => {
    this.isResizing = true;
    this.startY = e.clientY;
    this.startHeight = this.container.offsetHeight;
    this.resizeHandle.classList.add('dragging');
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  };

  private onResizeMove = (e: MouseEvent): void => {
    if (!this.isResizing) return;

    // Calculate new height (dragging up increases height)
    const deltaY = this.startY - e.clientY;
    const newHeight = Math.max(
      PreviewPanel.MIN_HEIGHT,
      Math.min(
        window.innerHeight * PreviewPanel.MAX_HEIGHT_RATIO,
        this.startHeight + deltaY
      )
    );

    this.container.style.height = `${newHeight}px`;
  };

  private onResizeEnd = (): void => {
    if (!this.isResizing) return;

    this.isResizing = false;
    this.resizeHandle.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    // Save height to localStorage
    this.saveHeight();
  };

  /**
   * Save current height to localStorage.
   */
  private saveHeight(): void {
    try {
      const height = this.container.offsetHeight;
      localStorage.setItem(PreviewPanel.STORAGE_KEY, String(height));
    } catch {
      // Ignore localStorage errors
    }
  }

  /**
   * Restore height from localStorage.
   */
  private restoreHeight(): void {
    try {
      const saved = localStorage.getItem(PreviewPanel.STORAGE_KEY);
      const height = saved ? parseInt(saved, 10) : PreviewPanel.DEFAULT_HEIGHT;
      if (!isNaN(height) && height >= PreviewPanel.MIN_HEIGHT) {
        this.container.style.height = `${Math.min(height, window.innerHeight * PreviewPanel.MAX_HEIGHT_RATIO)}px`;
      } else {
        this.container.style.height = `${PreviewPanel.DEFAULT_HEIGHT}px`;
      }
    } catch {
      this.container.style.height = `${PreviewPanel.DEFAULT_HEIGHT}px`;
    }
  }

  /**
   * Set the camera sensor to preview.
   * @param camera The camera sensor to preview, or null to clear
   */
  setCamera(camera: CameraSensor | null): void {
    this.currentCamera = camera;

    if (camera) {
      const config = camera.getConfig();
      this.updateHeader(config.name, camera.getPreviewShowsSensorVis());
      this.show();
    } else {
      this.headerElement.innerHTML = '';
      this.hide();
    }
  }

  /**
   * Update the header with camera name and visibility toggle.
   */
  private updateHeader(cameraName: string, showSensorVis: boolean): void {
    this.headerElement.innerHTML = `
      <span>Preview: ${cameraName}</span>
      <label class="preview-toggle">
        <input type="checkbox" ${showSensorVis ? 'checked' : ''} />
        <span>Show Sensor Projections</span>
      </label>
    `;

    // Add event listener to checkbox
    const checkbox = this.headerElement.querySelector('input[type="checkbox"]') as HTMLInputElement;
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        if (this.currentCamera) {
          this.currentCamera.setPreviewShowsSensorVis(checkbox.checked);
        }
      });
    }
  }

  /**
   * Get the currently previewed camera.
   */
  getCamera(): CameraSensor | null {
    return this.currentCamera;
  }

  /**
   * Update the preview display.
   * Should be called each frame when a camera is being previewed.
   */
  update(): void {
    if (!this.currentCamera || !this.currentCamera.getConfig().enabled) {
      return;
    }

    // Render from the camera's perspective
    const texture = this.currentCamera.renderPreview(this.renderer);
    const renderTarget = this.currentCamera.getRenderTarget();

    // Get render target dimensions
    const width = renderTarget.width;
    const height = renderTarget.height;

    // Resize canvas if needed
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    // Allocate pixel buffer if needed
    if (this.lastWidth !== width || this.lastHeight !== height || !this.pixelBuffer) {
      this.pixelBuffer = new Uint8Array(width * height * 4);
      this.lastWidth = width;
      this.lastHeight = height;
    }

    // Read pixels from render target
    this.renderer.readRenderTargetPixels(
      renderTarget,
      0,
      0,
      width,
      height,
      this.pixelBuffer
    );

    // Create ImageData and draw to canvas
    // Note: WebGL renders with Y flipped, so we need to flip vertically
    const imageData = this.ctx.createImageData(width, height);

    // Copy pixels with vertical flip
    for (let y = 0; y < height; y++) {
      const srcRow = (height - 1 - y) * width * 4;
      const dstRow = y * width * 4;
      for (let x = 0; x < width * 4; x++) {
        imageData.data[dstRow + x] = this.pixelBuffer[srcRow + x];
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Show the preview panel.
   */
  show(): void {
    this.container.classList.add('visible');
  }

  /**
   * Hide the preview panel.
   */
  hide(): void {
    this.container.classList.remove('visible');
  }

  /**
   * Check if the panel is currently visible.
   */
  isVisible(): boolean {
    return this.container.classList.contains('visible');
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    // Remove event listeners
    this.resizeHandle.removeEventListener('mousedown', this.onResizeStart);
    document.removeEventListener('mousemove', this.onResizeMove);
    document.removeEventListener('mouseup', this.onResizeEnd);

    this.currentCamera = null;
    this.pixelBuffer = null;
  }
}
