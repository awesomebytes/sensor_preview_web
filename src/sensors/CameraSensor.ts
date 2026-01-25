import * as THREE from 'three';
import { BaseSensor } from './BaseSensor';
import type { CameraSensorConfig } from '../types/sensors';
import type { Scene } from '../core/Scene';

/**
 * Camera sensor with frustum visualization.
 * Renders a semi-transparent truncated pyramid showing the camera's field of view.
 */
export class CameraSensor extends BaseSensor<CameraSensorConfig> {
  private frustumMesh: THREE.Mesh | null = null;
  private frustumEdges: THREE.LineSegments | null = null;
  private sensorMarker: THREE.Mesh | null = null;

  constructor(config: CameraSensorConfig, scene: Scene) {
    super(config, scene);
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
    this.group.add(this.frustumMesh);

    // Add wireframe edges for better visibility
    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const edgesMaterial = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.6,
    });
    this.frustumEdges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    this.group.add(this.frustumEdges);

    // Add a small sphere at the sensor origin
    const markerGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: color });
    this.sensorMarker = new THREE.Mesh(markerGeometry, markerMaterial);
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

    // Call parent dispose
    super.dispose();
  }
}
