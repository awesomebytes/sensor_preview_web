/**
 * Built-in sensor presets for common cameras and LIDARs.
 */
import type { CameraSensorConfig, LidarSensorConfig } from '../types/sensors';

/**
 * Camera preset - all fields except id, name, enabled, position, rotation, color.
 */
export type CameraPreset = Omit<
  CameraSensorConfig,
  'id' | 'name' | 'enabled' | 'position' | 'rotation' | 'color'
>;

/**
 * LIDAR preset - all fields except id, name, enabled, position, rotation, color.
 */
export type LidarPreset = Omit<
  LidarSensorConfig,
  'id' | 'name' | 'enabled' | 'position' | 'rotation' | 'color'
>;

/**
 * Camera presets for common depth cameras, stereo cameras, and RGB cameras.
 * Specifications sourced from manufacturer datasheets.
 */
export const CAMERA_PRESETS: Record<string, CameraPreset> = {
  // Intel RealSense D435i - Depth Sensor
  // Common use: Mobile Robotics, Drones, Inventory Management
  // Active stereo IR depth with IMU for SLAM
  'realsense-d435i-depth': {
    type: 'camera',
    hFov: 87,
    vFov: 58,
    resolutionH: 1280,
    resolutionV: 720,
    minRange: 0.1,
    maxRange: 10, // Typical indoor depth range
  },
  // Intel RealSense D435i - RGB Sensor
  'realsense-d435i-rgb': {
    type: 'camera',
    hFov: 69,
    vFov: 42,
    resolutionH: 1920,
    resolutionV: 1080,
    minRange: 0.1,
    maxRange: 50,
  },
  // Stereolabs ZED 2i
  // Common use: Outdoor Robotics, Agriculture, Industrial Inspection
  // IP66 rated, stereo vision up to 20m depth
  'zed-2i': {
    type: 'camera',
    hFov: 110,
    vFov: 70,
    resolutionH: 2208,
    resolutionV: 1242,
    minRange: 0.2,
    maxRange: 20, // Stereo depth range
  },
  // Orbbec Femto Mega
  // Common use: Humanoids, Body Tracking, Logistics
  // Time-of-Flight (ToF), successor to Azure Kinect
  'orbbec-femto-mega': {
    type: 'camera',
    hFov: 120,
    vFov: 120,
    resolutionH: 1024,
    resolutionV: 1024,
    minRange: 0.25,
    maxRange: 5.5, // ToF typical range
  },
  // Luxonis OAK-D Pro (Wide)
  // Common use: AI Edge Robotics, Drones
  // On-board AI processing, active IR for darkness
  'oak-d-pro-wide': {
    type: 'camera',
    hFov: 127,
    vFov: 80,
    resolutionH: 1280,
    resolutionV: 800,
    minRange: 0.2,
    maxRange: 15, // Stereo depth range
  },
  // Leopard Imaging LI-IMX390-GMSL2
  // Common use: Self-Driving Cars, ADAS
  // Automotive-grade HDR camera module
  'li-imx390-gmsl2': {
    type: 'camera',
    hFov: 120,
    vFov: 65,
    resolutionH: 1937,
    resolutionV: 1217,
    minRange: 0.5,
    maxRange: 150, // Automotive long range
  },
  // DJI Zenmuse H20 - Wide Camera
  // Common use: Industrial Drones (Search & Rescue, Inspection)
  // Hybrid payload with zoom, wide camera, and laser rangefinder
  'zenmuse-h20-wide': {
    type: 'camera',
    hFov: 66,
    vFov: 50,
    resolutionH: 4056,
    resolutionV: 3040,
    minRange: 1,
    maxRange: 200, // Aerial observation range
  },
  // Legacy presets kept for compatibility
  'logitech-c920': {
    type: 'camera',
    hFov: 70.42,
    vFov: 43.3,
    resolutionH: 1920,
    resolutionV: 1080,
    minRange: 0.1,
    maxRange: 50,
  },
  'raspberry-pi-cam-v2': {
    type: 'camera',
    hFov: 62.2,
    vFov: 48.8,
    resolutionH: 3280,
    resolutionV: 2464,
    minRange: 0.1,
    maxRange: 50,
  },
  'fisheye-180': {
    type: 'camera',
    hFov: 180,
    vFov: 180,
    resolutionH: 1280,
    resolutionV: 720,
    minRange: 0.1,
    maxRange: 30,
  },
};

