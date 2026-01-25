import './styles/main.css';
import { App } from './App';

// Global app instance
let app: App | null = null;

/**
 * Initialize the application.
 */
function init(): void {
  console.log('Initializing Sensor Preview Tool...');

  try {
    app = new App();
    app.init();

    // Export app to window for debugging
    window.app = app;

    console.log('Sensor Preview Tool initialized');
    console.log('');
    console.log('=== Console Commands ===');
    console.log('  app.addSensor("camera")           - Add a camera sensor');
    console.log('  app.addSensor("lidar")            - Add a LIDAR sensor');
    console.log('  app.addSensor("camera", "preset") - Add a camera with preset');
    console.log('  app.removeSensor(id)              - Remove a sensor by ID');
    console.log('  app.selectSensor(id)              - Select a sensor by ID');
    console.log('  app.exportConfig()                - Export configuration to file');
    console.log('  app.getState()                    - View current state');
    console.log('');
    console.log('Use the UI panel on the left to add and configure sensors.');
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
}

// Export app instance for debugging in console
declare global {
  interface Window {
    app: App | null;
  }
}

// Initial value (will be updated in init())
window.app = null;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
