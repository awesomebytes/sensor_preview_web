import './styles/main.css';
import { Scene } from './core/Scene';
import { ScenarioManager } from './scenarios/ScenarioManager';

// Global instances
let scene: Scene | null = null;
let scenarioManager: ScenarioManager | null = null;

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
  }
}
window.scene = scene;
window.scenarioManager = scenarioManager;
