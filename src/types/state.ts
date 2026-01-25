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
 */
export type ScenarioType = 'household' | 'city' | 'warehouse';

/**
 * Application settings.
 */
export interface AppSettings {
  coordinateSystem: CoordinateSystem;
  pointSize: number;
  maxPoints: number;
  updateRateMs: number;
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
 * Default application settings.
 */
export const DEFAULT_SETTINGS: AppSettings = {
  coordinateSystem: 'ros',
  pointSize: 3,
  maxPoints: 50000,
  updateRateMs: 50,
};

/**
 * Default application state.
 */
export const DEFAULT_STATE: AppState = {
  sensors: [],
  selectedSensorId: null,
  scenario: 'household',
  settings: DEFAULT_SETTINGS,
};
