// ============================================================================
// PageCub Content Script - Modular Architecture Entry Point
// ============================================================================
//
// This file serves as the minimal entry point for the PageCub extension.
// All functionality has been extracted into dedicated modules for better
// organization, maintainability, and testability.
//
// MODULE ARCHITECTURE:
//
// UTILITIES & SERVICES:
//   - src/utils/utilities.js              Helper functions (filename generation)
//   - src/utils/design-tokens.js          Design system constants
//   - src/services/storage-service.js     Chrome storage operations
//
// CORE FUNCTIONALITY:
//   - src/core/page-extractor.js          Page content extraction
//   - src/core/floating-button.js         Floating button UI component
//   - src/core/app-initializer.js         Application initialization
//
// UI COMPONENTS:
//   - src/ui/ui-components.js             Toast notifications and alerts
//   - src/ui/side-panel.js                Side panel UI
//
// FEATURE MODULES:
//   - src/features/tagging-system.js      Page tagging and highlighting
//   - src/features/download-manager.js    Download and export functionality
//
// ============================================================================
//
// INITIALIZATION:
// The application is automatically initialized by app-initializer.js which
// is loaded before this file in manifest.json. This file exists primarily
// as a placeholder and documentation of the modular architecture.
//
// All modules expose their functionality via window.* objects:
//   - window.Utilities
//   - window.StorageService
//   - window.PageExtractor
//   - window.UIComponents
//   - window.PageCubFloatingButton / window.ThreadCubFloatingButton
//   - window.ThreadCubTagging
//   - window.DownloadManager
//   - window.AppInitializer
//
// ============================================================================

console.log('PageCub: Content script loaded - All functionality in modules');
console.log('PageCub: Modular architecture active');

// Optional: Additional logging for debugging module loading
if (typeof window.AppInitializer !== 'undefined') {
  console.log('PageCub: All modules loaded successfully');
} else {
  console.error('PageCub: Module loading may be incomplete');
}
