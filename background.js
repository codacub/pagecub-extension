// === SECTION 1: Core Message Handler ===

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('🐻 Background: Received message:', request.action);

  switch (request.action) {
    case 'download':
      handleDownload(request, sendResponse);
      return true;

    case 'generatePDF':
      handleGeneratePDF(request, sender, sendResponse);
      return true;

    case 'saveConversation':
      handleSaveConversation(request.data)
        .then(result => sendResponse({ success: true, data: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    
    case 'openAndInject':
      handleOpenAndInject(request.url, request.prompt)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    
    case 'storeContinuationData':
      handleStoreContinuationData(request, sender, sendResponse);
      return false;
    
    case 'getContinuationData':
      handleGetContinuationData(sender, sendResponse);
      return true;
    
    case 'getAuthToken':
      handleGetAuthToken(sendResponse);
      return true;
    
    case 'exportComplete':
      console.log('🐻 Background: Export completed notification received');
      break;
    
    case 'buttonStatusChanged':
      console.log('🐻 Background: Button status changed:', request.visible);
      break;
    
    default:
      console.log('🐻 Background: Unknown action:', request.action);
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// === SECTION 2: Download Handler ===

function handleDownload(request, sendResponse) {
  console.log('🐻 Background: Starting download process');
  console.log('🐻 Background: Data received:', request.data);
  console.log('🐻 Background: Filename:', request.filename);

  try {
    // Validate the data
    if (!request.data) {
      console.error('🐻 Background: No data provided for download');
      setTimeout(() => sendResponse({ success: false, error: 'No data provided' }), 0);
      return;
    }

    if (!request.filename) {
      console.error('🐻 Background: No filename provided for download');
      setTimeout(() => sendResponse({ success: false, error: 'No filename provided' }), 0);
      return;
    }

    // Create the JSON string
    const jsonString = JSON.stringify(request.data, null, 2);
    console.log('🐻 Background: JSON string length:', jsonString.length);

    // Convert to base64 data URL
    const base64Data = btoa(unescape(encodeURIComponent(jsonString)));
    const dataUrl = `data:application/json;charset=utf-8;base64,${base64Data}`;
    console.log('🐻 Background: Created data URL, length:', dataUrl.length);

    // Start the download
    chrome.downloads.download({
      url: dataUrl,
      filename: request.filename,
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('🐻 Background: Download failed:', chrome.runtime.lastError);
        setTimeout(() => sendResponse({ success: false, error: chrome.runtime.lastError.message }), 0);
      } else {
        console.log('🐻 Background: Download started with ID:', downloadId);
        setTimeout(() => sendResponse({ success: true, downloadId: downloadId }), 0);
      }
    });

  } catch (error) {
    console.error('🐻 Background: Error during download:', error);
    setTimeout(() => sendResponse({ success: false, error: error.message }), 0);
  }
}

// === SECTION 3: API Handler ===

async function handleSaveConversation(data) {
  try {
    console.log('🐻 Background: Making API call to ThreadCub with data:', data);

    // Use ApiService (Note: ApiService is not available in service worker context)
    // Keeping original implementation for now as service workers can't access content script modules
    console.log('🐻 Background: API URL:', 'https://threadcub.com/api/conversations/save');

    // TEMPORARY: Test if endpoint exists with GET first
    console.log('🐻 Background: Testing endpoint accessibility...');
    try {
      const testResponse = await fetch('https://threadcub.com/api/conversations/save', {
        method: 'GET'
      });
      console.log('🐻 Background: GET test response:', testResponse.status);
      console.log('🐻 Background: GET allowed methods:', testResponse.headers.get('Allow'));
    } catch (error) {
      console.log('🐻 Background: GET test failed:', error);
    }

    const response = await fetch('https://threadcub.com/api/conversations/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data)
    });

    console.log('🐻 Background: POST response status:', response.status);
    console.log('🐻 Background: POST response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🐻 Background: API error response:', errorText);

      // If 405, try to get more info about allowed methods
      if (response.status === 405) {
        const allowedMethods = response.headers.get('Allow');
        console.error('🐻 Background: Allowed methods:', allowedMethods);
        throw new Error(`Method not allowed. Allowed methods: ${allowedMethods || 'unknown'}`);
      }

      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('🐻 Background: API call successful:', result);

    return result;
    
  } catch (error) {
    console.error('🐻 Background: Error in handleSaveConversation:', error);
    throw error;
  }
}

// === SECTION 4: Cross-Tab Continuation System ===

function handleStoreContinuationData(request, sender, sendResponse) {
  console.log('🔄 Background: Storing continuation data for cross-tab communication');
  
  // FIXED: Use the same key name that content.js expects
  chrome.storage.local.set({
    threadcubContinuationData: {
      prompt: request.prompt,
      shareUrl: request.shareUrl,
      platform: request.platform,
      timestamp: Date.now(),
      sourceTabId: sender.tab.id,
      messages: request.messages || [],
      totalMessages: request.totalMessages || request.messages?.length || 0
    }
  });
  
  sendResponse({ success: true });
}

function handleGetContinuationData(sender, sendResponse) {
  console.log('🔄 Background: Getting continuation data for new tab');
  
  // FIXED: Use the same key name that content.js expects
  chrome.storage.local.get(['threadcubContinuationData'], (result) => {
    const data = result.threadcubContinuationData;
    
    // Check if data exists, is recent (within 5 minutes), and from different tab
    if (data && 
        Date.now() - data.timestamp < 300000 && 
        data.sourceTabId !== sender.tab.id) {
      
      console.log('🔄 Background: Found valid continuation data, sending to tab');
      // Clear the data after retrieving it (one-time use)
      chrome.storage.local.remove(['threadcubContinuationData']);
      sendResponse({ data });
    } else {
      console.log('🔄 Background: No valid continuation data found');
      sendResponse({ data: null });
    }
  });
}

// === SECTION 5: Tab Management & Prompt Injection ===

// Platform configurations for prompt injection
const PLATFORM_INJECTORS = {
  'chat.openai.com': {
    name: 'ChatGPT',
    selectors: ['textarea[data-testid="prompt-textarea"]', '#prompt-textarea', 'textarea']
  },
  'chatgpt.com': {
    name: 'ChatGPT', 
    selectors: ['textarea[data-testid="prompt-textarea"]', '#prompt-textarea', 'textarea']
  },
  'claude.ai': {
    name: 'Claude',
    selectors: ['textarea[data-testid="chat-input"]', 'div[contenteditable="true"]']
  },
  'gemini.google.com': {
    name: 'Gemini',
    selectors: ['rich-textarea[data-test-id="input-field"] div[contenteditable="true"]', 'textarea']
  },
  'copilot.microsoft.com': {
    name: 'Copilot',
    selectors: ['textarea[data-testid="chat-input"]', 'textarea']
  }
};

async function handleOpenAndInject(url, prompt) {
  try {
    console.log(`🔄 Background: Opening new tab: ${url}`);
    
    // Create new tab
    const tab = await chrome.tabs.create({ url: url });
    
    // Wait for tab to load
    await waitForTabReady(tab.id);
    
    // Get platform config
    const hostname = new URL(url).hostname;
    const platformConfig = PLATFORM_INJECTORS[hostname];
    
    if (!platformConfig) {
      console.log('🔄 Background: Unsupported platform, tab opened but no injection');
      return { success: true, tabId: tab.id, platform: 'Unknown', injected: false };
    }
    
    // Inject the prompt
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: injectPromptFunction,
      args: [prompt, platformConfig.selectors]
    });
    
    console.log('🔄 Background: Injection result:', result);
    
    return { success: true, tabId: tab.id, platform: platformConfig.name, injected: true };
    
  } catch (error) {
    console.error('🔄 Background: Error:', error);
    return { success: false, error: error.message };
  }
}

