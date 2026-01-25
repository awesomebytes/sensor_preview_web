import * as THREE from 'three';
import type { CoordinateSystem as CoordinateSystemType } from '../types/state';

/**
 * Manages coordinate system transformations between ROS and Three.js conventions.
 *
 * ROS Convention (default):
 * - X-axis: Forward (red)
 * - Y-axis: Left (green)
 * - Z-axis: Up (blue)
 *
 * Three.js Convention:
 * - X-axis: Right (red)
 * - Y-axis: Up (green)
 * - Z-axis: Out of screen (blue)
 *
 * The coordinate system is implemented via a root group that applies the
 * appropriate transformation. All world objects are added to this root.
 */
export class CoordinateSystem {
  private scene: THREE.Scene;
  private rosRoot: THREE.Group;
  private currentSystem: CoordinateSystemType = 'ros';

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Create the ROS root group
    this.rosRoot = new THREE.Group();
    this.rosRoot.name = 'rosRoot';

    // Apply ROS transform by default:
    // Rotate so that Z is up (Three.js Y-up -> ROS Z-up)
    // This rotates the entire world -90 degrees around X
    this.applyRosTransform();

    // Add root to scene
    this.scene.add(this.rosRoot);
  }

  /**
   * Apply the ROS coordinate transform to the root group.
   * Rotates from Three.js Y-up to ROS Z-up.
   */
  private applyRosTransform(): void {
    this.rosRoot.rotation.set(-Math.PI / 2, 0, 0);
  }

  /**
   * Apply the Three.js coordinate transform (identity).
   */
  private applyThreeJsTransform(): void {
    this.rosRoot.rotation.set(0, 0, 0);
  }

  /**
   * Set the coordinate system type.
   * @param system The coordinate system to use ('ros' or 'threejs')
   */
  setCoordinateSystem(system: CoordinateSystemType): void {
    if (this.currentSystem === system) {
      return;
    }

    this.currentSystem = system;

    if (system === 'ros') {
      this.applyRosTransform();
    } else {
      this.applyThreeJsTransform();
    }

    console.log(`Coordinate system changed to: ${system}`);
  }

  /**
   * Get the current coordinate system type.
   */
  getCoordinateSystem(): CoordinateSystemType {
    return this.currentSystem;
  }

  /**
   * Add an object to the world (through the coordinate system root).
   * Objects added this way will have the coordinate transform applied.
   */
  addToWorld(object: THREE.Object3D): void {
    this.rosRoot.add(object);
  }

  /**
   * Remove an object from the world.
   */
  removeFromWorld(object: THREE.Object3D): void {
    this.rosRoot.remove(object);
  }

  /**
   * Get all children of the world root (for raycasting, etc).
   */
  getWorldChildren(): THREE.Object3D[] {
    return this.rosRoot.children.slice();
  }

  /**
   * Get the world root group.
   */
  getWorldRoot(): THREE.Group {
    return this.rosRoot;
  }

  /**
   * Convert a position from the current coordinate system to Three.js world coordinates.
   * This accounts for the root transform.
   */
  toWorldPosition(position: THREE.Vector3): THREE.Vector3 {
    const worldPos = position.clone();
    this.rosRoot.localToWorld(worldPos);
    return worldPos;
  }

  /**
   * Convert a position from Three.js world coordinates to the current coordinate system.
   */
  fromWorldPosition(worldPosition: THREE.Vector3): THREE.Vector3 {
    const localPos = worldPosition.clone();
    this.rosRoot.worldToLocal(localPos);
    return localPos;
  }
}
