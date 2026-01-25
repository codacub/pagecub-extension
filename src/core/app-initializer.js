// PageCub - Application Initialization

// Main initialization when DOM is ready
function initializePageCub() {
  console.log('PageCub: Initializing...');

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startPageCub);
  } else {
    startPageCub();
  }
}

function startPageCub() {
  console.log('PageCub: Starting application...');

  try {
    // Initialize floating button
    initializeFloatingButton();

    // Initialize tagging system if available
    initializeTagging();

    console.log('PageCub ready!');
  } catch (error) {
    console.error('PageCub initialization failed:', error);
  }
}

function initializeFloatingButton() {
  // Try PageCubFloatingButton first, then fall back to ThreadCubFloatingButton for compatibility
  const ButtonClass = window.PageCubFloatingButton || window.ThreadCubFloatingButton;

  if (typeof ButtonClass !== 'undefined') {
    console.log('PageCub: Initializing floating button...');

    try {
      window.pagecubButton = new ButtonClass();
      // Legacy alias for compatibility
      window.threadcubButton = window.pagecubButton;

      console.log('PageCub: Floating button created');

      // Final verification
      setTimeout(() => {
        const buttonElement = document.querySelector('#threadcub-edge-btn');
        if (buttonElement) {
          console.log('PageCub: Floating button is visible');
        } else {
          console.error('PageCub: Button not found in DOM');
        }
      }, 1000);

    } catch (error) {
      console.error('PageCub: Error creating floating button:', error);
    }
  } else {
    console.error('PageCub: FloatingButton class not found');

    // Retry after a short delay
    setTimeout(() => {
      const RetryButtonClass = window.PageCubFloatingButton || window.ThreadCubFloatingButton;
      if (typeof RetryButtonClass !== 'undefined') {
        console.log('PageCub: Retrying initialization...');
        initializeFloatingButton();
      }
    }, 1000);
  }
}

function initializeTagging() {
  if (typeof window.ThreadCubTagging !== 'undefined' && window.pagecubButton) {
    console.log('PageCub: Initializing tagging system...');
    try {
      window.threadcubTagging = new window.ThreadCubTagging(window.pagecubButton);
      console.log('PageCub: Tagging system initialized');
    } catch (error) {
      console.error('PageCub: Error initializing tagging:', error);
    }
  }
}

// Start the application immediately
console.log('PageCub: Starting initialization...');
initializePageCub();

// Export app initializer to window for global access
window.AppInitializer = {
  initializePageCub,
  startPageCub,
  // Legacy aliases
  initializeThreadCub: initializePageCub,
  startThreadCub: startPageCub
};

console.log('PageCub: App initializer loaded');