async function waitForTabReady(tabId, maxWaitTime = 8000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.status === 'complete') {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      throw new Error('Tab no longer exists');
    }
  }
  
  throw new Error('Timeout waiting for tab');
}

function injectPromptFunction(prompt, selectors) {
  return new Promise((resolve) => {
    console.log('🔄 Injecting prompt into page');
    
    let attempts = 0;
    const maxAttempts = 15;
    
    function tryInject() {
      attempts++;
      
      let inputField = null;
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const style = window.getComputedStyle(element);
          if (style.display !== 'none' && element.offsetHeight > 0) {
            inputField = element;
            break;
          }
        }
        if (inputField) break;
      }
      
      if (inputField) {
        console.log('🔄 Found input field, injecting prompt');
        
        inputField.focus();
        
        if (inputField.tagName === 'TEXTAREA') {
          inputField.value = prompt;
          inputField.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (inputField.contentEditable === 'true') {
          inputField.textContent = prompt;
          inputField.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        resolve({ success: true });
        
      } else if (attempts < maxAttempts) {
        setTimeout(tryInject, 400);
      } else {
        console.log('🔄 Could not find input field');
        resolve({ success: false, error: 'Input field not found' });
      }
    }
    
    tryInject();
  });
}

// === SECTION 6: Extension Lifecycle ===

