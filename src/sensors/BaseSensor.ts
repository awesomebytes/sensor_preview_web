import * as THREE from 'three';
import type { SensorConfig, Vector3, EulerAngles } from '../types/sensors';
import type { Scene } from '../core/Scene';

/**
 * Layer used for sensor visualizations (frustums, markers, etc.)
 * This allows preview cameras to optionally hide these visualizations.
 * Layer 0 is the default layer for scene objects.
 * Layer 1 is used for sensor visualizations.
 */
export const SENSOR_VIS_LAYER = 1;

/**
 * Abstract base class for all sensor types.
 * Handles common functionality like pose updates, visibility, and cleanup.
 */
export abstract class BaseSensor<T extends SensorConfig = SensorConfig> {
  protected config: T;
  protected scene: Scene;
  protected group: THREE.Group;

  constructor(config: T, scene: Scene) {
    this.config = config;
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = `sensor-${config.id}`;

    // Add to scene
    this.scene.addToWorld(this.group);

    // Set initial pose
    this.updatePose(config.position, config.rotation);

    // Set initial visibility
    this.setEnabled(config.enabled);
  }

  /**
   * Create the 3D visualization for this sensor.
   * Must be implemented by subclasses.
   */
  abstract createVisualization(): void;

  /**
   * Update the visualization when config changes.
   * Must be implemented by subclasses.
   */
  abstract updateVisualization(): void;

  /**
   * Get the current sensor configuration.
   */
  getConfig(): T {
    return this.config;
  }

  /**
   * Update sensor configuration.
   */
  updateConfig(changes: Partial<T>): void {
    this.config = { ...this.config, ...changes };

    // Update pose if position or rotation changed
    if (changes.position || changes.rotation) {
      this.updatePose(this.config.position, this.config.rotation);
    }

    // Update visibility if enabled changed
    if (changes.enabled !== undefined) {
      this.setEnabled(changes.enabled);
    }

    // Update visualization for other config changes
    this.updateVisualization();
  }

  /**
   * Update the sensor's position and rotation.
   */
  updatePose(position: Vector3, rotation: EulerAngles): void {
    // Update position
    this.group.position.set(position.x, position.y, position.z);

    // Update rotation (convert degrees to radians)
    // Order: XYZ (roll, pitch, yaw)
    this.group.rotation.set(
      THREE.MathUtils.degToRad(rotation.roll),
      THREE.MathUtils.degToRad(rotation.pitch),
      THREE.MathUtils.degToRad(rotation.yaw),
      'XYZ'
    );

    // Update config
    this.config.position = position;
    this.config.rotation = rotation;

    // Trigger visualization update
    this.updateVisualization();
  }

  /**
   * Set whether the sensor is visible/enabled.
   */
  setEnabled(enabled: boolean): void {
    this.group.visible = enabled;
    this.config.enabled = enabled;
  }

  /**
   * Get the Three.js group containing the sensor visualization.
   */
  getGroup(): THREE.Group {
    return this.group;
  }

  /**
   * Set an object to be ONLY on the sensor visualization layer.
   * This allows preview cameras to optionally hide these objects.
   * Objects are removed from layer 0 and placed only on SENSOR_VIS_LAYER.
   */
  protected setVisualizationLayer(object: THREE.Object3D): void {
    // Use set() to put ONLY on this layer (removes from layer 0)
    object.layers.set(SENSOR_VIS_LAYER);
  }

  /**
   * Dispose of all resources used by this sensor.
   */
  dispose(): void {
    // Remove from scene
    this.scene.removeFromWorld(this.group);

    // Traverse and dispose all geometries and materials
    this.group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => mat.dispose());
        } else {
          object.material.dispose();
        }
      }
      if (object instanceof THREE.Line) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => mat.dispose());
        } else {
          object.material.dispose();
        }
      }
    });

    // Clear children
    this.group.clear();
  }
}
