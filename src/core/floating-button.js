console.log('LOADING: floating-button.js');

// PageCub Floating Button Module
// Webpage download functionality

class PageCubFloatingButton {
  constructor() {
    this.button = null;
    this.shadowButton = null;
    this.borderOverlay = null;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.currentEdge = 'right';
    this.currentPosition = 0.5;
    this.edgeMargin = 18; // CHANGE THIS LINE from 25 to 18
    this.buttonSize = 60; // Keep buttonSize as it's used for calculations
    this.currentBearState = 'default';
    this.isExporting = false;
    this.lastExportTime = 0;

    console.log('PageCub: Starting floating button...');

    this.init();
  }

  init() {
    this.createButton();
    this.createBorderOverlay();
    // Removed addStyles() as it will be loaded via external CSS file
    this.setupEventListeners();
    this.loadPosition();

    console.log('PageCub: Floating button ready!');
  }

  createButton() {
    this.button = document.createElement('div');
    this.button.id = 'threadcub-edge-btn';

    // Try to get bear images first
    const bearImages = this.getBearImages();

    this.button.innerHTML = `
      <div class="threadcub-btn-content">
        <div class="threadcub-bear-face" id="bear-face">
          ${bearImages.default}
        </div>
      </div>
      <div class="threadcub-action-buttons">
        <div class="threadcub-markdown-btn" data-action="download-markdown">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10,9 9,9 8,9"/>
          </svg>
        </div>
        <div class="threadcub-pdf-btn" data-action="download-pdf">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <path d="M9 15h6"/>
            <path d="M12 12v6"/>
          </svg>
        </div>
        <div class="threadcub-tag-btn" data-action="tag">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m15 5 6.3 6.3a2.4 2.4 0 0 1 0 3.4L17 19"/>
            <path d="M9.586 5.586A2 2 0 0 0 8.172 5H3a1 1 0 0 0-1 1v5.172a2 2 0 0 0 .586 1.414L8.29 18.29a2.426 2.426 0 0 0 3.42 0l3.58-3.58a2.426 2.426 0 0 0 0-3.42z"/>
            <circle cx="6.5" cy="9.5" r=".5" fill="currentColor"/>
          </svg>
        </div>
        <div class="threadcub-close-btn" data-action="close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18"/>
            <path d="m6 6 12 12"/>
          </svg>
        </div>
      </div>
      <div class="threadcub-grip-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="9" cy="12" r="1"/>
          <circle cx="9" cy="5" r="1"/>
          <circle cx="9" cy="19" r="1"/>
          <circle cx="15" cy="12" r="1"/>
          <circle cx="15" cy="5" r="1"/>
          <circle cx="15" cy="19" r="1"/>
        </svg>
      </div>
    `;

    // Store the bear image URLs for later use
    this.bearImages = bearImages;

    // Set initial position (dynamic style, remains in JS)
    this.setEdgePosition('right', 0.5);

    // Add to page
    document.body.appendChild(this.button);
    console.log('🐻 ThreadCub: Button added to page');
  }