/**
 * LIDAR presets for common spinning and solid-state LIDARs.
 * Specifications sourced from manufacturer datasheets.
 */
export const LIDAR_PRESETS: Record<string, LidarPreset> = {
  // Velodyne Puck (VLP-16)
  // 16-channel 360° spinning lidar, industry standard for mobile robotics
  'velodyne-vlp16': {
    type: 'lidar',
    hFov: 360,
    vFov: 30, // +15° to -15°
    channels: 16,
    angularResH: 0.2, // 0.1° to 0.4° configurable
    minRange: 0.9,
    maxRange: 100,
    showSlice: true,
    showVolume: true,
    showPointCloud: true,
  },
  // Ouster OS1 (Rev 7) - 64 channel variant
  // High-resolution digital lidar with built-in IMU
  'ouster-os1-64': {
    type: 'lidar',
    hFov: 360,
    vFov: 45, // ±22.5°
    channels: 64,
    angularResH: 0.35,
    minRange: 0,
    maxRange: 90, // @10% reflectivity
    showSlice: true,
    showVolume: true,
    showPointCloud: true,
  },
  // Ouster OS1 (Rev 7) - 128 channel variant
  'ouster-os1-128': {
    type: 'lidar',
    hFov: 360,
    vFov: 45, // ±22.5°
    channels: 128,
    angularResH: 0.18,
    minRange: 0,
    maxRange: 90, // @10% reflectivity
    showSlice: true,
    showVolume: true,
    showPointCloud: true,
  },
  // Hesai PandarXT-32
  // 32-channel medium-range lidar for robotics and mapping
  'hesai-pandarxt-32': {
    type: 'lidar',
    hFov: 360,
    vFov: 31,
    channels: 32,
    angularResH: 0.18,
    minRange: 0.05,
    maxRange: 120,
    showSlice: true,
    showVolume: true,
    showPointCloud: true,
  },
  // RoboSense RS-Bpearl
  // Hemispherical FOV, ideal for blind spot detection
  'robosense-rs-bpearl': {
    type: 'lidar',
    hFov: 360,
    vFov: 90, // Hemispherical
    channels: 32,
    angularResH: 0.2, // 0.2° to 0.4°
    minRange: 0.1,
    maxRange: 30, // @10% reflectivity
    showSlice: true,
    showVolume: true,
    showPointCloud: true,
  },
  // Livox Mid-360
  // Non-repetitive scanning pattern, 360° horizontal coverage
  'livox-mid-360': {
    type: 'lidar',
    hFov: 360,
    vFov: 59, // -7° to ~52°
    channels: 1, // Non-repetitive scanning pattern
    angularResH: 0.2, // Effective, non-repetitive scan
    minRange: 0.1,
    maxRange: 40, // @10% reflectivity
    showSlice: true,
    showVolume: true,
    showPointCloud: true,
  },
  // SICK TiM781
  // Industrial 2D safety lidar, 270° scanning
  'sick-tim781': {
    type: 'lidar',
    hFov: 270,
    vFov: 0.5, // 2D single-plane
    channels: 1,
    angularResH: 0.33,
    minRange: 0.05,
    maxRange: 25,
    showSlice: true,
    showVolume: true,
    showPointCloud: true,
  },
  // Hokuyo URG-04LX
  // Compact 2D lidar for indoor robots
  'hokuyo-urg-04lx': {
    type: 'lidar',
    hFov: 240,
    vFov: 0.5, // 2D single-plane
    channels: 1,
    angularResH: 0.36,
    minRange: 0.02,
    maxRange: 5.6,
    showSlice: true,
    showVolume: true,
    showPointCloud: true,
  },
  // RPLIDAR A3
  // Budget-friendly 360° 2D lidar
  'rplidar-a3': {
    type: 'lidar',
    hFov: 360,
    vFov: 0.5, // 2D single-plane
    channels: 1,
    angularResH: 0.225,
    minRange: 0.15,
    maxRange: 25,
    showSlice: true,
    showVolume: true,
    showPointCloud: true,
  },
};

/**
 * Human-readable display names for all presets.
 */
