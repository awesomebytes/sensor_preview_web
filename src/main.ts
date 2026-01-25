import './styles/main.css';
import { Scene } from './core/Scene';
import { ScenarioManager } from './scenarios/ScenarioManager';
import { SensorManager } from './sensors/SensorManager';
import type { CameraSensorConfig } from './types/sensors';

// Global instances
let scene: Scene | null = null;
let scenarioManager: ScenarioManager | null = null;
let sensorManager: SensorManager | null = null;

function init(): void {
  console.log('Initializing Sensor Preview Tool...');

  const viewport = document.getElementById('viewport');
  if (!viewport) {
    console.error('Viewport element not found');
    return;
  }

  // Create and initialize the 3D scene
  scene = new Scene();
  scene.init(viewport);

  // Create scenario manager and load default scenario
  scenarioManager = new ScenarioManager(
    (obj) => scene!.addToWorld(obj),
    (obj) => scene!.removeFromWorld(obj)
  );
  scenarioManager.loadScenario('household');

  // Create sensor manager
  sensorManager = new SensorManager(scene);

  // Add test cameras (wrapped in try-catch to isolate sensor issues)
  try {
    // Add a test camera sensor (Step 5 verification)
    const testCameraConfig: CameraSensorConfig = {
      id: 'test-camera-1',
      name: 'Test Camera',
      type: 'camera',
      enabled: true,
      position: { x: 0, y: 2, z: 1.5 },  // 2m back on Y, 1.5m up on Z
      rotation: { roll: 0, pitch: 0, yaw: 0 },  // Pointing along +X (forward)
      color: '#00ff00',  // Green
      hFov: 70,
      vFov: 43,
      resolutionH: 1920,
      resolutionV: 1080,
      minRange: 0.1,
      maxRange: 10,
    };

    const testCamera = sensorManager.createSensor(testCameraConfig);
    console.log('Test camera created:', testCamera.getConfig());

    // Add a second camera to demonstrate multiple sensors
    const testCamera2Config: CameraSensorConfig = {
      id: 'test-camera-2',
      name: 'Side Camera',
      type: 'camera',
      enabled: true,
      position: { x: -2, y: -2, z: 1.2 },  // Corner position
      rotation: { roll: 0, pitch: 0, yaw: 45 },  // Rotated 45 degrees
      color: '#ff6600',  // Orange
      hFov: 90,
      vFov: 60,
      resolutionH: 1280,
      resolutionV: 720,
      minRange: 0.1,
      maxRange: 8,
    };

    sensorManager.createSensor(testCamera2Config);
    console.log('Second test camera created');
    console.log(`Total sensors: ${sensorManager.getSensorCount()}`);
  } catch (error) {
    console.error('Error creating sensors:', error);
  }

  // Update window references after init
  window.scene = scene;
  window.scenarioManager = scenarioManager;
  window.sensorManager = sensorManager;

  console.log('Sensor Preview Tool initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export instances for debugging in console
declare global {
  interface Window {
    scene: Scene | null;
    scenarioManager: ScenarioManager | null;
    sensorManager: SensorManager | null;
  }
}
// Initial values (will be updated in init())
window.scene = null;
window.scenarioManager = null;
window.sensorManager = null;
