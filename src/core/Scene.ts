import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CoordinateSystem } from './CoordinateSystem';
import { Renderer } from './Renderer';
import { SENSOR_VIS_LAYER } from '../sensors/BaseSensor';

/**
 * Main 3D scene setup and management.
 * Handles Three.js scene, camera, renderer, and controls.
 */
export class Scene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private webglRenderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private coordinateSystem: CoordinateSystem;
  private renderManager: Renderer;
  private container: HTMLElement | null = null;

  // Scene helpers
  private gridHelper: THREE.GridHelper | null = null;
  private axesHelper: THREE.AxesHelper | null = null;

  constructor() {
    // Initialize Three.js scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    // Initialize camera with default settings
    // Will be updated on init() when container size is known
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    this.camera.position.set(8, 8, 8);
    this.camera.lookAt(0, 0, 0);

    // Enable sensor visualization layer so main camera sees frustums/markers
    this.camera.layers.enable(SENSOR_VIS_LAYER);

    // Initialize renderer
    this.webglRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.webglRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.webglRenderer.shadowMap.enabled = true;
    this.webglRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Initialize orbit controls
    this.controls = new OrbitControls(this.camera, this.webglRenderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = true;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 100;
    this.controls.maxPolarAngle = Math.PI;

    // Initialize coordinate system (handles ROS transform)
    this.coordinateSystem = new CoordinateSystem(this.scene);

    // Initialize render manager
    this.renderManager = new Renderer(
      this.webglRenderer,
      this.scene,
      this.camera,
      this.controls
    );

    // Add lighting
    this.setupLighting();

    // Add scene helpers (grid and axes)
    this.setupHelpers();
  }

  /**
   * Initialize the scene in a container element.
   * Must be called after DOM is ready.
   */
  init(container: HTMLElement): void {
    this.container = container;

    // Set renderer size to container
    const rect = container.getBoundingClientRect();
    this.webglRenderer.setSize(rect.width, rect.height);
    this.camera.aspect = rect.width / rect.height;
    this.camera.updateProjectionMatrix();

    // Append canvas to container
    container.appendChild(this.webglRenderer.domElement);

    // Setup resize handling
    this.renderManager.setResizeTarget(container, this.camera);

    // Start render loop
    this.renderManager.start();

    console.log('Scene initialized', {
      width: rect.width,
      height: rect.height,
    });
  }

  /**
   * Setup scene lighting.
   */
  private setupLighting(): void {
    // Ambient light for general illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    // Directional light (main light source)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    this.scene.add(directionalLight);

    // Hemisphere light for sky/ground color blending
    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x444444, 0.3);
    this.scene.add(hemisphereLight);
  }

  /**
   * Setup scene helpers (grid and axes).
   */
  private setupHelpers(): void {
    // Grid helper - 20x20 meters with 20 divisions
    this.gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x333333);
    // Apply rotation for ROS coordinate system (grid on XY plane with Z up)
    this.gridHelper.rotation.x = Math.PI / 2;
    this.coordinateSystem.addToWorld(this.gridHelper);

    // Axes helper - 2 meter axes
    // Red: X (forward in ROS), Green: Y (left in ROS), Blue: Z (up in ROS)
    this.axesHelper = new THREE.AxesHelper(2);
    this.coordinateSystem.addToWorld(this.axesHelper);
  }

  /**
   * Get the Three.js scene object.
   */
  getThreeScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * Get the coordinate system manager.
   */
  getCoordinateSystem(): CoordinateSystem {
    return this.coordinateSystem;
  }

  /**
   * Get the WebGL renderer.
   */
  getRenderer(): THREE.WebGLRenderer {
    return this.webglRenderer;
  }

  /**
   * Get the camera.
   */
  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /**
   * Get the render manager.
   */
  getRenderManager(): Renderer {
    return this.renderManager;
  }

  /**
   * Add an object to the world (via coordinate system).
   */
  addToWorld(object: THREE.Object3D): void {
    this.coordinateSystem.addToWorld(object);
  }

  /**
   * Remove an object from the world (via coordinate system).
   */
  removeFromWorld(object: THREE.Object3D): void {
    this.coordinateSystem.removeFromWorld(object);
  }

  /**
   * Get all scenario objects for raycasting.
   */
  getScenarioObjects(): THREE.Object3D[] {
    return this.coordinateSystem.getWorldChildren();
  }

  /**
   * Dispose of all scene resources.
   */
  dispose(): void {
    this.renderManager.stop();
    this.controls.dispose();
    this.webglRenderer.dispose();

    // Dispose helpers
    if (this.gridHelper) {
      this.gridHelper.geometry.dispose();
      (this.gridHelper.material as THREE.Material).dispose();
    }
    if (this.axesHelper) {
      this.axesHelper.geometry.dispose();
      (this.axesHelper.material as THREE.Material).dispose();
    }
  }
}
