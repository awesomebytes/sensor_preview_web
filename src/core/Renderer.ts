import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Manages the render loop and window resize handling.
 */
export class Renderer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;

  private animationFrameId: number | null = null;
  private isRunning = false;
  private resizeTarget: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // Callbacks for render loop
  private onBeforeRenderCallbacks: Array<(time: number, delta: number) => void> = [];
  private lastTime = 0;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
  }

  /**
   * Set the resize target element and camera to update on resize.
   */
  setResizeTarget(container: HTMLElement, camera: THREE.PerspectiveCamera): void {
    this.resizeTarget = container;

    // Clean up existing observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    // Create resize observer for the container
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this.handleResize(width, height, camera);
      }
    });

    this.resizeObserver.observe(container);
  }

  /**
   * Handle container resize.
   */
  private handleResize(
    width: number,
    height: number,
    camera: THREE.PerspectiveCamera
  ): void {
    if (width === 0 || height === 0) {
      return;
    }

    // Update camera aspect ratio
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    // Update renderer size
    this.renderer.setSize(width, height);
  }

  /**
   * Add a callback to be called before each render.
   * @param callback Function receiving (time, deltaTime) in seconds
   */
  onBeforeRender(callback: (time: number, delta: number) => void): void {
    this.onBeforeRenderCallbacks.push(callback);
  }

  /**
   * Remove a before-render callback.
   */
  offBeforeRender(callback: (time: number, delta: number) => void): void {
    const index = this.onBeforeRenderCallbacks.indexOf(callback);
    if (index !== -1) {
      this.onBeforeRenderCallbacks.splice(index, 1);
    }
  }

  /**
   * Start the render loop.
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.lastTime = performance.now();
    this.animate();
    console.log('Render loop started');
  }

  /**
   * Stop the render loop.
   */
  stop(): void {
    this.isRunning = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    console.log('Render loop stopped');
  }

  /**
   * Main animation loop.
   */
  private animate = (): void => {
    if (!this.isRunning) {
      return;
    }

    this.animationFrameId = requestAnimationFrame(this.animate);

    // Calculate delta time
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;

    // Call before-render callbacks
    const timeInSeconds = currentTime / 1000;
    for (const callback of this.onBeforeRenderCallbacks) {
      callback(timeInSeconds, deltaTime);
    }

    // Update controls (needed for damping)
    this.controls.update();

    // Render the scene
    this.renderer.render(this.scene, this.camera);
  };

  /**
   * Force a single render (useful when not in continuous mode).
   */
  renderOnce(): void {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Check if the render loop is running.
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    this.stop();

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.onBeforeRenderCallbacks = [];
  }
}
