import './styles/main.css';
import { Scene } from './core/Scene';

// Global scene instance
let scene: Scene | null = null;

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

  console.log('Sensor Preview Tool initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export scene for debugging in console
declare global {
  interface Window {
    scene: Scene | null;
  }
}
window.scene = scene;
