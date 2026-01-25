import './styles/main.css';
import { Scene } from './core/Scene';
import { ScenarioManager } from './scenarios/ScenarioManager';
import { SensorManager } from './sensors/SensorManager';
import { PreviewPanel } from './ui/PreviewPanel';
import { UIManager } from './ui/UIManager';
import { CameraSensor } from './sensors/CameraSensor';
import type { Vector3, EulerAngles } from './types/sensors';

// Global instances
let scene: Scene | null = null;
let scenarioManager: ScenarioManager | null = null;
let sensorManager: SensorManager | null = null;
let previewPanel: PreviewPanel | null = null;
let uiManager: UIManager | null = null;

// Animation state for pose update testing
let animationEnabled = false;
let animationStartTime = 0;

/**
 * Animate a sensor in a circular path to demonstrate pose updates.
 * Called each frame when animation is enabled.
 * @param time Current time in seconds
 */
function animateSensor(time: number): void {
  if (!sensorManager || !animationEnabled) return;

  const elapsed = time - animationStartTime;
  const radius = 3;
  const height = 1.5;
  const angularSpeed = 0.5;

  const angle = elapsed * angularSpeed;
  const position: Vector3 = {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    z: height,
  };

  const yawDegrees = (angle * 180) / Math.PI + 180;
  const rotation: EulerAngles = {
    roll: 0,
    pitch: 0,
    yaw: yawDegrees,
  };

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
    if (!sensorManager.hasSensor('animated-camera')) {
      sensorManager.createSensor({
        id: 'animated-camera',
        name: 'Animated Camera',
        type: 'camera',
        enabled: true,
        position: { x: 3, y: 0, z: 1.5 },
        rotation: { roll: 0, pitch: 0, yaw: 180 },
        color: '#ff00ff',
        hFov: 60,
        vFov: 40,
        resolutionH: 1280,
        resolutionV: 720,
        minRange: 0.1,
        maxRange: 8,
      });

      // Refresh UI
      if (uiManager) {
        uiManager.refreshSensorList();
      }
    }

    animationStartTime = performance.now() / 1000;
    console.log('Animation started - watch the magenta camera orbit the scene');
  } else {
    console.log('Animation stopped');
  }
}

/**
 * Update the preview panel each frame.
 */
function updatePreview(): void {
  if (previewPanel) {
    previewPanel.update();
  }
}

/**
 * Select a sensor by ID (for console debugging).
 */
function selectSensor(sensorId: string | null): void {
  if (uiManager) {
    uiManager.selectSensor(sensorId);
  }
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

  // Create preview panel
  previewPanel = new PreviewPanel(scene.getRenderer());

  // Create UI manager
  uiManager = new UIManager(sensorManager, previewPanel, scene);
  uiManager.init();

  // Register animation callback with renderer
  scene.getRenderManager().onBeforeRender(animateSensor);

  // Register preview update callback
  scene.getRenderManager().onBeforeRender(updatePreview);

  // Update window references after init
  window.scene = scene;
  window.scenarioManager = scenarioManager;
  window.sensorManager = sensorManager;
  window.previewPanel = previewPanel;
  window.uiManager = uiManager;

  // Expose test functions for console testing
  window.toggleAnimation = toggleAnimation;
  window.selectSensor = selectSensor;

  console.log('Sensor Preview Tool initialized');
  console.log('');
  console.log('=== Console Commands ===');
  console.log('  toggleAnimation()     - Start/stop animated camera orbiting the scene');
  console.log('  selectSensor(id)      - Select a sensor by ID');
  console.log('  selectSensor(null)    - Deselect all sensors');
  console.log('');
  console.log('Use the UI panel on the left to add and configure sensors.');
}

// Export instances for debugging in console
declare global {
  interface Window {
    scene: Scene | null;
    scenarioManager: ScenarioManager | null;
    sensorManager: SensorManager | null;
    previewPanel: PreviewPanel | null;
    uiManager: UIManager | null;
    toggleAnimation: () => void;
    selectSensor: (sensorId: string | null) => void;
  }
}

// Initial values (will be updated in init())
window.scene = null;
window.scenarioManager = null;
window.sensorManager = null;
window.previewPanel = null;
window.uiManager = null;
window.toggleAnimation = () => console.warn('App not initialized');
window.selectSensor = () => console.warn('App not initialized');

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