chrome.runtime.onInstalled.addListener((details) => {
  console.log('🐻 Background: Extension installed/updated:', details.reason);

  if (details.reason === 'install') {
    console.log('🐻 Background: First install - opening welcome page');
    chrome.tabs.create({
      url: chrome.runtime.getURL('welcome.html')
    });
  }
});

chrome.runtime.onStartup.addListener(() => {
  console.log('🐻 Background: Extension started');
});

console.log('🐻 PageCub background script loaded and ready');

// === SECTION 8: PDF Generation using Chrome Debugger API ===
//
// IMPORTANT NOTE ABOUT DEBUGGER BANNER:
// When using chrome.debugger.attach(), Chrome displays a security banner:
// "'ExtensionName' started debugging this browser"
//
// This is Chrome's built-in security feature and CANNOT be customized or disabled.
// The extension name shown comes from the "name" field in manifest.json.
//
// This behavior is by design - Chrome wants users to know when debugging is active.
// The chrome.debugger.attach() API has no options to customize this message.
//
// Alternative approaches that don't trigger this banner:
// 1. window.print() - Opens browser's print dialog (requires user interaction)
// 2. html2canvas + jsPDF - Client-side rendering (quality tradeoffs, no background images)
//
// We use the debugger API because it produces the highest quality PDF output
// that matches what the browser renders, including CSS, fonts, and layout.
//

// Default PDF settings (will be adjusted dynamically based on page width)
const DEFAULT_PDF_SETTINGS = {
  printBackground: true,
  landscape: false,
  scale: 0.85,        // Slightly reduced scale for better fit
  paperWidth: 8.5,    // US Letter width in inches (default)
  paperHeight: 11,    // US Letter height in inches
  marginTop: 0.3,
  marginBottom: 0.3,
  marginLeft: 0.3,
  marginRight: 0.3,
  displayHeaderFooter: false,
  preferCSSPageSize: false
};

async function handleGeneratePDF(request, sender, sendResponse) {
  const tabId = sender.tab?.id;
  const pageSlug = request.slug || 'page';

  if (!tabId) {
    sendResponse({ success: false, error: 'No tab ID available' });
    return;
  }

  console.log('📄 Background: Starting PDF generation for tab:', tabId);

  const target = { tabId: tabId };
  let debuggerAttached = false;

  try {
    // Step 1: Warm up the page (load lazy images, extract content)
    console.log('📄 Background: Warming up page...');
    await warmUpPage(tabId);

    // Step 2: Attach debugger
    console.log('📄 Background: Attaching debugger...');
    await attachDebugger(target);
    debuggerAttached = true;

    // Step 3: Generate PDF
    console.log('📄 Background: Generating PDF...');
    const pdfData = await generatePDFWithDebugger(target);

    // Step 4: Detach debugger
    console.log('📄 Background: Detaching debugger...');
    await detachDebugger(target);
    debuggerAttached = false;

    // Step 5: Restore the page to original state
    console.log('📄 Background: Restoring page...');
    await restorePage(tabId);

    // Step 6: Download PDF
    console.log('📄 Background: Downloading PDF...');
    const filename = pageSlug + '.pdf';
    const dataUrl = 'data:application/pdf;base64,' + pdfData;

    chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('📄 Background: Download failed:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('📄 Background: PDF download started, ID:', downloadId);
        sendResponse({ success: true, downloadId: downloadId });
      }
    });

  } catch (error) {
    console.error('📄 Background: PDF generation error:', error);

    // Make sure to detach debugger on error
    if (debuggerAttached) {
      try {
        await detachDebugger(target);
      } catch (detachError) {
        console.error('📄 Background: Error detaching debugger:', detachError);
      }
    }

    // Try to restore page even on error
    try {
      await restorePage(tabId);
    } catch (restoreError) {
      console.error('📄 Background: Error restoring page:', restoreError);
    }

    sendResponse({ success: false, error: error.message || 'PDF generation failed' });
  }
}

