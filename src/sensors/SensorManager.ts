import type { SensorConfig, CameraSensorConfig, LidarSensorConfig, Vector3, EulerAngles } from '../types/sensors';
import type { Scene } from '../core/Scene';
import { CameraSensor } from './CameraSensor';
import type { BaseSensor } from './BaseSensor';

// Type alias for sensor instances
type SensorInstance = CameraSensor; // | LidarSensor when implemented

/**
 * Manages the lifecycle of all sensors in the scene.
 * Provides factory methods, CRUD operations, and access to sensor instances.
 */
export class SensorManager {
  private scene: Scene;
  private sensors: Map<string, SensorInstance> = new Map();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Create a new sensor from configuration.
   * @param config The sensor configuration
   * @returns The created sensor instance
   */
  createSensor(config: SensorConfig): SensorInstance {
    // Check for duplicate ID
    if (this.sensors.has(config.id)) {
      throw new Error(`Sensor with ID ${config.id} already exists`);
    }

    let sensor: SensorInstance;

    switch (config.type) {
      case 'camera':
        sensor = new CameraSensor(config as CameraSensorConfig, this.scene);
        break;
      case 'lidar':
        // TODO: Implement LidarSensor in Step 11
        throw new Error('LIDAR sensor not yet implemented');
      case 'depth':
      case 'rgbd':
        // Phase 2 sensors
        throw new Error(`${config.type} sensor is not yet implemented (Phase 2)`);
      default:
        throw new Error(`Unknown sensor type: ${(config as SensorConfig).type}`);
    }

    this.sensors.set(config.id, sensor);
    console.log(`Created ${config.type} sensor: ${config.name} (${config.id})`);

    return sensor;
  }

  /**
   * Get a sensor by ID.
   * @param id The sensor ID
   * @returns The sensor instance or undefined
   */
  getSensor(id: string): SensorInstance | undefined {
    return this.sensors.get(id);
  }

  /**
   * Get all sensors.
   * @returns Array of all sensor instances
   */
  getAllSensors(): SensorInstance[] {
    return Array.from(this.sensors.values());
  }

  /**
   * Get all sensor configurations.
   * @returns Array of all sensor configurations
   */
  getAllConfigs(): SensorConfig[] {
    return this.getAllSensors().map((sensor) => sensor.getConfig());
  }

  /**
   * Update a sensor's configuration.
   * @param id The sensor ID
   * @param changes Partial configuration changes
   */
  updateSensor(id: string, changes: Partial<SensorConfig>): void {
    const sensor = this.sensors.get(id);
    if (!sensor) {
      console.warn(`Sensor with ID ${id} not found`);
      return;
    }

    // Type assertion is safe here because we only update properties
    // that exist on the sensor's actual config type
    sensor.updateConfig(changes as Parameters<typeof sensor.updateConfig>[0]);
  }

  /**
   * Update a sensor's pose (position and rotation).
   * @param id The sensor ID
   * @param position New position
   * @param rotation New rotation
   */
  updateSensorPose(id: string, position: Vector3, rotation: EulerAngles): void {
    const sensor = this.sensors.get(id);
    if (!sensor) {
      console.warn(`Sensor with ID ${id} not found`);
      return;
    }

    sensor.updatePose(position, rotation);
  }

  /**
   * Set a sensor's enabled state.
   * @param id The sensor ID
   * @param enabled Whether the sensor should be visible
   */
  setSensorEnabled(id: string, enabled: boolean): void {
    const sensor = this.sensors.get(id);
    if (!sensor) {
      console.warn(`Sensor with ID ${id} not found`);
      return;
    }

    sensor.setEnabled(enabled);
  }

  /**
   * Remove a sensor from the scene.
   * @param id The sensor ID
   */
  removeSensor(id: string): void {
    const sensor = this.sensors.get(id);
    if (!sensor) {
      console.warn(`Sensor with ID ${id} not found`);
      return;
    }

    sensor.dispose();
    this.sensors.delete(id);
    console.log(`Removed sensor: ${id}`);
  }

  /**
   * Remove all sensors from the scene.
   */
  removeAllSensors(): void {
    for (const sensor of this.sensors.values()) {
      sensor.dispose();
    }
    this.sensors.clear();
    console.log('Removed all sensors');
  }

  /**
   * Get the number of sensors.
   */
  getSensorCount(): number {
    return this.sensors.size;
  }

  /**
   * Check if a sensor exists.
   * @param id The sensor ID
   */
  hasSensor(id: string): boolean {
    return this.sensors.has(id);
  }

  /**
   * Dispose of all resources.
   */
  dispose(): void {
    this.removeAllSensors();
  }
}
