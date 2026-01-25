import * as THREE from 'three';
import { BaseSensor, SENSOR_VIS_LAYER } from './BaseSensor';
import type { CameraSensorConfig } from '../types/sensors';
import type { Scene } from '../core/Scene';

/**
 * Camera sensor with frustum visualization and preview rendering.
 * Renders a semi-transparent truncated pyramid showing the camera's field of view.
 * Can render the scene from the sensor's perspective for preview display.
 */
export class CameraSensor extends BaseSensor<CameraSensorConfig> {
  private frustumMesh: THREE.Mesh | null = null;
  private frustumEdges: THREE.LineSegments | null = null;
  private sensorMarker: THREE.Mesh | null = null;

  // Preview rendering components
  private previewCamera: THREE.PerspectiveCamera;
  private renderTarget: THREE.WebGLRenderTarget;

  // Preview resolution (reduced from sensor resolution for performance)
  private static readonly PREVIEW_SCALE = 0.25;

  constructor(config: CameraSensorConfig, scene: Scene) {
    super(config, scene);

    // Initialize preview camera with sensor's FOV
    // Using vertical FOV as Three.js PerspectiveCamera expects vFov
    this.previewCamera = new THREE.PerspectiveCamera(
      config.vFov,
      config.resolutionH / config.resolutionV,
      config.minRange,
      config.maxRange
    );
    // Add preview camera to the sensor group so it inherits pose transforms
    this.group.add(this.previewCamera);

    // Orient the preview camera to look along +X (forward in ROS convention)
    // with +Z as the up direction (ROS convention)
    // Use a lookAt matrix to compute the correct rotation
    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix.lookAt(
      new THREE.Vector3(0, 0, 0),   // eye position
      new THREE.Vector3(1, 0, 0),   // look at +X (forward)
      new THREE.Vector3(0, 0, 1)    // up is +Z
    );
    this.previewCamera.setRotationFromMatrix(rotationMatrix);

    // Enable sensor visualization layer so preview camera sees frustums by default
    // This can be toggled via setPreviewShowsSensorVis()
    this.previewCamera.layers.enable(SENSOR_VIS_LAYER);

    // Create render target at reduced resolution for performance
    const previewWidth = Math.max(1, Math.floor(config.resolutionH * CameraSensor.PREVIEW_SCALE));
    const previewHeight = Math.max(1, Math.floor(config.resolutionV * CameraSensor.PREVIEW_SCALE));
    this.renderTarget = new THREE.WebGLRenderTarget(previewWidth, previewHeight, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });

