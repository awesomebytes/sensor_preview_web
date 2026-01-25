import './styles/main.css';
import { Scene } from './core/Scene';
import { ScenarioManager } from './scenarios/ScenarioManager';
import { SensorManager } from './sensors/SensorManager';
import type { CameraSensorConfig, Vector3, EulerAngles } from './types/sensors';

// Global instances
let scene: Scene | null = null;
let scenarioManager: ScenarioManager | null = null;
let sensorManager: SensorManager | null = null;

// Animation state for pose update testing (Step 6)
let animationEnabled = false;
let animationStartTime = 0;

/**
 * Animate a sensor in a circular path to demonstrate pose updates.
 * Called each frame when animation is enabled.
 * @param time Current time in seconds
 */
function animateSensor(time: number): void {
  if (!sensorManager || !animationEnabled) return;

  const elapsed = time - animationStartTime; // Both in seconds now
  const radius = 3;
  const height = 1.5;
  const angularSpeed = 0.5; // radians per second

  // Circular path around the scene
  const angle = elapsed * angularSpeed;
  const position: Vector3 = {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    z: height,
  };

  // Rotation to always face the center
  const yawDegrees = (angle * 180 / Math.PI) + 180; // Face inward
  const rotation: EulerAngles = {
    roll: 0,
    pitch: 0,
    yaw: yawDegrees,
  };

  // Update the animated camera's pose
  sensorManager.updateSensorPose('animated-camera', position, rotation);
}

/**
 * Toggle the animation on/off.
 */
function toggleAnimation(): void {
  if (!sensorManager) {
    console.warn('SensorManager not initialized');
    return;
  }

  animationEnabled = !animationEnabled;

  if (animationEnabled) {
    // Create the animated camera if it doesn't exist
    if (!sensorManager.hasSensor('animated-camera')) {
      const animatedCameraConfig: CameraSensorConfig = {
        id: 'animated-camera',
        name: 'Animated Camera',
        type: 'camera',
        enabled: true,
        position: { x: 3, y: 0, z: 1.5 },
        rotation: { roll: 0, pitch: 0, yaw: 180 },
        color: '#ff00ff',  // Magenta
        hFov: 60,
        vFov: 40,
        resolutionH: 1280,
        resolutionV: 720,
        minRange: 0.1,
        maxRange: 8,
      };
      sensorManager.createSensor(animatedCameraConfig);
    }

    animationStartTime = performance.now() / 1000; // Convert to seconds
    console.log('Animation started - watch the magenta camera orbit the scene');
  } else {
    console.log('Animation stopped');
  }
}

/**
 * Test pose update programmatically.
 */
function testPoseUpdate(): void {
  if (!sensorManager) {
    console.warn('SensorManager not initialized');
    return;
  }

  const testId = 'test-camera-1';
  const sensor = sensorManager.getSensor(testId);
  if (!sensor) {
    console.warn(`Sensor ${testId} not found`);
    return;
  }

  // Get current config
  const config = sensor.getConfig();
  console.log('Before pose update:', {
    position: config.position,
    rotation: config.rotation,
  });

  // Update to a new pose
  const newPosition: Vector3 = {
    x: config.position.x + 1,
    y: config.position.y,
    z: config.position.z + 0.5,
  };
  const newRotation: EulerAngles = {
    roll: 0,
    pitch: 15,
    yaw: config.rotation.yaw + 30,
  };

  sensorManager.updateSensorPose(testId, newPosition, newRotation);

  // Verify update
  const updatedConfig = sensor.getConfig();
  console.log('After pose update:', {
    position: updatedConfig.position,
    rotation: updatedConfig.rotation,
  });
}

/**
 * Test setEnabled toggle.
 */
function testToggleEnabled(sensorId: string): void {
  if (!sensorManager) {
    console.warn('SensorManager not initialized');
    return;
  }

  const sensor = sensorManager.getSensor(sensorId);
  if (!sensor) {
    console.warn(`Sensor ${sensorId} not found`);
    return;
  }

  const currentState = sensor.getConfig().enabled;
  sensorManager.setSensorEnabled(sensorId, !currentState);
  console.log(`Sensor ${sensorId} enabled: ${!currentState}`);
}

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

  // Register animation callback with renderer (Step 6)
  scene.getRenderManager().onBeforeRender(animateSensor);

  // Update window references after init
  window.scene = scene;
  window.scenarioManager = scenarioManager;
  window.sensorManager = sensorManager;

  // Expose test functions for console testing (Step 6)
  window.toggleAnimation = toggleAnimation;
  window.testPoseUpdate = testPoseUpdate;
  window.testToggleEnabled = testToggleEnabled;

  console.log('Sensor Preview Tool initialized');
  console.log('');
  console.log('=== Step 6: Pose Update Test Commands ===');
  console.log('  toggleAnimation()         - Start/stop animated camera orbiting the scene');
  console.log('  testPoseUpdate()          - Move test-camera-1 programmatically');
  console.log('  testToggleEnabled(id)     - Toggle visibility (e.g., testToggleEnabled("test-camera-1"))');
  console.log('');
}

// Export instances for debugging in console
declare global {
  interface Window {
    scene: Scene | null;
    scenarioManager: ScenarioManager | null;
    sensorManager: SensorManager | null;
    // Step 6: Test functions for pose updates
    toggleAnimation: () => void;
    testPoseUpdate: () => void;
    testToggleEnabled: (sensorId: string) => void;
  }
}
// Initial values (will be updated in init())
window.scene = null;
window.scenarioManager = null;
window.sensorManager = null;
window.toggleAnimation = () => console.warn('App not initialized');
window.testPoseUpdate = () => console.warn('App not initialized');
window.testToggleEnabled = () => console.warn('App not initialized');

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