export const PRESET_DISPLAY_NAMES: Record<string, string> = {
  // Depth Cameras
  'realsense-d435i-depth': 'Intel RealSense D435i (Depth)',
  'realsense-d435i-rgb': 'Intel RealSense D435i (RGB)',
  'zed-2i': 'Stereolabs ZED 2i',
  'orbbec-femto-mega': 'Orbbec Femto Mega',
  'oak-d-pro-wide': 'Luxonis OAK-D Pro (Wide)',
  // Automotive Cameras
  'li-imx390-gmsl2': 'Leopard LI-IMX390-GMSL2',
  // Drone Cameras
  'zenmuse-h20-wide': 'DJI Zenmuse H20 (Wide)',
  // Legacy Cameras
  'logitech-c920': 'Logitech C920',
  'raspberry-pi-cam-v2': 'Raspberry Pi Camera V2',
  'fisheye-180': 'Generic Fisheye 180°',
  // 3D LIDARs
  'velodyne-vlp16': 'Velodyne Puck (VLP-16)',
  'ouster-os1-64': 'Ouster OS1-64',
  'ouster-os1-128': 'Ouster OS1-128',
  'hesai-pandarxt-32': 'Hesai PandarXT-32',
  'robosense-rs-bpearl': 'RoboSense RS-Bpearl',
  'livox-mid-360': 'Livox Mid-360',
  // 2D LIDARs
  'sick-tim781': 'SICK TiM781 (2D)',
  'hokuyo-urg-04lx': 'Hokuyo URG-04LX (2D)',
  'rplidar-a3': 'RPLIDAR A3 (2D)',
};

/**
 * Get the display name for a preset ID.
 * @param presetId The preset identifier
 * @returns Human-readable name or the ID if not found
 */
export function getPresetDisplayName(presetId: string): string {
  return PRESET_DISPLAY_NAMES[presetId] ?? presetId;
}

/**
 * Get all camera preset IDs.
 */
export function getCameraPresetIds(): string[] {
  return Object.keys(CAMERA_PRESETS);
}

/**
 * Get all LIDAR preset IDs.
 */
export function getLidarPresetIds(): string[] {
  return Object.keys(LIDAR_PRESETS);
}

/**
 * Get a camera preset by ID.
 * @param presetId The preset identifier
 * @returns The preset or undefined if not found
 */
export function getCameraPreset(presetId: string): CameraPreset | undefined {
  return CAMERA_PRESETS[presetId];
}

/**
 * Get a LIDAR preset by ID.
 * @param presetId The preset identifier
 * @returns The preset or undefined if not found
 */
export function getLidarPreset(presetId: string): LidarPreset | undefined {
  return LIDAR_PRESETS[presetId];
}

/**
 * Default colors for new sensors (cycled through).
 */
export const SENSOR_COLORS = [
  '#00ff00', // Green
  '#ff6600', // Orange
  '#00ffff', // Cyan
  '#ff00ff', // Magenta
  '#ffff00', // Yellow
  '#ff0066', // Pink
  '#6600ff', // Purple
  '#00ff66', // Mint
];

/**
 * Get a color for a new sensor based on the current count.
 * @param sensorCount Current number of sensors
 * @returns A hex color string
 */
export function getNextSensorColor(sensorCount: number): string {
  return SENSOR_COLORS[sensorCount % SENSOR_COLORS.length];
}

/**
 * Apply a preset to a sensor config.
 * @param baseSensor The base sensor config (id, name, position, rotation, color)
 * @param type The sensor type
 * @param presetId The preset identifier
 * @returns Complete sensor config with preset values applied
 */
export function applyPreset(
  baseSensor: import('../types/sensors').SensorConfig,
  type: import('../types/sensors').SensorType,
  presetId: string
): import('../types/sensors').SensorConfig {
  if (type === 'camera') {
    const preset = getCameraPreset(presetId);
    if (!preset) {
      console.warn(`Camera preset not found: ${presetId}`);
      return baseSensor;
    }
    return {
      ...baseSensor,
      ...preset,
    } as import('../types/sensors').CameraSensorConfig;
  } else if (type === 'lidar') {
    const preset = getLidarPreset(presetId);
    if (!preset) {
      console.warn(`LIDAR preset not found: ${presetId}`);
      return baseSensor;
    }
    return {
      ...baseSensor,
      ...preset,
    } as import('../types/sensors').LidarSensorConfig;
  }
  return baseSensor;
}