// Attach Chrome debugger to tab
function attachDebugger(target) {
  return new Promise((resolve, reject) => {
    chrome.debugger.attach(target, '1.3', () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

// Detach Chrome debugger from tab
function detachDebugger(target) {
  return new Promise((resolve, reject) => {
    chrome.debugger.detach(target, () => {
      if (chrome.runtime.lastError) {
        // Ignore "not attached" errors
        if (chrome.runtime.lastError.message.includes('not attached')) {
          resolve();
        } else {
          reject(new Error(chrome.runtime.lastError.message));
        }
      } else {
        resolve();
      }
    });
  });
}

// Get page dimensions from the webpage
function getPageDimensions(target) {
  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand(target, 'Runtime.evaluate', {
      expression: `({
        scrollWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
        scrollHeight: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
        clientWidth: document.documentElement.clientWidth,
        clientHeight: document.documentElement.clientHeight
      })`
    }, (result) => {
      if (chrome.runtime.lastError) {
        console.log('📄 Background: Could not get page dimensions, using defaults');
        resolve(null);
      } else if (result && result.result && result.result.value) {
        resolve(result.result.value);
      } else {
        resolve(null);
      }
    });
  });
}

// Calculate optimal PDF settings based on page dimensions
function calculatePDFSettings(pageDimensions) {
  const settings = { ...DEFAULT_PDF_SETTINGS };

  if (!pageDimensions) {
    console.log('📄 Background: Using default PDF settings');
    return settings;
  }

  const { scrollWidth, clientWidth } = pageDimensions;
  console.log('📄 Background: Page dimensions - scrollWidth:', scrollWidth, 'clientWidth:', clientWidth);

  // Calculate effective page width in pixels
  const pageWidthPx = Math.max(scrollWidth, clientWidth, 800);

  // Convert to inches (96 DPI is standard for web)
  const pageWidthInches = pageWidthPx / 96;

  // Determine if page is wider than standard paper
  const minWidth = 8.5; // US Letter width
  const maxWidth = 14;  // Maximum reasonable width

  if (pageWidthInches > minWidth) {
    // Page is wider than standard paper, adjust dimensions
    const adjustedWidth = Math.min(pageWidthInches + 0.6, maxWidth); // Add margin buffer
    settings.paperWidth = adjustedWidth;
    settings.scale = 0.8; // Reduce scale for wider pages
    console.log('📄 Background: Adjusted PDF width to', adjustedWidth.toFixed(2), 'inches');
  } else {
    // Standard width page
    settings.paperWidth = minWidth;
    settings.scale = 0.85;
  }

  // Use landscape for very wide pages
  if (pageWidthInches > 11) {
    settings.landscape = true;
    console.log('📄 Background: Using landscape orientation for wide page');
  }

  return settings;
}

// Generate PDF using Page.printToPDF with dynamic width
async function generatePDFWithDebugger(target) {
  // First, get the page dimensions
  const pageDimensions = await getPageDimensions(target);

  // Calculate optimal PDF settings
  const pdfSettings = calculatePDFSettings(pageDimensions);
  console.log('📄 Background: PDF settings:', JSON.stringify(pdfSettings));

  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand(target, 'Page.printToPDF', pdfSettings, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (result && result.data) {
        resolve(result.data);
      } else {
        reject(new Error('No PDF data returned'));
      }
    });
  });
}

// Warm up page: load lazy images, scroll through page
async function warmUpPage(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: warmUpPageContent
    });
    // Wait a bit for resources to load
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    console.log('📄 Background: Warm up warning:', error.message);
    // Continue even if warm-up fails
  }
}

// Restore page after PDF generation
async function restorePage(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: restorePageContent
    });
    console.log('📄 Background: Page restored successfully');
  } catch (error) {
    console.log('📄 Background: Restore warning:', error.message);
    // Continue even if restore fails - user can refresh
  }
}

// This function runs in the page context to restore original page state
function restorePageContent() {
  console.log('📄 PageCub: Restoring page to original state...');

  // Remove the PDF wrapper
  const pdfWrapper = document.getElementById('pagecub-pdf-wrapper');
  if (pdfWrapper) {
    pdfWrapper.remove();
    console.log('📄 PageCub: Removed PDF wrapper');
  }

  // Remove cleanup styles
  const cleanupStyle = document.getElementById('pagecub-cleanup-style');
  if (cleanupStyle) cleanupStyle.remove();

  const fallbackStyle = document.getElementById('pagecub-fallback-style');
  if (fallbackStyle) fallbackStyle.remove();

  // Restore all hidden body children
  Array.from(document.body.children).forEach(child => {
    if (child.hasAttribute('data-pagecub-original-display')) {
      const originalDisplay = child.getAttribute('data-pagecub-original-display');
      child.style.display = originalDisplay || '';
      child.removeAttribute('data-pagecub-original-display');
    }
  });

  console.log('📄 PageCub: Page restoration complete');
}

