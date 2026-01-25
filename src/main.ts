import './styles/main.css';

function init(): void {
  console.log('App initialized');
  
  const viewport = document.getElementById('viewport');
  if (!viewport) {
    console.error('Viewport element not found');
    return;
  }
  
  console.log('Viewport element found:', viewport);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
