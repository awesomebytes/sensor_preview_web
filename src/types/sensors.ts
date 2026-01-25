// Sensor type definitions
// Full implementation in Step 4, minimal types for compilation

/**
 * 3D vector for positions.
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Euler angles for rotations.
 */
export interface EulerAngles {
  roll: number;   // degrees, rotation around X
  pitch: number;  // degrees, rotation around Y
  yaw: number;    // degrees, rotation around Z
}

/**
 * Available sensor types.
 */
export type SensorType = 'camera' | 'lidar' | 'depth' | 'rgbd';

/**
 * Base sensor configuration shared by all sensor types.
 */
export interface SensorBase {
  id: string;           // UUID
  name: string;         // User-defined, e.g., "Front Camera"
  type: SensorType;
  enabled: boolean;
  position: Vector3;    // meters, in current coordinate frame
  rotation: EulerAngles;
  color: string;        // Hex color for visualization
}

/**
 * Camera sensor configuration.
 */
export interface CameraSensorConfig extends SensorBase {
  type: 'camera';
  hFov: number;         // Horizontal FOV in degrees
  vFov: number;         // Vertical FOV in degrees
  resolutionH: number;  // Pixels
  resolutionV: number;  // Pixels
  minRange: number;     // meters
  maxRange: number;     // meters
}

/**
 * LIDAR sensor configuration.
 */
export interface LidarSensorConfig extends SensorBase {
  type: 'lidar';
  hFov: number;         // Horizontal FOV (360 for spinning)
  vFov: number;         // Vertical FOV
  channels: number;     // Vertical laser count (16, 32, 64, etc.)
  angularResH: number;  // Horizontal resolution in degrees
  minRange: number;     // meters
  maxRange: number;     // meters
}

/**
 * Depth sensor configuration (Phase 2).
 */
export interface DepthSensorConfig extends SensorBase {
  type: 'depth';
  hFov: number;
  vFov: number;
  resolutionH: number;
  resolutionV: number;
  minRange: number;
  maxRange: number;
}

/**
 * RGBD sensor configuration (Phase 2).
 */
export interface RgbdSensorConfig extends SensorBase {
  type: 'rgbd';
  hFov: number;
  vFov: number;
  resolutionH: number;
  resolutionV: number;
  minRange: number;
  maxRange: number;
}

/**
 * Union type of all sensor configurations.
 */
export type SensorConfig =
  | CameraSensorConfig
  | LidarSensorConfig
  | DepthSensorConfig
  | RgbdSensorConfig;