// This function runs in the page context to prepare page for PDF capture
function warmUpPageContent() {
  return new Promise(async (resolve) => {
    console.log('📄 PageCub: Preparing page for PDF capture...');

    // =========================================================================
    // STEP 1: TRIGGER LAZY LOADING (images, scroll, fonts)
    // =========================================================================

    // Trigger all lazy-loaded images
    const images = document.querySelectorAll('img[data-src], img[loading="lazy"], img.lazy');
    images.forEach(img => {
      if (img.dataset.src) {
        img.src = img.dataset.src;
      }
      img.loading = 'eager';
    });

    // Scroll through page to trigger lazy content
    const scrollStep = window.innerHeight;
    const maxScroll = document.documentElement.scrollHeight;
    const originalScroll = window.scrollY;

    for (let pos = 0; pos < maxScroll; pos += scrollStep) {
      window.scrollTo(0, pos);
      await new Promise(r => setTimeout(r, 100));
    }

    // Wait for images to load
    const allImages = Array.from(document.images);
    await Promise.all(allImages.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
        setTimeout(resolve, 2000);
      });
    }));

    // Wait for fonts
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    // Scroll back to top
    window.scrollTo(0, 0);

    // =========================================================================
    // STEP 2: FIND ARTICLE CONTENT
    // =========================================================================

    // Selectors to find article content, in order of specificity
    const articleSelectors = [
      // Substack-specific selectors
      '.post-content',
      '.available-content',
      '.body.markup',
      '[class*="post-content"]',
      '[class*="PostContent"]',

      // Generic article selectors
      'article',
      '[role="article"]',
      'main article',
      '.article-content',
      '.entry-content',
      '.content-body',
      'main',
    ];

    let articleElement = null;
    for (const selector of articleSelectors) {
      try {
        const el = document.querySelector(selector);
        if (el && el.innerText && el.innerText.length > 200) {
          articleElement = el;
          console.log('📄 PageCub: Found article content with selector:', selector);
          break;
        }
      } catch (e) {
        // Ignore invalid selectors
      }
    }

    // =========================================================================
    // STEP 3: EXTRACT TITLE AND METADATA
    // =========================================================================

    // Find title
    const titleSelectors = [
      'h1.post-title',
      'h1[class*="post-title"]',
      'h1[class*="PostTitle"]',
      'article h1',
      'main h1',
      'h1',
    ];

    let titleElement = null;
    for (const selector of titleSelectors) {
      try {
        const el = document.querySelector(selector);
        if (el && el.innerText && el.innerText.length > 0) {
          titleElement = el;
          break;
        }
      } catch (e) {}
    }

    // Find subtitle/description
    const subtitleSelectors = [
      '.subtitle',
      '[class*="subtitle"]',
      '[class*="Subtitle"]',
      'h2.post-subtitle',
      '.post-meta',
    ];

    let subtitleElement = null;
    for (const selector of subtitleSelectors) {
      try {
        const el = document.querySelector(selector);
        if (el && el.innerText) {
          subtitleElement = el;
          break;
        }
      } catch (e) {}
    }

    // Find author info
    const authorSelectors = [
      '.author-name',
      '[class*="author"]',
      '[class*="Author"]',
      '.byline',
      '[rel="author"]',
    ];

    let authorElement = null;
    for (const selector of authorSelectors) {
      try {
        const el = document.querySelector(selector);
        if (el && el.innerText) {
          authorElement = el;
          break;
        }
      } catch (e) {}
    }

    // =========================================================================
    // STEP 4: CREATE CLEAN PDF CONTAINER
    // =========================================================================

    if (articleElement) {
      console.log('📄 PageCub: Creating clean PDF container...');

      // Create wrapper for clean PDF content
      // Using position: relative (NOT fixed) so content can expand to full height
      // This allows Page.printToPDF to capture all content across multiple pages
      const pdfWrapper = document.createElement('div');
      pdfWrapper.id = 'pagecub-pdf-wrapper';
      pdfWrapper.style.cssText = `
        position: relative !important;
        width: 100% !important;
        max-width: 800px !important;
        margin: 0 auto !important;
        min-height: 100vh !important;
        background: white !important;
        z-index: 999999 !important;
        padding: 40px !important;
        box-sizing: border-box !important;
        overflow: visible !important;
        font-family: Georgia, 'Times New Roman', serif !important;
        font-size: 16px !important;
        line-height: 1.6 !important;
        color: #1a1a1a !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
      `;

      // Add title if found
      if (titleElement) {
        const titleClone = titleElement.cloneNode(true);
        titleClone.style.cssText = `
          font-size: 32px !important;
          font-weight: bold !important;
          margin: 0 0 16px 0 !important;
          line-height: 1.2 !important;
          color: #1a1a1a !important;
        `;
        pdfWrapper.appendChild(titleClone);
      }

      // Add subtitle if found
      if (subtitleElement) {
        const subtitleClone = subtitleElement.cloneNode(true);
        subtitleClone.style.cssText = `
          font-size: 18px !important;
          color: #666 !important;
          margin: 0 0 16px 0 !important;
          font-style: italic !important;
        `;
        pdfWrapper.appendChild(subtitleClone);
      }

      // Add author if found
      if (authorElement) {
        const authorClone = authorElement.cloneNode(true);
        authorClone.style.cssText = `
          font-size: 14px !important;
          color: #888 !important;
          margin: 0 0 32px 0 !important;
        `;
        pdfWrapper.appendChild(authorClone);
      }

      // Add horizontal rule
      const hr = document.createElement('hr');
      hr.style.cssText = `
        border: none !important;
        border-top: 1px solid #ddd !important;
        margin: 0 0 32px 0 !important;
      `;
      pdfWrapper.appendChild(hr);

      // Clone and add article content
      const articleClone = articleElement.cloneNode(true);

      // Strip ALL inline styles from cloned elements to remove Substack's spacing
      articleClone.querySelectorAll('*').forEach(el => {
        el.removeAttribute('style');
        // Also remove classes that might have problematic CSS
        // Keep semantic classes but remove layout-specific ones
        const classAttr = el.getAttribute('class');
        if (classAttr) {
          // Keep the class for now but CSS will override
        }
      });

      // Set a class for styling and reset article wrapper styles
      articleClone.className = 'pagecub-article-content';
      articleClone.style.cssText = `
        max-width: 100% !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        display: block !important;
      `;

      // Remove unwanted elements from the clone
      const removeSelectors = [
        '.share-buttons',
        '.social-share',
        '[class*="subscribe"]',
        '[class*="Subscribe"]',
        '[class*="engagement"]',
        '[class*="action-bar"]',
        '[class*="comments"]',
        '[class*="footer"]',
        '[class*="header"]:not(h1):not(h2):not(h3)',
        'button',
        '[role="button"]',
        'iframe:not([src*="youtube"]):not([src*="vimeo"])',
        'svg:not(img svg)',  // Remove standalone SVGs (icons) but keep those in images
        '[class*="icon"]',
        '[class*="Icon"]',
      ];

      removeSelectors.forEach(selector => {
        try {
          articleClone.querySelectorAll(selector).forEach(el => el.remove());
        } catch (e) {}
      });

      pdfWrapper.appendChild(articleClone);

      // =========================================================================
      // STEP 5: APPLY TO PAGE
      // =========================================================================

      // Hide all original body content
      Array.from(document.body.children).forEach(child => {
        if (child.id !== 'pagecub-pdf-wrapper') {
          child.setAttribute('data-pagecub-original-display', child.style.display || '');
          child.style.display = 'none';
        }
      });

      // Add the clean wrapper to body
      document.body.appendChild(pdfWrapper);

      // Add cleanup CSS for PDF rendering with clean typography
      const cleanupStyle = document.createElement('style');
      cleanupStyle.id = 'pagecub-cleanup-style';
      cleanupStyle.textContent = `
        /* Reset document */
        html, body {
          overflow: visible !important;
          height: auto !important;
          min-height: 100% !important;
          background: white !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* Main wrapper */
        #pagecub-pdf-wrapper {
          page-break-inside: auto !important;
        }

        /* Global resets for all cloned content */
        #pagecub-pdf-wrapper * {
          box-shadow: none !important;
          text-shadow: none !important;
          max-width: 100% !important;
          float: none !important;
          position: static !important;
        }

        /* Reset all divs inside article to remove Substack layout spacing */
        #pagecub-pdf-wrapper .pagecub-article-content,
        #pagecub-pdf-wrapper .pagecub-article-content > * {
          display: block !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* Typography: Paragraphs */
        #pagecub-pdf-wrapper p {
          display: block !important;
          margin: 0 0 1em 0 !important;
          padding: 0 !important;
          line-height: 1.6 !important;
          orphans: 3 !important;
          widows: 3 !important;
        }

        /* Typography: Headings */
        #pagecub-pdf-wrapper h1 {
          font-size: 28px !important;
          font-weight: bold !important;
          margin: 1.5em 0 0.5em 0 !important;
          padding: 0 !important;
          line-height: 1.2 !important;
          page-break-after: avoid !important;
        }
        #pagecub-pdf-wrapper h2 {
          font-size: 22px !important;
          font-weight: bold !important;
          margin: 1.5em 0 0.5em 0 !important;
          padding: 0 !important;
          line-height: 1.3 !important;
          page-break-after: avoid !important;
        }
        #pagecub-pdf-wrapper h3 {
          font-size: 18px !important;
          font-weight: bold !important;
          margin: 1.2em 0 0.5em 0 !important;
          padding: 0 !important;
          line-height: 1.3 !important;
          page-break-after: avoid !important;
        }

        /* Typography: Lists - FIX for bullet point spacing */
        #pagecub-pdf-wrapper ul,
        #pagecub-pdf-wrapper ol {
          display: block !important;
          margin: 1em 0 !important;
          padding: 0 0 0 2em !important;
          list-style-position: outside !important;
        }
        #pagecub-pdf-wrapper ul {
          list-style-type: disc !important;
        }
        #pagecub-pdf-wrapper ol {
          list-style-type: decimal !important;
        }
        #pagecub-pdf-wrapper li {
          display: list-item !important;
          margin: 0 0 0.5em 0 !important;
          padding: 0 !important;
          line-height: 1.5 !important;
        }
        #pagecub-pdf-wrapper li > p {
          margin: 0 !important;
          display: inline !important;
        }

        /* Typography: Blockquotes */
        #pagecub-pdf-wrapper blockquote {
          display: block !important;
          margin: 1em 0 !important;
          padding: 0.5em 0 0.5em 1.5em !important;
          border-left: 3px solid #ccc !important;
          font-style: italic !important;
          page-break-inside: avoid !important;
        }

        /* Typography: Code blocks */
        #pagecub-pdf-wrapper pre {
          display: block !important;
          margin: 1em 0 !important;
          padding: 1em !important;
          background: #f5f5f5 !important;
          border-radius: 4px !important;
          overflow-x: auto !important;
          font-family: monospace !important;
          font-size: 14px !important;
          line-height: 1.4 !important;
          page-break-inside: avoid !important;
        }
        #pagecub-pdf-wrapper code {
          font-family: monospace !important;
          font-size: 14px !important;
          background: #f0f0f0 !important;
          padding: 0.1em 0.3em !important;
          border-radius: 2px !important;
        }
        #pagecub-pdf-wrapper pre code {
          background: none !important;
          padding: 0 !important;
        }

        /* Images */
        #pagecub-pdf-wrapper img {
          display: block !important;
          max-width: 100% !important;
          height: auto !important;
          margin: 1em auto !important;
          page-break-inside: avoid !important;
        }

        /* Links */
        #pagecub-pdf-wrapper a {
          color: #0066cc !important;
          text-decoration: underline !important;
        }

        /* Horizontal rules */
        #pagecub-pdf-wrapper hr {
          display: block !important;
          margin: 2em 0 !important;
          padding: 0 !important;
          border: none !important;
          border-top: 1px solid #ddd !important;
        }

        /* Hide any remaining Substack UI elements */
        #pagecub-pdf-wrapper [class*="button"],
        #pagecub-pdf-wrapper [class*="Button"],
        #pagecub-pdf-wrapper [class*="cta"],
        #pagecub-pdf-wrapper [class*="CTA"] {
          display: none !important;
        }
      `;
      document.head.appendChild(cleanupStyle);

      console.log('📄 PageCub: Clean PDF container ready');
    } else {
      // Fallback: just inject basic cleanup CSS
      console.log('📄 PageCub: Article not found, using fallback cleanup');

      const fallbackStyle = document.createElement('style');
      fallbackStyle.id = 'pagecub-fallback-style';
      fallbackStyle.textContent = `
        *, *::before, *::after {
          box-shadow: none !important;
          text-shadow: none !important;
        }
        nav, header, footer, aside,
        [role="navigation"],
        [class*="sidebar"],
        [class*="footer"],
        [class*="header"]:not(article header) {
          display: none !important;
        }
      `;
      document.head.appendChild(fallbackStyle);
    }

    console.log('📄 PageCub: Page preparation complete');
    resolve();
  });
}

