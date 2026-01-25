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
 * Camera presets for common webcams and RGB cameras.
 */
export const CAMERA_PRESETS: Record<string, CameraPreset> = {
  'logitech-c920': {
    type: 'camera',
    hFov: 70.42,
    vFov: 43.3,
    resolutionH: 1920,
    resolutionV: 1080,
    minRange: 0.1,
    maxRange: 50,
  },
  'realsense-d435-rgb': {
    type: 'camera',
    hFov: 69,
    vFov: 42,
    resolutionH: 1920,
    resolutionV: 1080,
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
  'raspberry-pi-cam-v2': {
    type: 'camera',
    hFov: 62.2,
    vFov: 48.8,
    resolutionH: 3280,
    resolutionV: 2464,
    minRange: 0.1,
    maxRange: 50,
  },
  'generic-webcam': {
    type: 'camera',
    hFov: 60,
    vFov: 45,
    resolutionH: 1280,
    resolutionV: 720,
    minRange: 0.1,
    maxRange: 30,
  },
};

/**
 * LIDAR presets for common spinning and solid-state LIDARs.
 */
export const LIDAR_PRESETS: Record<string, LidarPreset> = {
  'velodyne-vlp16': {
    type: 'lidar',
    hFov: 360,
    vFov: 30,
    channels: 16,
    angularResH: 0.2,
    minRange: 0.1,
    maxRange: 100,
    showSlice: true,
  },
  'velodyne-vlp32c': {
    type: 'lidar',
    hFov: 360,
    vFov: 40,
    channels: 32,
    angularResH: 0.2,
    minRange: 0.1,
    maxRange: 200,
    showSlice: true,
  },
  'ouster-os1-64': {
    type: 'lidar',
    hFov: 360,
    vFov: 45,
    channels: 64,
    angularResH: 0.35,
    minRange: 0.3,
    maxRange: 120,
    showSlice: true,
  },
  'livox-mid40': {
    type: 'lidar',
    hFov: 38.4,
    vFov: 38.4,
    channels: 1, // Non-repetitive scanning pattern
    angularResH: 0.05,
    minRange: 0.1,
    maxRange: 260,
    showSlice: true,
  },
  'rplidar-a1': {
    type: 'lidar',
    hFov: 360,
    vFov: 0.5, // Single-plane 2D LIDAR
    channels: 1,
    angularResH: 1.0,
    minRange: 0.15,
    maxRange: 12,
    showSlice: true,
  },
};

/**
 * Human-readable display names for all presets.
 */
export const PRESET_DISPLAY_NAMES: Record<string, string> = {
  // Cameras
  'logitech-c920': 'Logitech C920',
  'realsense-d435-rgb': 'Intel RealSense D435 (RGB)',
  'fisheye-180': 'Generic Fisheye 180°',
  'raspberry-pi-cam-v2': 'Raspberry Pi Camera V2',
  'generic-webcam': 'Generic Webcam',
  // LIDARs
  'velodyne-vlp16': 'Velodyne VLP-16',
  'velodyne-vlp32c': 'Velodyne VLP-32C',
  'ouster-os1-64': 'Ouster OS1-64',
  'livox-mid40': 'Livox Mid-40',
  'rplidar-a1': 'RPLidar A1 (2D)',
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
