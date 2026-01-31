import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CoordinateSystem } from './CoordinateSystem';
import { Renderer } from './Renderer';
import { DistanceMarkers, getScenarioFloorSize } from './DistanceMarkers';
import { SENSOR_VIS_LAYER } from '../sensors/BaseSensor';
import { DEFAULT_PROJECTION_SETTINGS } from '../types/state';

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
  
  // Floor and distance markers
  private floor: THREE.Mesh | null = null;
  private distanceMarkers: DistanceMarkers | null = null;
  private currentScenarioType: string = 'household-large';
  
  // Current colors
  private backgroundColor: string = DEFAULT_PROJECTION_SETTINGS.backgroundColor;
  private floorColor: string = DEFAULT_PROJECTION_SETTINGS.floorColor;
  private showDistanceMarkers: boolean = DEFAULT_PROJECTION_SETTINGS.showDistanceMarkers;

  constructor() {
    // Initialize Three.js scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.backgroundColor);

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
    // Grid helper will be created based on scenario size
    // Initially use default size
    this.updateFloorAndMarkers();

    // Axes helper - 2 meter axes
    // Red: X (forward in ROS), Green: Y (left in ROS), Blue: Z (up in ROS)
    this.axesHelper = new THREE.AxesHelper(2);
    this.coordinateSystem.addToWorld(this.axesHelper);
  }

  /**
   * Update floor and distance markers based on current scenario.
   */
  private updateFloorAndMarkers(): void {
    const size = getScenarioFloorSize(this.currentScenarioType);

    // Remove old grid helper if exists
    if (this.gridHelper) {
      this.coordinateSystem.removeFromWorld(this.gridHelper);
      this.gridHelper.geometry.dispose();
      if (Array.isArray(this.gridHelper.material)) {
        this.gridHelper.material.forEach(m => m.dispose());
      } else {
        this.gridHelper.material.dispose();
      }
      this.gridHelper = null;
    }

    // Remove old floor if exists
    if (this.floor) {
      this.coordinateSystem.removeFromWorld(this.floor);
      this.floor.geometry.dispose();
      (this.floor.material as THREE.Material).dispose();
      this.floor = null;
    }

    // Remove old distance markers
    if (this.distanceMarkers) {
      this.coordinateSystem.removeFromWorld(this.distanceMarkers.getGroup());
      this.distanceMarkers.dispose();
      this.distanceMarkers = null;
    }

    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(size, size);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.floorColor),
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
    this.floor.name = 'scene-floor';
    this.floor.receiveShadow = true;
    // Floor at Z=0 (XY plane in ROS)
    this.floor.position.set(0, 0, -0.001); // Slightly below to avoid z-fighting
    this.coordinateSystem.addToWorld(this.floor);

    // Create simple grid helper (subtle)
    const divisions = Math.min(size, 100); // Max 100 divisions
    this.gridHelper = new THREE.GridHelper(size, divisions, 0x888888, 0xaaaaaa);
    this.gridHelper.rotation.x = Math.PI / 2;
    this.gridHelper.position.z = 0.002; // Above floor
    this.coordinateSystem.addToWorld(this.gridHelper);

    // Create distance markers if enabled
    if (this.showDistanceMarkers) {
      // Determine text color based on background brightness
      const bgColorObj = new THREE.Color(this.backgroundColor);
      const brightness = bgColorObj.r * 0.299 + bgColorObj.g * 0.587 + bgColorObj.b * 0.114;
      const textColor = brightness > 0.5 ? '#333333' : '#cccccc';

      this.distanceMarkers = new DistanceMarkers({
        size,
        textColor,
      });
      this.coordinateSystem.addToWorld(this.distanceMarkers.getGroup());
    }
  }

  /**
   * Set the background color.
   */
  setBackgroundColor(color: string): void {
    this.backgroundColor = color;
    this.scene.background = new THREE.Color(color);
  }

  /**
   * Set the floor color.
   */
  setFloorColor(color: string): void {
    this.floorColor = color;
    if (this.floor) {
      (this.floor.material as THREE.MeshStandardMaterial).color.set(color);
    }
  }

  /**
   * Set whether to show distance markers.
   */
  setShowDistanceMarkers(show: boolean): void {
    if (this.showDistanceMarkers !== show) {
      this.showDistanceMarkers = show;
      this.updateFloorAndMarkers();
    }
  }

  /**
   * Update for a new scenario.
   */
  setScenarioType(type: string): void {
    if (this.currentScenarioType !== type) {
      this.currentScenarioType = type;
      this.updateFloorAndMarkers();
      
      // Update camera far plane and controls for larger scenarios
      const size = getScenarioFloorSize(type);
      this.camera.far = Math.max(1000, size * 2);
      this.camera.updateProjectionMatrix();
      this.controls.maxDistance = Math.max(100, size * 1.5);
    }
  }

  /**
   * Get the current scenario floor size.
   */
  getCurrentFloorSize(): number {
    return getScenarioFloorSize(this.currentScenarioType);
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
   * Reset the camera to look at the origin.
   * Positions camera at a reasonable distance and angle.
   */
  resetCamera(): void {
    // Reset orbit controls target to origin
    this.controls.target.set(0, 0, 0);
    
    // Position camera at a nice viewing angle
    this.camera.position.set(8, 8, 8);
    
    // Update controls
    this.controls.update();
    
    console.log('Camera reset to origin');
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
      if (Array.isArray(this.gridHelper.material)) {
        this.gridHelper.material.forEach(m => m.dispose());
      } else {
        this.gridHelper.material.dispose();
      }
    }
    if (this.axesHelper) {
      this.axesHelper.geometry.dispose();
      if (Array.isArray(this.axesHelper.material)) {
        this.axesHelper.material.forEach(m => m.dispose());
      } else {
        (this.axesHelper.material as THREE.Material).dispose();
      }
    }
    if (this.floor) {
      this.floor.geometry.dispose();
      (this.floor.material as THREE.Material).dispose();
    }
    if (this.distanceMarkers) {
      this.distanceMarkers.dispose();
    }
  }
}