// Sanitize filename for PDF
function sanitizeFilename(title) {
  return title
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100)
    .toLowerCase() || 'page';
}

// === SECTION 7: Auth Token Handler (FIXED - Proper Cookie Parsing) ===

async function handleGetAuthToken(sendResponse) {
  console.log('🔧 Background: Getting auth token from ThreadCub tab via localStorage...');
  
  try {
    // Find ThreadCub tab
    const tabs = await chrome.tabs.query({ url: "*://threadcub.com/*" });
    
    if (tabs.length === 0) {
      console.log('🔧 Background: No ThreadCub tab found');
      sendResponse({ success: false, error: 'No ThreadCub tab open - make sure you have ThreadCub open' });
      return;
    }
    
    console.log('🔧 Background: Found ThreadCub tab, extracting auth token from localStorage...');
    
    // Execute script in ThreadCub tab to get auth token from localStorage
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: extractSupabaseAuthToken
    });
    
    if (results && results[0] && results[0].result) {
      const { success, authToken, error } = results[0].result;
      
      if (success && authToken) {
        console.log('🔧 Background: ✅ Auth token extracted successfully!');
        sendResponse({ success: true, authToken: authToken });
      } else {
        console.log('🔧 Background: ❌ Failed to extract auth token:', error);
        sendResponse({ success: false, error: error || 'No auth token found' });
      }
    } else {
      console.log('🔧 Background: ❌ Script execution failed');
      sendResponse({ success: false, error: 'Failed to execute auth extraction script' });
    }
    
  } catch (error) {
    console.error('🔧 Background: Error in handleGetAuthToken:', error);
    sendResponse({ 
      success: false, 
      error: `Error extracting auth token: ${error.message}` 
    });
  }
}