  getBearImages() {
    console.log('🐻 ThreadCub: Getting bear images with fallback handling...');

    // More robust extension context checking
    let useExtensionImages = false;

    try {
      if (typeof chrome !== 'undefined' &&
          chrome.runtime &&
          chrome.runtime.getURL &&
          chrome.runtime.id) {

        const testUrl = chrome.runtime.getURL('icons/icon-48.png');
        if (testUrl && testUrl.startsWith('chrome-extension://')) {
          useExtensionImages = true;
          console.log('🐻 ThreadCub: Extension context available, using extension images');
        }
      }
    } catch (error) {
      console.log('🐻 ThreadCub: Extension context not available:', error);
      useExtensionImages = false;
    }

    if (useExtensionImages) {
      try {
        const defaultIcon = chrome.runtime.getURL('icons/icon-48.png');
        const happyIcon = chrome.runtime.getURL('icons/icon-happy.png');
        const sadIcon = chrome.runtime.getURL('icons/icon-sad.png');
        const taggingIcon = chrome.runtime.getURL('icons/icon-happier.png');

        // Apply a class for styling and let CSS manage transition
        return {
          default: `<img src="${defaultIcon}" class="bear-img" alt="ThreadCub" onerror="console.log('🐻 Image load failed, using emoji'); this.style.display='none'; this.nextElementSibling.style.display='block';" />
                    <span class="bear-emoji">🐻</span>`,
          happy: `<img src="${happyIcon}" class="bear-img" alt="Happy ThreadCub" onerror="console.log('🐻 Happy image failed, using emoji'); this.style.display='none'; this.nextElementSibling.style.display='block';" />
                  <span class="bear-emoji">😊</span>`,
          sad: `<img src="${sadIcon}" class="bear-img" alt="Sad ThreadCub" onerror="console.log('🐻 Sad image failed, using emoji'); this.style.display='none'; this.nextElementSibling.style.display='block';" />
                <span class="bear-emoji">😢</span>`,
          tagging: `<img src="${taggingIcon}" class="bear-img" alt="Tagging ThreadCub" onerror="console.log('🐻 Tagging image failed, using emoji'); this.style.display='none'; this.nextElementSibling.style.display='block';" />
                    <span class="bear-emoji">🏷️</span>`
        };
      } catch (error) {
        console.log('🐻 ThreadCub: Error generating extension image URLs:', error);
      }
    }

    // Fallback to emojis (always works)
    console.log('🐻 ThreadCub: Using emoji fallbacks for maximum compatibility');
    return {
      default: '<span class="bear-emoji">🐻</span>',
      happy: '<span class="bear-emoji">😊</span>',
      sad: '<span class="bear-emoji">😢</span>',
      tagging: '<span class="bear-emoji">🏷️</span>'
    };
  }

  createBorderOverlay() {
    this.borderOverlay = document.createElement('div');
    this.borderOverlay.id = 'threadcub-border-overlay';
    // Opacity and transition remain in JS for dynamic control
    this.borderOverlay.style.opacity = '0';
    document.body.appendChild(this.borderOverlay);
  }

  // Removed addStyles() method as styles will be in floating-button.css

