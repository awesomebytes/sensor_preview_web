// App state types
// Full implementation in Step 4, basic types needed for Step 2

import type { SensorConfig } from './sensors';

/**
 * Coordinate system convention.
 * - 'ros': X-forward, Y-left, Z-up (ROS/REP 103)
 * - 'threejs': X-right, Y-up, Z-out (Three.js default)
 */
export type CoordinateSystem = 'ros' | 'threejs';

/**
 * Available scenario types.
 * - household-small: 10m × 10m room with furniture
 * - household-large: 20m × 20m room with furniture (good for testing LIDAR ranges)
 * - city: ~500m of streets with buildings, trees, and vehicles
 * - highway: ~1km stretch with curve, barriers, signs, and vehicles
 */
export type ScenarioType = 'household-small' | 'household-large' | 'city' | 'highway';

/**
 * Projection settings for sensor visualizations.
 */
export interface ProjectionSettings {
  /** Size of the RGB axes at each sensor origin (in meters) */
  axesSize: number;
  /** Size of the sensor name labels (scale factor, 1.0 = default) */
  labelSize: number;
  /** Default camera frustum length (in meters) - used when sensor has no override */
  defaultFrustumSize: number;
  /** LIDAR point cloud point size (in meters) */
  lidarPointSize: number;
  /** Background color (hex) */
  backgroundColor: string;
  /** Floor color (hex) */
  floorColor: string;
  /** Show distance markers on floor */
  showDistanceMarkers: boolean;
}

/**
 * Application settings.
 */
export interface AppSettings {
  coordinateSystem: CoordinateSystem;
  pointSize: number;
  maxPoints: number;
  updateRateMs: number;
  /** Projection settings for sensor visualizations */
  projection: ProjectionSettings;
}

/**
 * Full application state.
 */
export interface AppState {
  sensors: SensorConfig[];
  selectedSensorId: string | null;
  scenario: ScenarioType;
  settings: AppSettings;
}

/**
 * Default projection settings.
 */
export const DEFAULT_PROJECTION_SETTINGS: ProjectionSettings = {
  axesSize: 0.3,
  labelSize: 1.0,
  defaultFrustumSize: 10,
  lidarPointSize: 0.05,
  backgroundColor: '#f0f5fa',  // Very light blue, almost white
  floorColor: '#c8d6e5',       // Slightly darker blue-gray for floor
  showDistanceMarkers: true,
};

/**
 * Default application settings.
 */
export const DEFAULT_SETTINGS: AppSettings = {
  coordinateSystem: 'ros',
  pointSize: 3,
  maxPoints: 50000,
  updateRateMs: 50,
  projection: { ...DEFAULT_PROJECTION_SETTINGS },
};

/**
 * Default application state.
 */
export const DEFAULT_STATE: AppState = {
  sensors: [],
  selectedSensorId: null,
  scenario: 'household-large',
  settings: DEFAULT_SETTINGS,
};