// This function runs in the context of the ThreadCub dashboard tab
function extractSupabaseAuthToken() {
  try {
    console.log('🔧 Dashboard: Extracting Supabase auth token...');
    
    // Method 1: Try to get session from Supabase client directly
    if (typeof window !== 'undefined') {
      // Check if Supabase client is available globally
      if (window.supabase && window.supabase.auth) {
        try {
          // Try to get the current session
          window.supabase.auth.getSession().then(({ data, error }) => {
            if (data.session && data.session.access_token) {
              console.log('🔧 Dashboard: Found token via Supabase client');
              return { success: true, authToken: data.session.access_token };
            }
          });
        } catch (e) {
          console.log('🔧 Dashboard: Supabase client method failed:', e);
        }
      }
    }
    
    // Method 2: Search localStorage for Supabase auth data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      // Look for Supabase auth keys (common patterns)
      if (key && (key.includes('supabase.auth.token') || key.startsWith('sb-') || key.includes('-auth-token'))) {
        console.log('🔧 Dashboard: Found potential auth key:', key);
        
        try {
          const authData = localStorage.getItem(key);
          if (authData) {
            // Try to parse as JSON
            const parsed = JSON.parse(authData);
            
            // Check for access_token in various formats
            if (parsed.access_token) {
              console.log('🔧 Dashboard: Found access_token in localStorage');
              return { success: true, authToken: parsed.access_token };
            }
            
            // Check if it's an array with access token as first element
            if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
              console.log('🔧 Dashboard: Found token in array format');
              return { success: true, authToken: parsed[0] };
            }
            
            // Check for nested session data
            if (parsed.session && parsed.session.access_token) {
              console.log('🔧 Dashboard: Found token in session object');
              return { success: true, authToken: parsed.session.access_token };
            }
          }
        } catch (parseError) {
          console.log('🔧 Dashboard: Failed to parse auth data for key:', key, parseError);
          continue;
        }
      }
    }
    
    // Method 3: Try common Supabase localStorage key patterns
    const commonKeys = [
      'supabase.auth.token',
      'sb-localhost-auth-token',
      'sb-threadcub-auth-token',
      'sb-auth-token'
    ];
    
    for (const key of commonKeys) {
      const authData = localStorage.getItem(key);
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          if (parsed.access_token) {
            console.log('🔧 Dashboard: Found token with common key pattern:', key);
            return { success: true, authToken: parsed.access_token };
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    console.log('🔧 Dashboard: No auth token found in localStorage');
    return { success: false, error: 'No auth token found - make sure you are logged in to ThreadCub' };
    
  } catch (error) {
    console.error('🔧 Dashboard: Error extracting auth token:', error);
    return { success: false, error: `Error: ${error.message}` };
  }
}