  // ===== EVENT HANDLING =====
  setupEventListeners() {
    // Mouse events
    this.button.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));

    // Touch events
    this.button.addEventListener('touchstart', this.handleTouchStart.bind(this));
    document.addEventListener('touchmove', this.handleTouchMove.bind(this));
    document.addEventListener('touchend', this.handleTouchEnd.bind(this));

    // Click events for action buttons (using event delegation on button)
    this.button.addEventListener('click', this.handleClick.bind(this));

    // Custom tooltip system
    this.setupTooltips();

    // Hover events for bear expressions
    this.setupBearExpressionListeners();

    // Window resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  setupTooltips() {
    const tooltipData = {
      'threadcub-markdown-btn': 'DOWNLOAD AS MARKDOWN',
      'threadcub-pdf-btn': 'DOWNLOAD AS PDF',
      'threadcub-tag-btn': 'MANAGE TAGS',
      'threadcub-close-btn': 'CLOSE'
    };

    Object.entries(tooltipData).forEach(([className, text]) => {
      const button = this.button.querySelector(`.${className}`);
      if (!button) return;

      let tooltip = null;
      let showTimeout = null;
      let hideTimeout = null;

      const showTooltip = (e) => {
        clearTimeout(showTimeout);
        clearTimeout(hideTimeout);

        showTimeout = setTimeout(() => {
          // Remove any existing tooltips
          document.querySelectorAll('.threadcub-tooltip').forEach(t => t.remove());

          // Create new tooltip
          tooltip = document.createElement('div');
          tooltip.className = 'threadcub-tooltip'; // Apply class
          tooltip.textContent = text;

          // Set initial styles for positioning (these remain inline for dynamic placement)
          tooltip.style.position = 'fixed';
          tooltip.style.opacity = '0';
          tooltip.style.pointerEvents = 'none';

          // Add to DOM
          document.body.appendChild(tooltip);

          // Get button position
          const buttonRect = button.getBoundingClientRect();

          // Force layout calculation by accessing offsetWidth
          const tooltipWidth = tooltip.offsetWidth;
          const tooltipHeight = tooltip.offsetHeight;

          // Simple positioning: 8px to the left, vertically centered
          const x = buttonRect.left - tooltipWidth - 8;
          const y = buttonRect.top + (buttonRect.height - tooltipHeight) / 2;

          // Apply position
          tooltip.style.left = x + 'px';
          tooltip.style.top = y + 'px';

          // Show with animation (using class for opacity/transform transition)
          requestAnimationFrame(() => {
            tooltip.classList.add('show');
          });

        }, 150);
      };

      const hideTooltip = () => {
        clearTimeout(showTimeout);
        clearTimeout(hideTimeout);

        if (tooltip) {
          tooltip.classList.remove('show'); // Remove class to hide
          hideTimeout = setTimeout(() => {
            if (tooltip && tooltip.parentNode) {
              tooltip.parentNode.removeChild(tooltip);
            }
            tooltip = null;
          }, 200);
        }
      };

      button.addEventListener('mouseenter', showTooltip);
      button.addEventListener('mouseleave', hideTooltip);
    });
  }

  setupBearExpressionListeners() {
    const markdownBtn = this.button.querySelector('.threadcub-markdown-btn');
    const pdfBtn = this.button.querySelector('.threadcub-pdf-btn');
    const tagBtn = this.button.querySelector('.threadcub-tag-btn');
    const closeBtn = this.button.querySelector('.threadcub-close-btn');

    // These listeners change the bear image, which is HTML content, not CSS
    // The images themselves have a class for CSS transitions
    if (markdownBtn) {
      markdownBtn.addEventListener('mouseenter', () => this.setBearExpression('happy'));
      markdownBtn.addEventListener('mouseleave', () => this.setBearExpression('happy'));
    }

    if (pdfBtn) {
      pdfBtn.addEventListener('mouseenter', () => this.setBearExpression('happy'));
      pdfBtn.addEventListener('mouseleave', () => this.setBearExpression('happy'));
    }

    if (tagBtn) {
      tagBtn.addEventListener('mouseenter', () => this.setBearExpression('tagging'));
      tagBtn.addEventListener('mouseleave', () => this.setBearExpression('happy'));
    }

    if (closeBtn) {
      closeBtn.addEventListener('mouseenter', () => this.setBearExpression('sad'));
      closeBtn.addEventListener('mouseleave', () => this.setBearExpression('happy'));
    }

    this.button.addEventListener('mouseenter', () => {
      if (this.currentBearState === 'default') {
        this.setBearExpression('happy');
        this.currentBearState = 'happy';
      }
    });

    this.button.addEventListener('mouseleave', () => {
      this.setBearExpression('default');
      this.currentBearState = 'default';
    });
  }

  setBearExpression(state) {
    const bearFace = this.button.querySelector('.threadcub-bear-face');
    if (!bearFace || !this.bearImages) return;

    let newContent;
    switch (state) {
      case 'happy':
        newContent = this.bearImages.happy;
        break;
      case 'sad':
        newContent = this.bearImages.sad;
        break;
      case 'tagging':
        newContent = this.bearImages.tagging;
        break;
      default:
        newContent = this.bearImages.default;
    }

    bearFace.innerHTML = newContent;
  }

  // ===== ACTION HANDLERS =====
  handleTagButtonClick() {
    try {
      console.log('🏷️ ThreadCub: Handling tag button click...');
      console.log('🏷️ ThreadCub: window.threadcubTagging exists:', !!window.threadcubTagging);

      if (window.threadcubTagging && typeof window.threadcubTagging.toggleSidePanel === 'function') {
        console.log('🏷️ ThreadCub: Calling toggleSidePanel...');
        window.threadcubTagging.toggleSidePanel();
      } else {
        console.log('🏷️ ThreadCub: Tagging system not available, initializing...');
        this.initializeTagging();
      }
    } catch (error) {
      console.error('🏷️ ThreadCub: Error in handleTagButtonClick:', error);
      this.showErrorToast('Tagging system error');
    }
  }

  initializeTagging() {
    if (typeof window.ThreadCubTagging !== 'undefined' && !window.threadcubTagging) {
      try {
        window.threadcubTagging = new window.ThreadCubTagging(this);
        console.log('🏷️ ThreadCub: Tagging system initialized from button click');

        // Now try to toggle the panel
        if (window.threadcubTagging.toggleSidePanel) {
          window.threadcubTagging.toggleSidePanel();
        }
      } catch (error) {
        console.error('🏷️ ThreadCub: Failed to initialize tagging system:', error);
      }
    } else {
      console.log('🏷️ ThreadCub: ThreadCubTagging class not available');
    }
  }

  ensureTaggingAvailable() {
    if (!window.threadcubTagging) {
      this.initializeTagging();
    }
    return !!window.threadcubTagging;
  }

  // ===== MOUSE/TOUCH EVENT HANDLERS =====
  handleMouseDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    // Check for action button clicks
    const markdownBtn = e.target.closest('.threadcub-markdown-btn');
    const pdfBtn = e.target.closest('.threadcub-pdf-btn');
    const tagBtn = e.target.closest('.threadcub-tag-btn');
    const closeBtn = e.target.closest('.threadcub-close-btn');

    if (markdownBtn) {
      console.log('PageCub: Markdown download button clicked');
      this.downloadAsMarkdown();
      return;
    }

    if (pdfBtn) {
      console.log('PageCub: PDF download button clicked');
      this.downloadAsPDF();
      return;
    }

    if (tagBtn) {
      console.log('PageCub: Tag button clicked');
      this.handleTagButtonClick();
      return;
    }

    if (closeBtn) {
      this.destroy();
      return;
    }

    // Start drag for bear head, grip icon, or main button (but not action buttons)
    if (!e.target.closest('.threadcub-action-buttons')) {
      this.startDrag(e.clientX, e.clientY);
    }
  }

  handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    this.startDrag(touch.clientX, touch.clientY);
  }

  handleMouseMove(e) {
    if (!this.isDragging) return;
    e.preventDefault();
    this.updateDragPosition(e.clientX, e.clientY);
  }

  handleTouchMove(e) {
    if (!this.isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    this.updateDragPosition(touch.clientX, touch.clientY);
  }

  handleMouseUp(e) {
    if (!this.isDragging) return;
    this.endDrag(e.clientX, e.clientY);
  }

  handleTouchEnd(e) {
    if (!this.isDragging) return;
    const touch = e.changedTouches[0];
    this.endDrag(touch.clientX, touch.clientY);
  }

  handleClick(e) {
    // Prevent click if it was part of a drag operation
    if (this.isDragging) {
        e.preventDefault();
        e.stopPropagation();
        return;
    }
    // Handle specific click logic if needed, but not for drag
    // No default action here if it was a drag,
    // otherwise, let action buttons handle their own clicks via handleMouseDown
  }

  handleResize() {
    // Add small delay to allow window to fully resize before repositioning
    setTimeout(() => {
      this.setEdgePosition(this.currentEdge, this.currentPosition);
    }, 100);
  }

  // ===== DRAG FUNCTIONALITY =====
  startDrag(clientX, clientY) {
    this.isDragging = true;
    this.button.classList.add('dragging'); // Add class for dragging styles
    this.startX = clientX;
    this.startY = clientY;

    this.borderOverlay.style.opacity = '1'; // Direct style as it's dynamic
    this.createShadowButton();
  }

  createShadowButton() {
    if (this.shadowButton) this.shadowButton.remove();

    this.shadowButton = document.createElement('div');
    this.shadowButton.className = 'threadcub-shadow-button'; // Apply class
    document.body.appendChild(this.shadowButton);
    this.updateShadowPosition();
  }

  updateShadowPosition() {
    if (!this.shadowButton) return;

    const snapPosition = this.calculateSnapPosition(this.currentEdge, this.currentPosition);
    // Adjusted shadow position for visual offset
    this.shadowButton.style.left = `${snapPosition.x + 6}px`;
    this.shadowButton.style.top = `${snapPosition.y + 6}px`;
    this.shadowButton.classList.add('active'); // Add active class to show shadow
  }

  calculateSnapPosition(edge, position) {
    const { innerWidth: width, innerHeight: height } = window;
    let x, y;

    switch (edge) {
      case 'left':
        x = this.edgeMargin;
        y = position * (height - this.buttonSize);
        break;
      case 'right':
        x = width - this.buttonSize - this.edgeMargin;
        y = position * (height - this.buttonSize);
        break;
      case 'top':
        x = position * (width - this.buttonSize);
        y = this.edgeMargin;
        break;
      case 'bottom':
        x = position * (width - this.buttonSize);
        y = height - this.buttonSize - this.edgeMargin;
        break;
      default: // Fallback
        x = width - this.buttonSize - this.edgeMargin; // Default to right
        y = position * (height - this.buttonSize);
    }

    // Clamp values to ensure button stays within viewport
    x = Math.max(this.edgeMargin, Math.min(width - this.buttonSize - this.edgeMargin, x));
    y = Math.max(this.edgeMargin, Math.min(height - this.buttonSize - this.edgeMargin, y));

    return { x, y };
  }

  updateDragPosition(clientX, clientY) {
    // Update button position dynamically during drag
    this.button.style.left = `${clientX - this.buttonSize/2}px`;
    this.button.style.top = `${clientY - this.buttonSize/2}px`;

    // Calculate nearest edge
    const { innerWidth: width, innerHeight: height } = window;
    const distances = {
      left: clientX,
      right: width - clientX,
      top: clientY,
      bottom: height - clientY
    };

    const nearestEdge = Object.keys(distances).reduce((a, b) => distances[a] < distances[b] ? a : b);

    let position;
    if (nearestEdge === 'left' || nearestEdge === 'right') {
      position = Math.max(0, Math.min(1, (clientY - this.buttonSize/2) / (height - this.buttonSize)));
    } else {
      position = Math.max(0, Math.min(1, (clientX - this.buttonSize/2) / (width - this.buttonSize)));
    }

    this.currentEdge = nearestEdge;
    this.currentPosition = position;
    this.updateShadowPosition();
  }

  endDrag(clientX, clientY) {
    const moveDistance = Math.sqrt(
      Math.pow(clientX - this.startX, 2) + Math.pow(clientY - this.startY, 2)
    );

    this.isDragging = false;
    this.button.classList.remove('dragging'); // Remove dragging class
    this.borderOverlay.style.opacity = '0'; // Hide border overlay

    if (this.shadowButton) {
      this.shadowButton.classList.remove('active'); // Hide shadow button
      // Delay removal to allow fade out transition
      setTimeout(() => {
        if (this.shadowButton) {
          this.shadowButton.remove();
          this.shadowButton = null;
        }
      }, 200);
    }

    // Only animate to new position if significant movement occurred
    if (moveDistance >= 10) {
      this.animateToEdgePosition();
      this.savePosition();
    }
  }

  animateToEdgePosition() {
    this.button.style.transition = 'all var(--transition-drag-snap)'; // Use CSS variable for snap transition
    this.setEdgePosition(this.currentEdge, this.currentPosition);

    // Reset transition after animation to allow regular hover transitions
    setTimeout(() => {
      this.button.style.transition = 'all var(--transition-base)'; // Use CSS variable for base transition
    }, 300);
  }

  // ===== POSITION MANAGEMENT =====
  setEdgePosition(edge, position) {
    const snapPosition = this.calculateSnapPosition(edge, position);

    this.button.style.left = `${snapPosition.x}px`;
    this.button.style.top = `${snapPosition.y}px`;

    // Update class for edge-specific styling (action button layout)
    this.button.className = this.button.className.replace(/edge-\w+/g, ''); // Clear existing edge classes
    this.button.classList.add(`edge-${edge}`);

    this.currentEdge = edge;
    this.currentPosition = position;
  }

  savePosition() {
    const position = { edge: this.currentEdge, position: this.currentPosition };
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ threadcubButtonPosition: position });
      } else {
        localStorage.setItem('threadcubButtonPosition', JSON.stringify(position));
      }
    } catch (error) {
      console.log('🐻 ThreadCub: Could not save position:', error);
    }
  }

  async loadPosition() {
    try {
      let savedPosition = null;

      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['threadcubButtonPosition']);
        savedPosition = result.threadcubButtonPosition;
      } else {
        const saved = localStorage.getItem('threadcubButtonPosition');
        savedPosition = saved ? JSON.parse(saved) : null;
      }

      if (savedPosition && savedPosition.edge && typeof savedPosition.position === 'number') {
        this.setEdgePosition(savedPosition.edge, savedPosition.position);
      }
    } catch (error) {
      console.log('🐻 ThreadCub: Could not load position:', error);
    }
  }

  // ===== TOAST NOTIFICATIONS =====
  showSuccessToast(message = '✅ Success!') {
    window.UIComponents.showSuccessToast(message);
  }

  showErrorToast(message = '❌ Error occurred') {
    window.UIComponents.showErrorToast(message);
  }

  showToast(message, type = 'success') {
    window.UIComponents.showToast(message, type);
  }

  // Static method for global access
  static showGlobalSuccessToast(message = 'Operation completed successfully!') {
    window.UIComponents.showGlobalSuccessToast(message);
  }

  // ===== UTILITY METHODS =====
  destroy() {
    if (this.button && this.button.parentNode) {
      this.button.parentNode.removeChild(this.button);
    }
    if (this.borderOverlay && this.borderOverlay.parentNode) {
      this.borderOverlay.parentNode.removeChild(this.borderOverlay);
    }
    // Also remove any active tooltips
    document.querySelectorAll('.threadcub-tooltip').forEach(t => t.remove());
    console.log('PageCub: Button destroyed');
  }

  // ===== PAGECUB DOWNLOAD METHODS =====
  async downloadAsMarkdown() {
    try {
      // Show loading toast
      this.showToast('Extracting page content...', 'info');

      // Extract page content
      const extractor = new PageExtractor();
      const content = extractor.extract();

      // Convert to Markdown with frontmatter
      const markdown = this.convertToMarkdown(content);

      // Generate filename from URL slug (cleaner than title)
      const filename = this.getUrlSlug() + '.md';

      // Download the file
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showSuccessToast('Downloaded as Markdown!');
      console.log('PageCub: Markdown download completed:', filename);
    } catch (error) {
      console.error('PageCub: Markdown download failed:', error);
      this.showErrorToast('Download failed: ' + error.message);
    }
  }

  async downloadAsPDF() {
    // Hide the floating button so it doesn't appear in the PDF
    const showButtonAfter = () => {
      if (this.button) {
        this.button.style.display = 'flex';
      }
    };

    try {
      // Hide the button before generating PDF
      if (this.button) {
        this.button.style.display = 'none';
      }

      // Wait for DOM to update
      await new Promise(resolve => setTimeout(resolve, 150));

      // NOTE: Don't show toast here - it would appear in the captured PDF
      // The success/error toast will be shown after the capture is complete

      // Get the URL slug for the filename (cleaner than page title)
      const urlSlug = this.getUrlSlug();

      console.log('PageCub: Requesting PDF generation via background script...');

      // Send message to background script to generate PDF using Chrome's debugger API
      chrome.runtime.sendMessage({
        action: 'generatePDF',
        slug: urlSlug
      }, (response) => {
        // Always show the button again after PDF generation
        showButtonAfter();

        if (chrome.runtime.lastError) {
          console.error('PageCub: PDF generation error:', chrome.runtime.lastError);
          this.showErrorToast('PDF generation failed: ' + chrome.runtime.lastError.message);
          return;
        }

        if (response && response.success) {
          this.showSuccessToast('Downloaded as PDF!');
          console.log('PageCub: PDF download completed');
        } else {
          const errorMsg = response?.error || 'Unknown error';
          console.error('PageCub: PDF generation failed:', errorMsg);
          this.showErrorToast('PDF failed: ' + errorMsg);
        }
      });

    } catch (error) {
      // Ensure button is shown even on error
      showButtonAfter();
      console.error('PageCub: PDF download failed:', error);
      this.showErrorToast('Download failed: ' + error.message);
    }
  }

  convertToMarkdown(content) {
    let md = '---\n';
    md += `title: ${content.title}\n`;
    md += `author: ${content.author}\n`;
    md += `url: ${content.url}\n`;
    md += `date: ${content.publishDate}\n`;
    md += `saved: ${content.timestamp}\n`;
    md += '---\n\n';
    md += `# ${content.title}\n\n`;
    md += `**Author:** ${content.author}  \n`;
    md += `**Source:** ${content.url}  \n`;
    md += `**Date:** ${content.publishDate}\n\n`;
    md += '---\n\n';
    md += content.bodyText;
    return md;
  }

  sanitizeFilename(title) {
    return title
      .replace(/[^a-z0-9]/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
      .substring(0, 100);
  }

  /**
   * Extract a clean slug from the current page URL
   * Handles Substack (/p/slug), Medium, and general URL patterns
   * @returns {string} The extracted slug for use as filename
   */
  getUrlSlug() {
    const pathname = window.location.pathname;

    try {
      // Substack subdomain pattern: /p/article-slug or /p/article-slug?...
      const substackSubdomainMatch = pathname.match(/\/p\/([^/?#]+)/);
      if (substackSubdomainMatch) {
        return substackSubdomainMatch[1];
      }

      // Substack main domain pattern: /home/post/p-123456-article-slug
      // Extract just the article slug part (after p-ID-)
      const substackMainMatch = pathname.match(/\/home\/post\/p-\d+-(.+)/);
      if (substackMainMatch) {
        return substackMainMatch[1];
      }

      // Substack main domain fallback: /home/post/article-slug (if format varies)
      const substackHomeMatch = pathname.match(/\/home\/post\/([^/?#]+)/);
      if (substackHomeMatch) {
        // Remove any leading ID prefix like "p-123456-"
        const slug = substackHomeMatch[1].replace(/^p-\d+-/, '');
        return slug;
      }

      // Medium pattern: /@username/article-slug-abc123 or /article-slug-abc123
      // Remove the hash ID at the end (usually 12 hex chars)
      const mediumMatch = pathname.match(/\/(?:@[^/]+\/)?([^/?#]+?)(?:-[a-f0-9]{8,12})?$/i);
      if (mediumMatch && mediumMatch[1]) {
        return mediumMatch[1];
      }

      // General fallback: get the last path segment
      const segments = pathname.split('/').filter(s => s.length > 0);
      if (segments.length > 0) {
        // Remove common prefixes like 'p', 'post', 'article', 'blog'
        const lastSegment = segments[segments.length - 1];
        // Remove query strings and hash
        const cleanSegment = lastSegment.split(/[?#]/)[0];
        if (cleanSegment && cleanSegment.length > 0) {
          return cleanSegment;
        }
      }

      // Ultimate fallback: use sanitized hostname + timestamp
      return window.location.hostname.replace(/\./g, '-') + '-' + Date.now();

    } catch (error) {
      console.error('PageCub: Error extracting URL slug:', error);
      return 'page-' + Date.now();
    }
  }

}

// Make the class globally available
window.PageCubFloatingButton = PageCubFloatingButton;
// Legacy alias for compatibility
window.ThreadCubFloatingButton = PageCubFloatingButton;

console.log('PageCubFloatingButton defined:', typeof window.PageCubFloatingButton);

// Add message listener for popup communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('PageCub: Received message:', request);

    try {
        if (request.action === 'checkButtonStatus') {
            sendResponse({ success: true, exists: !!window.pagecubButton });
            return;
        }

        if (request.action === 'hideFloatingButton') {
            if (window.pagecubButton && window.pagecubButton.button) {
                window.pagecubButton.button.style.display = 'none';
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: 'Button not found' });
            }
            return;
        }

        if (request.action === 'showFloatingButton') {
            if (window.pagecubButton && window.pagecubButton.button) {
                window.pagecubButton.button.style.display = 'flex';
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: 'Button not found' });
            }
            return;
        }

        sendResponse({ success: false, error: 'Unknown action' });

    } catch (error) {
        console.error('PageCub: Message handler error:', error);
        sendResponse({ success: false, error: error.message });
    }
});
