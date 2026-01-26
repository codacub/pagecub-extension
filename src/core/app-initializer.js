// PageCub - Application Initialization

// =============================================================================
// ALLOWED SITES CONFIGURATION
// Only show the PageCub button on these domains
// Easy to expand - just add new patterns to the array
// =============================================================================
const ALLOWED_SITES = [
  // Substack - newsletter platform
  // Matches: threadcub.substack.com, *.substack.com
  { pattern: /\.substack\.com$/i, name: 'Substack subdomain' },
  // Matches: substack.com (main domain for /home/post/* URLs)
  { pattern: /^substack\.com$/i, name: 'Substack main' },

  // Medium - blogging platform
  { pattern: /^medium\.com$/i, name: 'Medium' },
  { pattern: /\.medium\.com$/i, name: 'Medium subdomain' },
];

/**
 * Check if the current page is on an allowed site
 * @returns {boolean} true if the current site is allowed
 */
function isAllowedSite() {
  const hostname = window.location.hostname.toLowerCase();

  for (const site of ALLOWED_SITES) {
    if (site.pattern.test(hostname)) {
      console.log(`PageCub: Allowed site detected - ${site.name} (${hostname})`);
      return true;
    }
  }

  console.log(`PageCub: Site not in allowed list (${hostname}) - button will not be shown`);
  return false;
}

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

  // Check if current site is in the allowed list
  if (!isAllowedSite()) {
    console.log('PageCub: Skipping initialization - site not supported');
    return;
  }

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
