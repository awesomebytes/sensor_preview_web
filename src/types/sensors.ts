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
 * Lens distortion model type.
 * - 'brown-conrady': Standard polynomial model, good for FOV < 140°
 * - 'fisheye-equidistant': r = f*θ, good for wide-angle/fisheye lenses
 */
export type DistortionModel = 'brown-conrady' | 'fisheye-equidistant';

/**
 * Camera lens distortion parameters.
 * Uses the Brown-Conrady model (also known as plumb bob model).
 * 
 * For standard lenses (FOV < 140°):
 *   x' = x * (1 + k1*r² + k2*r⁴ + k3*r⁶)
 *   y' = y * (1 + k1*r² + k2*r⁴ + k3*r⁶)
 *   + tangential distortion (p1, p2)
 * 
 * For fisheye lenses (FOV >= 140°):
 *   Uses equidistant projection: r = f * θ
 */
export interface CameraDistortion {
  /** Distortion model to use */
  model: DistortionModel;
  
  /** Primary radial distortion coefficient. 
   *  Negative = barrel distortion (wide-angle), Positive = pincushion */
  k1: number;
  
  /** Secondary radial distortion coefficient.
   *  Fine-tunes the distortion curve, typically smaller than k1 */
  k2: number;
  
  /** Tertiary radial distortion coefficient.
   *  Usually zero or very small, only needed for extreme precision */
  k3: number;
  
  /** First tangential distortion coefficient.
   *  Caused by lens/sensor misalignment. Usually very small. */
  p1: number;
  
  /** Second tangential distortion coefficient.
   *  Caused by lens/sensor misalignment. Usually very small. */
  p2: number;
}

/**
 * Principal point (optical center) of the camera.
 * Expressed as fractions of image dimensions (0.5, 0.5 = center).
 */
export interface PrincipalPoint {
  /** Horizontal position as fraction of width (0.5 = center) */
  cx: number;
  /** Vertical position as fraction of height (0.5 = center) */
  cy: number;
}

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
  presetId?: string;    // ID of the preset applied, empty/undefined for custom
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
  /** Override frustum size for this sensor (if true, use maxRange; if false, use global default) */
  overrideFrustumSize?: boolean;
  
  /** Lens distortion parameters */
  distortion: CameraDistortion;
  
  /** Principal point (optical center), defaults to image center */
  principalPoint: PrincipalPoint;
  
  /** Whether to show distorted image in preview (true) or calibrated/undistorted (false) */
  showDistortion: boolean;
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
  showSlice: boolean;   // Show single vertical scan slice at origin
  showVolume: boolean;  // Show scan volume visualization
  showPointCloud: boolean; // Show point cloud
  pointCloudColor?: string; // Point cloud color (defaults to sensor color if not set)
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