    this.createVisualization();
  }

  /**
   * Create the camera frustum visualization.
   */
  createVisualization(): void {
    // Create the frustum geometry
    const geometry = this.createFrustumGeometry();

    // Parse color from config (hex string to number)
    const color = new THREE.Color(this.config.color);

    // Semi-transparent material for the frustum volume
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.frustumMesh = new THREE.Mesh(geometry, material);
    this.setVisualizationLayer(this.frustumMesh);
    this.group.add(this.frustumMesh);

    // Add wireframe edges for better visibility
    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const edgesMaterial = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.6,
    });
    this.frustumEdges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    this.setVisualizationLayer(this.frustumEdges);
    this.group.add(this.frustumEdges);

    // Add a small sphere at the sensor origin
    const markerGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: color });
    this.sensorMarker = new THREE.Mesh(markerGeometry, markerMaterial);
    this.setVisualizationLayer(this.sensorMarker);
    this.group.add(this.sensorMarker);
  }

  /**
   * Create the frustum geometry as a truncated pyramid.
   * The frustum points along the +X axis (forward in ROS convention).
   */
  private createFrustumGeometry(): THREE.BufferGeometry {
    const { hFov, vFov, minRange, maxRange } = this.config;

    // Convert FOV to radians
    const hFovRad = THREE.MathUtils.degToRad(hFov);
    const vFovRad = THREE.MathUtils.degToRad(vFov);

    // Calculate half-widths and half-heights at near and far planes
    // Frustum points along +X, so width is along Y and height is along Z
    const nearHalfWidth = minRange * Math.tan(hFovRad / 2);
    const nearHalfHeight = minRange * Math.tan(vFovRad / 2);
    const farHalfWidth = maxRange * Math.tan(hFovRad / 2);
    const farHalfHeight = maxRange * Math.tan(vFovRad / 2);

    // Define the 8 vertices of the truncated pyramid
    // Near plane (at minRange along +X)
    const n0 = new THREE.Vector3(minRange, -nearHalfWidth, -nearHalfHeight); // bottom-right
    const n1 = new THREE.Vector3(minRange, nearHalfWidth, -nearHalfHeight);  // bottom-left
    const n2 = new THREE.Vector3(minRange, nearHalfWidth, nearHalfHeight);   // top-left
    const n3 = new THREE.Vector3(minRange, -nearHalfWidth, nearHalfHeight);  // top-right

    // Far plane (at maxRange along +X)
    const f0 = new THREE.Vector3(maxRange, -farHalfWidth, -farHalfHeight); // bottom-right
    const f1 = new THREE.Vector3(maxRange, farHalfWidth, -farHalfHeight);  // bottom-left
    const f2 = new THREE.Vector3(maxRange, farHalfWidth, farHalfHeight);   // top-left
    const f3 = new THREE.Vector3(maxRange, -farHalfWidth, farHalfHeight);  // top-right

    // Create geometry using BufferGeometry with indexed faces
    const vertices = new Float32Array([
      // Near plane vertices (0-3)
      n0.x, n0.y, n0.z,
      n1.x, n1.y, n1.z,
      n2.x, n2.y, n2.z,
      n3.x, n3.y, n3.z,
      // Far plane vertices (4-7)
      f0.x, f0.y, f0.z,
      f1.x, f1.y, f1.z,
      f2.x, f2.y, f2.z,
      f3.x, f3.y, f3.z,
    ]);

    // Define faces using triangle indices
    // Each face is defined as two triangles
    const indices = new Uint16Array([
      // Near plane
      0, 1, 2, 0, 2, 3,
      // Far plane
      4, 6, 5, 4, 7, 6,
      // Bottom face (connecting bottom edges)
      0, 4, 5, 0, 5, 1,
      // Top face (connecting top edges)
      2, 6, 7, 2, 7, 3,
      // Left face (connecting left edges)
      1, 5, 6, 1, 6, 2,
      // Right face (connecting right edges)
      0, 3, 7, 0, 7, 4,
    ]);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();

    return geometry;
  }

  /**
   * Update the visualization when configuration changes.
   */
  updateVisualization(): void {
    // Recreate the frustum geometry if FOV or range changed
    if (this.frustumMesh && this.frustumEdges) {
      // Dispose old geometries
      this.frustumMesh.geometry.dispose();
      this.frustumEdges.geometry.dispose();

      // Create new frustum geometry
      const newGeometry = this.createFrustumGeometry();
      this.frustumMesh.geometry = newGeometry;
      this.frustumEdges.geometry = new THREE.EdgesGeometry(newGeometry);

      // Update color if changed
      const color = new THREE.Color(this.config.color);
      (this.frustumMesh.material as THREE.MeshBasicMaterial).color = color;
      (this.frustumEdges.material as THREE.LineBasicMaterial).color = color;
      if (this.sensorMarker) {
        (this.sensorMarker.material as THREE.MeshBasicMaterial).color = color;
      }
    }

    // Update preview camera parameters if they changed
    // Guard: previewCamera may not exist during initial construction
    // (BaseSensor constructor calls updatePose -> updateVisualization before we initialize it)
    if (this.previewCamera) {
      // Use the vertical FOV directly for the camera
      // Note: Three.js PerspectiveCamera uses vertical FOV, and the horizontal FOV
      // is automatically calculated from aspect ratio
      // If user wants to match both H-FOV and V-FOV exactly, they need to ensure
      // aspect ratio matches: aspect = tan(hFov/2) / tan(vFov/2)
      this.previewCamera.fov = this.config.vFov;
      this.previewCamera.aspect = this.config.resolutionH / this.config.resolutionV;
      this.previewCamera.near = this.config.minRange;
      this.previewCamera.far = this.config.maxRange;
      this.previewCamera.updateProjectionMatrix();
    }

    // Update render target size if resolution changed
    // Guard: renderTarget may not exist during initial construction
    if (this.renderTarget) {
      const previewWidth = Math.max(1, Math.floor(this.config.resolutionH * CameraSensor.PREVIEW_SCALE));
      const previewHeight = Math.max(1, Math.floor(this.config.resolutionV * CameraSensor.PREVIEW_SCALE));
      if (this.renderTarget.width !== previewWidth || this.renderTarget.height !== previewHeight) {
        this.renderTarget.setSize(previewWidth, previewHeight);
      }
    }
  }

  /**
   * Render the scene from this camera's perspective.
   * @param renderer The WebGL renderer to use
   * @returns The rendered texture
   */
  renderPreview(renderer: THREE.WebGLRenderer): THREE.Texture {
    const threeScene = this.scene.getThreeScene();

    // Store current render target
    const currentTarget = renderer.getRenderTarget();

    // Render to our target
    renderer.setRenderTarget(this.renderTarget);
    renderer.render(threeScene, this.previewCamera);

    // Restore original render target
    renderer.setRenderTarget(currentTarget);

    return this.renderTarget.texture;
  }

  /**
   * Get the render target for direct access (e.g., for reading pixels).
   */
  getRenderTarget(): THREE.WebGLRenderTarget {
    return this.renderTarget;
  }

  /**
   * Get the preview camera for debugging or external access.
   */
  getPreviewCamera(): THREE.PerspectiveCamera {
    return this.previewCamera;
  }

  /**
   * Set whether the preview camera should see sensor visualizations.
   * When false, the preview shows only the scene without frustums/markers.
   * @param visible Whether sensor visualizations should be visible in preview
   */
  setPreviewShowsSensorVis(visible: boolean): void {
    if (visible) {
      this.previewCamera.layers.enable(SENSOR_VIS_LAYER);
    } else {
      this.previewCamera.layers.disable(SENSOR_VIS_LAYER);
    }
  }

  /**
   * Check if the preview camera currently shows sensor visualizations.
   */
  getPreviewShowsSensorVis(): boolean {
    return this.previewCamera.layers.isEnabled(SENSOR_VIS_LAYER);
  }

  /**
   * Dispose of all resources.
   */
  dispose(): void {
    // Dispose frustum-specific resources
    if (this.frustumMesh) {
      this.frustumMesh.geometry.dispose();
      (this.frustumMesh.material as THREE.Material).dispose();
    }
    if (this.frustumEdges) {
      this.frustumEdges.geometry.dispose();
      (this.frustumEdges.material as THREE.Material).dispose();
    }
    if (this.sensorMarker) {
      this.sensorMarker.geometry.dispose();
      (this.sensorMarker.material as THREE.Material).dispose();
    }

    // Dispose render target
    this.renderTarget.dispose();

    // Call parent dispose
    super.dispose();
  }
}
