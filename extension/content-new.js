// Socio.io Content Moderation - Content Script (Simplified Version)
// This script runs on all web pages and moderates content

// Configuration
const API_BASE_URL = 'https://socio-backend-zxxd.onrender.com'; // Cloud backend URL
const BATCH_SIZE = 50; // Process more elements at once
const DEBOUNCE_DELAY = 100; // Reduce debounce delay for faster response
const BACKEND_CHECK_INTERVAL = 5000; // Check backend status every 5 seconds
const EXCLUSION_CLASS = 'socio-excluded'; // Class to mark processed elements

// Example of a safer approach to DOM manipulation
function safelyAddClass(element, className) {
    if (element && element.classList) {
        element.classList.add(className);
        return true;
    }
    return false;
}

function safelyRemoveClass(element, className) {
    if (element && element.classList) {
        element.classList.remove(className);
        return true;
    }
    return false;
}

// Safe way to add a class to an element
function safeAddClass(element, className) {
    if (element && element.classList) {
        element.classList.add(className);
        return true;
    }
    return false;
}

// Selectors for text elements to moderate
const TEXT_SELECTORS = 'p, h1, h2, h3, h4, h5, h6, span, div:not(:has(*)), a, li, td, th, blockquote, pre, code';

// Selectors for image elements to moderate
const IMAGE_SELECTORS = 'img';

// State variables
let isEnabled = true;
let backendRunning = true; // Always assume backend is running
let textElementsProcessed = new Set();
let imageElementsProcessed = new Set();
let backendCheckTimer = null;

// Debug logging
function debug(message, obj = null) {
    const timestamp = new Date().toISOString();
    if (obj) {
        console.log(`[Socio.io ${timestamp}]`, message, obj);
    } else {
        console.log(`[Socio.io ${timestamp}]`, message);
    }
}

// Initialize the extension
function initialize() {
    debug("Initializing Socio.io content moderation");
    
    try {
        // Always assume enabled for testing
        isEnabled = true;
        backendRunning = true;
        
        // Add styles for tooltips and overlays
        injectStyles();
        
        // Set up message listener
        setupMessageListener();
        
        // Start the content moderation
        setupObserver();
        
        // Tell background script we're active and check backend status
        notifyBackgroundScript();
        
        // Set up periodic backend status check
        setupBackendStatusCheck();
        
        // Reset processed sets periodically
        resetProcessedSets();
        
        // Set up mutation observer to detect new images
        setupImageMutationObserver();
        
        // Check if we should be enabled (and wait for this before proceeding)
        chrome.storage.local.get(['enabled'], function(result) {
            try {
                isEnabled = result.enabled !== false;  // Default to true if not set
                debug("Protection enabled:", isEnabled);
                
                // Only proceed with content filtering if enabled
                if (isEnabled) {
                    // Immediately blur all images on the page for faster response
                    setTimeout(() => {
                        debug("Applying immediate blur to all images");
                        applyImmediateBlurToAllImages();
                        
                        // Scan the page immediately for existing content
                        debug("Performing initial page scan");
                        scanContentForModeration();
                        
                        // Set up a periodic scan to catch any missed content
                        window.socioIntervalScan = setInterval(() => {
                            if (isEnabled) {
                                debug("Performing periodic scan");
                                scanContentForModeration();
                            }
                        }, 3000); // Scan every 3 seconds
                        
                        // Set up a more frequent scan for images only
                        window.socioIntervalImageScan = setInterval(() => {
                            if (isEnabled) {
                                debug("Performing image-only scan");
                                scanImagesForModeration();
                            }
                        }, 1000); // Scan for images every second
                    }, 500); // Small delay to ensure DOM is ready
                } else {
                    debug("Protection is disabled. No content filtering will be performed.");
                }
            } catch (innerError) {
                console.error("Error getting enabled state:", innerError);
                // Default to enabled
                isEnabled = true;
            }
        });
        
    } catch (error) {
        console.error("Error during extension initialization:", error);
        // Try to continue with basic functionality
        try {
            setupObserver();
            applyImmediateBlurToAllImages();
        } catch (e) {
            console.error("Fatal error in extension initialization:", e);
        }
    }
}

// Set up message listener
function setupMessageListener() {
    debug("Setting up message listener");
    
    // Listen for messages from popup or background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        try {
            debug("Received message:", message);
            
            switch (message.action) {
                case 'toggleProtection':
                case 'setEnabled':
                    const previousState = isEnabled;
                    isEnabled = message.enabled;
                    debug("Protection toggled from", previousState, "to:", isEnabled);
                    
                    if (isEnabled && !previousState) {
                        // Protection was turned on
                        debug("Protection turned ON - starting content moderation");
                        
                        // Start the intervals if they don't exist
                        if (!window.socioIntervalScan) {
                            window.socioIntervalScan = setInterval(() => {
                                if (isEnabled) {
                                    debug("Performing periodic scan");
                                    scanContentForModeration();
                                }
                            }, 3000);
                        }
                        
                        if (!window.socioIntervalImageScan) {
                            window.socioIntervalImageScan = setInterval(() => {
                                if (isEnabled) {
                                    debug("Performing image-only scan");
                                    scanImagesForModeration();
                                }
                            }, 1000);
                        }
                        
                        // Perform an immediate scan
                        scanContentForModeration();
                    } else if (!isEnabled && previousState) {
                        // Protection was turned off
                        debug("Protection turned OFF - stopping content moderation and restoring content");
                        
                        // Clear the intervals
                        if (window.socioIntervalScan) {
                            clearInterval(window.socioIntervalScan);
                            window.socioIntervalScan = null;
                        }
                        
                        if (window.socioIntervalImageScan) {
                            clearInterval(window.socioIntervalImageScan);
                            window.socioIntervalImageScan = null;
                        }
                        
                        // Restore all original content
                        restoreOriginalContent();
                    }
                    
                    // Save the state to storage
                    chrome.storage.local.set({ enabled: isEnabled });
                    
                    sendResponse({status: "Protection toggled", enabled: isEnabled});
                    break;
                
                case 'getEncryptedContent':
                    // Find all encrypted content on the page
                    const encryptedContent = Array.from(document.querySelectorAll('.socioio-encrypted'))
                        .map(el => el.textContent)
                        .join('\n');
                    
                    debug("Found encrypted content:", encryptedContent);    
                    sendResponse({ encryptedContent });
                    break;
                
                case 'applyRecoveredContent':
                    applyRecoveredContent(message.recoveredText);
                    sendResponse({status: "Content recovered"});
                    break;
                
                case 'checkStatus':
                    debug("Status check requested");
                    sendResponse({
                        status: "Content script active",
                        isEnabled: isEnabled,
                        backendRunning: backendRunning,
                        elementsScanned: textElementsProcessed.size + imageElementsProcessed.size,
                        queueLength: processingQueue.length
                    });
                    break;
                
                case 'backendStatusChanged':
                    debug("Backend status changed:", message.running);
                    backendRunning = message.running;
                    
                    // If backend is now running and we're enabled, start scanning
                    if (backendRunning && isEnabled) {
                        scanContentForModeration();
                    }
                    
                    sendResponse({status: "Backend status updated"});
                    break;
                
                default:
                    debug("Unknown message action:", message.action);
                    sendResponse({status: "Unknown action"});
                    break;
            }
            
            return true;  // Indicates async response
        } catch (messageError) {
            console.error("Error handling message:", messageError);
            // If we get an extension context invalidated error, we can't do anything
            if (messageError.message && messageError.message.includes("Extension context invalidated")) {
                console.log("Extension context was invalidated. Please refresh the page.");
            }
            sendResponse({error: "Error processing message", message: messageError.message});
            return true;
        }
    });
    
    debug("Message listener set up successfully");
}

// Set up periodic backend status check
function setupBackendStatusCheck() {
    // Clear any existing timer
    if (backendCheckTimer) {
        clearInterval(backendCheckTimer);
    }
    
    // Check backend status immediately
    checkBackendStatus();
    
    // Set up periodic check
    backendCheckTimer = setInterval(checkBackendStatus, BACKEND_CHECK_INTERVAL);
}

// Check backend status
function checkBackendStatus() {
    // Always assume backend is running for testing purposes
    // This ensures content filtering works even if backend is down
    backendRunning = true;
    
    try {
        // First try a direct ping to the backend using the simple ping endpoint
        fetch(`${API_BASE_URL}/ping`)
            .then(response => response.json())
            .then(data => {
                debug("Backend connection test successful:", data);
                backendRunning = true;
                
                // Notify background script that backend is running
                try {
                    chrome.runtime.sendMessage({
                        action: "backendStatus", 
                        status: true
                    });
                } catch (e) {
                    debug("Error sending backend status to background:", e);
                }
                
                // If we're enabled and not currently scanning, start scanning
                if (isEnabled) {
                    // Always scan for images when backend is confirmed running
                    scanImagesForModeration();
                    
                    // Also do a full scan if queue is empty
                    if (processingQueue.length === 0) {
                        scanContentForModeration();
                    }
                }
            })
            .catch(error => {
                debug("Backend connection test failed:", error);
                // Keep backendRunning true for testing
                
                try {
                    // Notify background script about backend connection issue
                    chrome.runtime.sendMessage({action: "backendConnectionIssue"}, function(response) {
                        if (chrome.runtime.lastError) {
                            debug("Error sending message to background:", chrome.runtime.lastError);
                            return;
                        }
                        debug("Backend connection issue notification response:", response);
                    });
                } catch (msgError) {
                    debug("Failed to send message to background script:", msgError);
                    // If extension context is invalidated, we can't do anything
                    if (msgError.message && msgError.message.includes("Extension context invalidated")) {
                        console.log("Extension context was invalidated. Please refresh the page.");
                    }
                }
                
                // Even if backend is down, still scan for client-side filtering
                if (isEnabled) {
                    scanImagesForModeration();
                }
            });
    } catch (fetchError) {
        debug("Error during backend status check:", fetchError);
        // Keep backendRunning true for testing
        
        // Even if backend check fails, still scan for client-side filtering
        if (isEnabled) {
            scanImagesForModeration();
        }
    }
}

// Notify the background script that we're active
function notifyBackgroundScript() {
    chrome.runtime.sendMessage({
        action: 'contentScriptActive',
        url: window.location.href
    }, function(response) {
        if (chrome.runtime.lastError) {
            debug("Error notifying background script:", chrome.runtime.lastError);
        } else {
            debug("Background script notified:", response);
            
            // Update backend status from response
            if (response && response.backendRunning !== undefined) {
                backendRunning = response.backendRunning;
                debug("Backend status from background:", backendRunning);
                
                // If backend is running and we're enabled, start scanning
                if (backendRunning && isEnabled) {
                    scanContentForModeration();
                }
            }
        }
    });
}

// Set up mutation observer to detect new content
function setupObserver() {
    debug("Setting up mutation observer");
    
    // Create an observer instance with improved handling
    const observer = new MutationObserver((mutations) => {
        if (!isEnabled) return;
        
        let hasNewImages = false;
        let hasNewText = false;
        
        // Check what types of content were added
        for (const mutation of mutations) {
            // Check for added nodes
            if (mutation.addedNodes && mutation.addedNodes.length) {
                for (const node of mutation.addedNodes) {
                    // Check if this is an element node
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if this is an image
                        if (node.tagName === 'IMG') {
                            hasNewImages = true;
                        }
                        
                        // Check if this node contains images
                        if (node.querySelectorAll) {
                            const images = node.querySelectorAll('img');
                            if (images.length > 0) {
                                hasNewImages = true;
                            }
                            
                            // Check for text elements
                            const textElements = node.querySelectorAll(TEXT_SELECTORS);
                            if (textElements.length > 0) {
                                hasNewText = true;
                            }
                        }
                    }
                }
            }
            
            // Check for attribute changes on images (src changes)
            if (mutation.type === 'attributes' && 
                mutation.target.tagName === 'IMG' && 
                mutation.attributeName === 'src') {
                hasNewImages = true;
            }
        }
        
        // Process immediately if we have new images
        if (hasNewImages) {
            debug("New images detected, scanning immediately");
            // Process only images for immediate response
            scanImagesForModeration();
        }
        
        // Use debounce for text and general scanning
        if (hasNewText || mutations.length > 0) {
            debounce(() => {
                debug("DOM changed, scanning for all content");
                scanContentForModeration();
            }, DEBOUNCE_DELAY)();
        }
    });
    
    // Start observing with expanded options
    observer.observe(document.body, { 
        childList: true, 
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['src'] // Only care about src attribute changes
    });
    
    debug("Enhanced mutation observer set up");
    
    // Set up multiple handlers to catch all possible image loading scenarios
    
    // 1. Capture load events for images
    document.addEventListener('load', function(event) {
        if (event.target.tagName === 'IMG' && isEnabled) {
            debug("Image load event detected");
            processNewImage(event.target);
        }
    }, true); // Use capture to get the event before it reaches the target
    
    // 2. Watch for src attribute changes on images
    document.addEventListener('DOMAttrModified', function(event) {
        if (event.target.tagName === 'IMG' && event.attrName === 'src' && isEnabled) {
            debug("Image src attribute changed");
            processNewImage(event.target);
        }
    }, true);
    
    // 3. Set up a MutationObserver specifically for images
    const imageObserver = new MutationObserver(function(mutations) {
        if (!isEnabled) return;
        
        for (const mutation of mutations) {
            // Check for new nodes
            if (mutation.type === 'childList') {
                for (const node of mutation.addedNodes) {
                    // If it's an image, process it
                    if (node.tagName === 'IMG') {
                        debug("New image added to DOM");
                        processNewImage(node);
                    }
                    
                    // Also check for images inside the added node
                    if (node.nodeType === 1) { // Element node
                        const images = node.querySelectorAll('img');
                        for (const img of images) {
                            debug("Found image inside new DOM node");
                            processNewImage(img);
                        }
                    }
                }
            }
            
            // Check for attribute changes
            if (mutation.type === 'attributes' && 
                mutation.attributeName === 'src' && 
                mutation.target.tagName === 'IMG') {
                debug("Image src attribute changed via mutation");
                processNewImage(mutation.target);
            }
        }
    });
    
    // Start observing with expanded options
    imageObserver.observe(document.body, { 
        childList: true, 
        subtree: true,
        attributes: true,
        attributeFilter: ['src']
    });
    
    debug("Image load event listener added");
}

// Debounce function to prevent too many scans
function debounce(func, wait) {
    let timeout;
    return function() {
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Apply immediate blur to all images on the page
function applyImmediateBlurToAllImages() {
    try {
        // Find all images on the page
        const images = document.querySelectorAll('img');
        debug(`Found ${images.length} images for immediate processing`);
        
        let blurredCount = 0;
        const batchSize = 10; // Process 10 images at a time
        
        // Function to process a batch of images
        function processImageBatch(startIndex) {
            const endIndex = Math.min(startIndex + batchSize, images.length);
            let batchBlurredCount = 0;
            
            for (let i = startIndex; i < endIndex; i++) {
                const img = images[i];
                
                try {
                    // Skip very small images
                    if (img.naturalWidth < 50 || img.naturalHeight < 50) {
                        continue;
                    }
                    
                    // Skip images from known safe sources
                    const safeImageSources = [
                        'wikipedia.org', 
                        'wikimedia.org',
                        'github.com',
                        'googleusercontent.com/a/',
                        'gravatar.com'
                    ];
                    
                    const src = img.src.toLowerCase();
                    const isFromSafeSource = safeImageSources.some(source => src.includes(source));
                    
                    if (isFromSafeSource) {
                        continue;
                    }
                    
                    // Always blur images for testing purposes (100% chance)
                    debug("Applying immediate blur to image:", img.src);
                    img.style.filter = "blur(20px)";
                    img.style.border = "3px solid red";
                    
                    // Mark as filtered
                    img.setAttribute('data-socioio-filtered', 'true');
                    img.classList.add(EXCLUSION_CLASS);
                    imageElementsProcessed.add(img);
                    
                    // Add overlay with warning and button
                    addOverlayToImage(img);
                    
                    batchBlurredCount++;
                } catch (imgError) {
                    debug("Error processing image in batch:", imgError);
                }
            }
            
            blurredCount += batchBlurredCount;
            
            // Update stats for this batch
            if (batchBlurredCount > 0) {
                try {
                    chrome.runtime.sendMessage({
                        action: 'updateStats',
                        type: 'images',
                        count: batchBlurredCount
                    }, function(response) {
                        debug("Stats update response for batch:", response);
                    });
                } catch (e) {
                    debug("Error updating stats for batch:", e);
                    
                    // Try direct storage update as fallback
                    try {
                        chrome.storage.local.get(['imagesFiltered'], function(result) {
                            const current = parseInt(result.imagesFiltered) || 0;
                            chrome.storage.local.set({ 'imagesFiltered': current + batchBlurredCount });
                        });
                    } catch (storageError) {
                        debug("Error updating storage for batch:", storageError);
                    }
                }
            }
            
            // If there are more images to process, schedule the next batch
            if (endIndex < images.length) {
                setTimeout(() => {
                    processImageBatch(endIndex);
                }, 50); // Small delay between batches
            } else {
                debug(`Finished processing all batches. Total blurred: ${blurredCount} images`);
            }
        }
        
        // Start processing the first batch
        processImageBatch(0);
        
    } catch (error) {
        debug("Error in applyImmediateBlurToAllImages:", error);
    }
}

// Process a newly loaded image immediately with aggressive filtering
function processNewImage(imageElement) {
    try {
        if (!isEnabled) return;
        
        // Skip if already processed
        if (imageElement.classList.contains(EXCLUSION_CLASS) || 
            imageElementsProcessed.has(imageElement)) {
            return;
        }
        
        debug("Processing newly loaded image:", imageElement.src);
        
        // Skip images without a source
        if (!imageElement.src) return;
        
        // Mark as processed
        imageElementsProcessed.add(imageElement);
        imageElement.classList.add(EXCLUSION_CLASS);
        
        // Apply immediate blur to all images (we'll remove it later if needed)
        // This ensures images are blurred as soon as they appear
        applyImmediateImageBlur(imageElement);
        
        // Process immediately without adding to queue
        processElement({
            type: 'image',
            element: imageElement
        }).then(result => {
            debug("Immediate image processing result:", result);
        }).catch(error => {
            debug("Error in immediate image processing:", error);
        });
    } catch (error) {
        debug("Error processing new image:", error);
    }
}

// Apply immediate blur to images for faster response
function applyImmediateImageBlur(imageElement) {
    try {
        // Skip very small images
        if (imageElement.naturalWidth < 50 || imageElement.naturalHeight < 50) {
            return;
        }
        
        // Skip images from known safe sources
        const safeImageSources = [
            'wikipedia.org', 
            'wikimedia.org',
            'github.com',
            'googleusercontent.com/a/',
            'gravatar.com'
        ];
        
        const src = imageElement.src.toLowerCase();
        const isFromSafeSource = safeImageSources.some(source => src.includes(source));
        
        if (isFromSafeSource) {
            return;
        }
        
        // Always blur images for testing purposes (100% chance)
        debug("Applying immediate blur to image:", imageElement.src);
        imageElement.style.filter = "blur(20px)";
        imageElement.style.border = "3px solid red";
        
        // Mark as filtered
        imageElement.setAttribute('data-socioio-filtered', 'true');
        
        // Update stats
        try {
            chrome.runtime.sendMessage({
                action: 'updateStats',
                type: 'images',
                count: 1
            }, function(response) {
                debug("Stats update response:", response);
            });
        } catch (e) {
            debug("Error updating stats:", e);
            
            // Try direct storage update as fallback
            try {
                chrome.storage.local.get(['imagesFiltered'], function(result) {
                    const current = parseInt(result.imagesFiltered) || 0;
                    chrome.storage.local.set({ 'imagesFiltered': current + 1 });
                });
            } catch (storageError) {
                debug("Error updating storage:", storageError);
            }
        }
    } catch (error) {
        debug("Error in immediate image blur:", error);
    }
}

// Process an image for moderation
function processImage(img) {
    // Skip if null or already processed
    if (!img || (img.classList && img.classList.contains(EXCLUSION_CLASS))) {
        return;
    }
    
    // Mark as being processed to prevent duplicate processing
    if (img.classList) {
        img.classList.add(EXCLUSION_CLASS);
    }
    
    // Get image URL
    const imageUrl = img.src;
    if (!imageUrl || imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
        // Skip data URLs and blob URLs
        return;
    }
    
    // Check if this is a small icon or avatar (skip very small images)
    if (img.width < 50 || img.height < 50) {
        return;
    }
    
    // Skip images from known safe sources
    const safeImageSources = [
        'wikipedia.org', 
        'wikimedia.org',
        'github.com',
        'googleusercontent.com/a/',
        'gravatar.com'
    ];
    
    const src = imageUrl.toLowerCase();
    const isFromSafeSource = safeImageSources.some(source => src.includes(source));
    
    if (isFromSafeSource) {
        return;
    }
    
    // Always blur images for testing purposes
    debug("Applying blur to image:", imageUrl);
    img.style.filter = "blur(20px)";
    img.style.border = "3px solid red";
    img.style.position = "relative"; // Ensure position is set for overlay
    
    // Mark as filtered
    img.setAttribute('data-socioio-filtered', 'true');
    
    // Create overlay with warning and button
    addOverlayToImage(img);
    
    // Make sure to increment the counter for filtered images
    try {
        chrome.runtime.sendMessage({
            action: 'updateStats',
            type: 'images',
            count: 1
        }, function(response) {
            debug("Stats update response:", response);
        });
    } catch (e) {
        debug("Error updating stats:", e);
        
        // Try direct storage update as fallback
        chrome.storage.local.get(['imagesFiltered'], function(result) {
            const count = (result.imagesFiltered || 0) + 1;
            chrome.storage.local.set({ 'imagesFiltered': count });
        });
    }
}

// Add overlay with warning and button to a filtered image
function addOverlayToImage(img) {
    try {
        // Skip if image is null or doesn't have a parent
        if (!img || !img.parentNode) {
            return;
        }
        
        // Check if overlay already exists
        const existingOverlay = img.parentNode.querySelector('.socioio-overlay');
        if (existingOverlay) {
            return; // Overlay already exists
        }
        
        // Get image dimensions and position
        const rect = img.getBoundingClientRect();
        const imgWidth = img.width || rect.width;
        const imgHeight = img.height || rect.height;
        
        // Skip if image is too small
        if (imgWidth < 100 || imgHeight < 100) {
            return;
        }
        
        // Create a simpler overlay approach that works more reliably
        const overlay = document.createElement('div');
        overlay.className = 'socioio-overlay';
        
        // Create warning text
        const warning = document.createElement('div');
        warning.className = 'socioio-warning';
        warning.textContent = 'This image has been blurred by Socio.io';
        
        // Create show button
        const button = document.createElement('button');
        button.className = 'socioio-show-button';
        button.textContent = 'Show Image';
        
        // Add button event listener
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            
            // Unblur the image
            img.style.filter = 'none';
            
            // Hide the overlay
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            
            // Add a small indicator that the image was previously filtered
            const indicator = document.createElement('div');
            indicator.className = 'socioio-viewed-indicator';
            indicator.textContent = 'Filtered by Socio.io';
            
            // Position the indicator
            if (img.parentNode) {
                img.parentNode.style.position = 'relative';
                img.parentNode.appendChild(indicator);
            }
            
            return false;
        });
        
        // Assemble overlay
        overlay.appendChild(warning);
        overlay.appendChild(button);
        
        // Position the overlay
        const container = document.createElement('div');
        container.className = 'socioio-image-container';
        container.style.position = 'relative';
        container.style.display = 'inline-block';
        container.style.width = imgWidth + 'px';
        container.style.height = imgHeight + 'px';
        
        // Insert the container before the image
        img.parentNode.insertBefore(container, img);
        
        // Move the image into the container
        container.appendChild(img);
        
        // Add the overlay to the container
        container.appendChild(overlay);
        
        // Make sure the image is positioned correctly
        img.style.position = 'relative';
        img.style.zIndex = '1';
        
        debug("Added overlay to image successfully");
    } catch (error) {
        debug("Error adding overlay to image:", error);
        
        // Fallback to simple blur without overlay
        try {
            img.style.filter = 'blur(20px)';
            img.style.border = '3px solid red';
        } catch (fallbackError) {
            debug("Error applying fallback blur:", fallbackError);
        }
    }
}

// Scan only images for moderation (for faster response)
function scanImagesForModeration() {
    debug("Scanning images for moderation");
    
    try {
        if (!isEnabled) return;
        
        // Get all images on the page that haven't been processed yet
        const images = document.querySelectorAll('img:not(.' + EXCLUSION_CLASS + ')');
        
        debug(`Found ${images.length} images to scan`);
        
        // Process images in smaller batches to avoid overloading the browser
        const batchSize = 5; // Process 5 images at a time
        let processedCount = 0;
        
        // Function to process a batch of images
        function processBatch(startIndex) {
            const endIndex = Math.min(startIndex + batchSize, images.length);
            
            for (let i = startIndex; i < endIndex; i++) {
                const img = images[i];
                
                // Check if image exists and has loaded
                if (img && img.complete && img.naturalWidth > 0) {
                    // Check if this image has already been processed
                    if (!imageElementsProcessed.has(img)) {
                        try {
                            processImage(img);
                            // Add to processed set
                            imageElementsProcessed.add(img);
                            processedCount++;
                        } catch (error) {
                            debug("Error processing image:", error);
                        }
                    }
                }
            }
            
            // If there are more images to process, schedule the next batch
            if (endIndex < images.length) {
                setTimeout(() => {
                    processBatch(endIndex);
                }, 100); // Small delay between batches
            } else {
                debug(`Processed ${processedCount} images in batches`);
                
                // Also add to processing queue for backend processing if needed
                addImagesToProcessingQueue(images);
            }
        }
        
        // Start processing the first batch
        processBatch(0);
        
    } catch (scanError) {
        console.error("[Socio.io " + new Date().toISOString() + "] Error during image scan:", scanError);
    }
}

// Add images to the processing queue for backend processing
function addImagesToProcessingQueue(images) {
    try {
        let imagesAdded = 0;
        
        for (const element of images) {
            try {
                // Skip images without a source
                if (!element.src) continue;
                
                // Skip elements that have already been processed by the queue
                if (element.classList.contains(EXCLUSION_CLASS)) continue;
                
                // Add to processing queue if it exists
                if (typeof processingQueue !== 'undefined') {
                    processingQueue.push({
                        type: 'image',
                        element: element
                    });
                }
                
                // Mark as processed
                element.classList.add(EXCLUSION_CLASS);
                imagesAdded++;
            } catch (imageError) {
                debug("Error adding image to processing queue:", imageError);
                // Continue with the next element
            }
        }
        
        debug(`Added ${imagesAdded} images to processing queue`);
        
        // Process the queue immediately if we have images
        if (imagesAdded > 0 && typeof processNextBatch === 'function') {
            processNextBatch();
        }
    } catch (error) {
        debug("Error in addImagesToProcessingQueue:", error);
    }
}

// Scan the page for all content that needs moderation
function scanContentForModeration() {
    try {
        if (!isEnabled) return;
        if (!backendRunning) {
            debug("Backend not running, skipping content scan");
            return;
        }
        
        debug("Scanning page for all content moderation");
        
        // Find all text elements that haven't been processed
        const textElements = document.querySelectorAll(TEXT_SELECTORS + ':not(.' + EXCLUSION_CLASS + ')');
        debug(`Found ${textElements.length} unprocessed text elements`);
        
        for (const element of textElements) {
            try {
                // Skip empty elements or those with only whitespace
                if (!element.textContent.trim()) continue;
                
                // Skip elements that have already been processed
                if (textElementsProcessed.has(element)) continue;
                
                // Add to processing queue
                processingQueue.push({
                    type: 'text',
                    element: element
                });
                
                // Mark as processed
                textElementsProcessed.add(element);
                element.classList.add(EXCLUSION_CLASS);
            } catch (elementError) {
                debug("Error processing text element:", elementError);
                // Continue with the next element
            }
        }
        
        // Find all image elements that haven't been processed
        const imageElements = document.querySelectorAll(IMAGE_SELECTORS + ':not(.' + EXCLUSION_CLASS + ')');
        debug(`Found ${imageElements.length} unprocessed image elements`);
        
        for (const element of imageElements) {
            try {
                // Skip images without a source
                if (!element.src) continue;
                
                // Skip elements that have already been processed
                if (imageElementsProcessed.has(element)) continue;
                
                // Add to processing queue
                processingQueue.push({
                    type: 'image',
                    element: element
                });
                
                // Mark as processed
                imageElementsProcessed.add(element);
                element.classList.add(EXCLUSION_CLASS);
            } catch (imageError) {
                debug("Error processing image element:", imageError);
                // Continue with the next element
            }
        }
        
        debug(`Processing queue now has ${processingQueue.length} items`);
        
        // Process the queue
        if (processingQueue.length > 0) {
            processNextBatch();
        }
        
        // Store processed elements for persistence
        storeProcessedElements();
    } catch (scanError) {
        debug("Error during content scan:", scanError);
        // If extension context is invalidated, we can't do anything
        if (scanError.message && scanError.message.includes("Extension context invalidated")) {
            console.log("Extension context was invalidated. Please refresh the page.");
        }
    }
}

// Process the next batch of elements in the queue
function processNextBatch() {
    if (currentlyProcessing || processingQueue.length === 0 || !isEnabled) {
        debug(`Not processing batch: currentlyProcessing=${currentlyProcessing}, queueLength=${processingQueue.length}, isEnabled=${isEnabled}`);
        return;
    }
    
    currentlyProcessing = true;
    
    // Process a batch of elements
    const batch = processingQueue.splice(0, BATCH_SIZE);
    debug(`Processing batch of ${batch.length} elements`);
    
    // Count image elements in this batch for debugging
    const imageCount = batch.filter(item => item.type === 'image').length;
    debug(`Batch contains ${imageCount} image elements`);
    
    const promises = batch.map(processElement);
    
    // When all elements in the batch are processed
    Promise.allSettled(promises).then(results => {
        debug("Batch processing complete", results);
        
        // Count successful image filtrations - only count images that were actually filtered
        const successfulImageFilters = results.filter((result, index) => {
            return batch[index].type === 'image' && 
                   result.status === 'fulfilled' && 
                   result.value && 
                   result.value.status === 'filtered' &&
                   result.value.shouldFilter === true; // Only count if it should be filtered
        }).length;
        
        debug(`Successfully filtered ${successfulImageFilters} images in this batch`);
        
        currentlyProcessing = false;
        
        // If there are more elements in the queue, process the next batch after a delay
        if (processingQueue.length > 0) {
            debug(`Scheduling next batch of ${Math.min(BATCH_SIZE, processingQueue.length)} elements in ${BATCH_DELAY}ms`);
            setTimeout(processNextBatch, BATCH_DELAY);
        }
    });
}

// Process a single element
function processElement(item) {
    return new Promise((resolve, reject) => {
        try {
            debug(`Processing ${item.type} element`, item.element);
            if (item.type === 'text') {
                processTextElement(item.element)
                    .then(result => {
                        debug("Text processing complete", result);
                        resolve(result);
                    })
                    .catch(error => {
                        debug("Text processing error", error);
                        reject(error);
                    });
            } else if (item.type === 'image') {
                try {
                    // Make sure the image is fully loaded before processing
                    if (item.element.complete) {
                        // Image is already loaded, process it immediately
                        const result = processImageElement(item.element);
                        debug("Image processing complete", result);
                        
                        // Only count as filtered if the image was actually filtered
                        if (result && result.status === "filtered" && result.shouldFilter) {
                            debug("Image was filtered:", result.reasons);
                        } else {
                            debug("Image was not filtered or kept:", result);
                        }
                        
                        resolve(result);
                    } else {
                        // Wait for the image to load before processing
                        item.element.onload = function() {
                            try {
                                const result = processImageElement(item.element);
                                debug("Image processing complete (after load)", result);
                                
                                // Only count as filtered if the image was actually filtered
                                if (result && result.status === "filtered" && result.shouldFilter) {
                                    debug("Image was filtered after load:", result.reasons);
                                } else {
                                    debug("Image was not filtered or kept after load:", result);
                                }
                                
                                resolve(result);
                            } catch (loadError) {
                                debug("Image processing error after load", loadError);
                                reject(loadError);
                            }
                        };
                        
                        // Handle image load errors
                        item.element.onerror = function() {
                            debug("Image failed to load", item.element.src);
                            resolve({ status: "skipped", reason: "image_load_failed" });
                        };
                        
                        // Set a timeout in case the image takes too long to load
                        setTimeout(() => {
                            if (!item.element.complete) {
                                debug("Image load timeout", item.element.src);
                                resolve({ status: "skipped", reason: "image_load_timeout" });
                            }
                        }, 5000); // 5 second timeout
                    }
                } catch (error) {
                    debug("Image processing error", error);
                    reject(error);
                }
            } else {
                debug(`Unknown element type: ${item.type}`);
                resolve();
            }
        } catch (error) {
            debug('Error processing element:', error);
            resolve();  // Resolve anyway to continue with other elements
        }
    });
}

// Process a text element with client-side backup detection
async function processTextElement(element) {
    try {
        // Skip if the element has been removed from the DOM
        if (!element.isConnected) {
            debug("Element no longer connected to DOM");
            return { status: "skipped", reason: "element_not_connected" };
        }
        
        const text = element.textContent.trim();
        if (!text) {
            debug("Element has no text content");
            return { status: "skipped", reason: "no_text" };
        }
        
        // Skip very short text
        if (text.length < 5) {
            return { status: "skipped", reason: "text_too_short" };
        }
        
        debug(`Processing text: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
        
        // Create a unique identifier for this element
        const uniqueId = 'socioio-text-' + Math.random().toString(36).substr(2, 9);
        element.classList.add(uniqueId);
        
        // Client-side detection for backup - detect profanity and inappropriate content
        const lowerText = text.toLowerCase();
        
        // Expanded list of profanity words to catch more content
        const profanityWords = [
            "fuck", "fucker", "fucking", "shit", "ass", "asshole", 
            "bitch", "bastard", "cunt", "dick", "pussy", "cock", 
            "whore", "slut", "damn", "hell", "piss"
        ];
        
        // Add hate speech detection
        const hateWords = [
            "nigger", "nigga", "chink", "spic", "kike", "faggot", 
            "retard", "tranny", "nazi", "kill", "murder", "rape"
        ];
        
        // Check for exact word matches, not just substrings
        let isProfanity = profanityWords.some(word => {
            // Check for word boundaries to avoid false positives
            const regex = new RegExp(`\\b${word}\\b`, 'i');
            return regex.test(lowerText);
        });
        
        let isHateSpeech = hateWords.some(word => {
            // Check for word boundaries to avoid false positives
            const regex = new RegExp(`\\b${word}\\b`, 'i');
            return regex.test(lowerText);
        });
        
        // Add a chance of filtering for testing (5% - increased for better demo)
        let isRandomFilter = Math.random() < 0.05;
        
        // Don't filter very long paragraphs unless they contain hate speech
        if (text.length > 500 && !isHateSpeech) {
            isProfanity = false;
            isRandomFilter = false;
        }
        
        // Apply temporary styling if we suspect this might be filtered
        // This gives immediate feedback while we wait for the backend
        if (isProfanity || isHateSpeech) {
            element.style.backgroundColor = "rgba(255, 0, 0, 0.1)";
            element.style.transition = "all 0.3s ease";
        }
        
        // If we detect something locally, handle it (this is backup in case backend fails)
        if (isProfanity || isHateSpeech || isRandomFilter) {
            debug("Client-side detected problematic content");
            
            // Store the original text for recovery
            const originalText = text;
            
            // Create a more user-friendly filtered text display
            let filteredText;
            
            // Different filtering methods based on content length
            if (text.length < 30) {
                // For short text, use a generic message
                filteredText = "[Content filtered by Socio.io]";
            } else if (text.length < 100) {
                // For medium text, show beginning and end with filtered middle
                const start = text.substring(0, 10);
                const end = text.substring(text.length - 10);
                filteredText = `${start}... [Content filtered by Socio.io] ...${end}`;
            } else {
                // For long text, show a paragraph summary
                const firstSentence = text.split('.')[0];
                const preview = firstSentence.length > 50 ? firstSentence.substring(0, 50) + "..." : firstSentence;
                filteredText = `${preview}\n\n[Additional content filtered by Socio.io - Click the indicator to view]`;
            }
            
            // Apply the filtered text
            element.textContent = filteredText;
            
            // Add a special class to identify filtered elements
            element.classList.add('socioio-filtered-text');
            
            // Create reasons array
            const reasons = [
                isProfanity ? "Profanity detected" : "", 
                isHateSpeech ? "Hate speech detected" : "",
                isRandomFilter ? "Content filtered for testing" : ""
            ].filter(reason => reason);
                
            // Add visual indicator
            addModerationIndicator(element, "remove", reasons);
            
            // Save to filter history
            saveFilterHistory('text', text, reasons);
            
            // Update stats
            updateStats('text');
            
            return { status: "filtered", action: "remove", reasons: reasons };
        }
        
        // Try to send to backend for analysis
        try {
            debug("Sending text to backend");
            
            const response = await fetch(`${API_BASE_URL}/filter/text`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text,
                    url: window.location.href
                })
            });
            
            // Find the element again using the unique class (in case DOM changed)
            const updatedElement = document.querySelector('.' + uniqueId);
            if (!updatedElement) {
                debug("Element no longer in DOM after backend response");
                return { status: "skipped", reason: "element_removed" };
            }
            
            // Parse the response
            const data = await response.json();
            
            debug("Text analysis response:", data);
            
            // Remove temporary styling
            updatedElement.style.backgroundColor = "";
            
            if (data.error) {
                debug('Error analyzing text:', data.error);
                return { status: "error", error: data.error };
            }
            
            // Apply changes if action is not "allow"
            if (data.action !== "allow") {
                debug(`Applying action: ${data.action} to text`);
                
                if (data.action === "remove") {
                    // Store the original text for recovery
                    const originalText = text;
                    
                    // Create a more user-friendly filtered text display
                    let filteredText;
                    
                    // Different filtering methods based on content length
                    if (text.length < 30) {
                        // For short text, use a generic message
                        filteredText = "[Content filtered by Socio.io]";
                    } else if (text.length < 100) {
                        // For medium text, show beginning and end with filtered middle
                        const start = text.substring(0, 10);
                        const end = text.substring(text.length - 10);
                        filteredText = `${start}... [Content filtered by Socio.io] ...${end}`;
                    } else {
                        // For long text, show a paragraph summary
                        const firstSentence = text.split('.')[0];
                        const preview = firstSentence.length > 50 ? firstSentence.substring(0, 50) + "..." : firstSentence;
                        filteredText = `${preview}\n\n[Additional content filtered by Socio.io - Click the indicator to view]`;
                    }
                    
                    // Apply the filtered text
                    element.textContent = filteredText;
                    
                    // Add a special class to identify filtered elements
                    element.classList.add('socioio-filtered-text');
                    
                    // Add visual indicator
                    addModerationIndicator(element, "remove", data.reasons);
                    
                    // Save to filter history
                    saveFilterHistory('text', text, data.reasons);
                    
                } else if (data.action === "encrypt") {
                    // Replace with encrypted version
                    element.textContent = data.processed_text;
                    element.classList.add('socioio-encrypted');
                    
                    // Add visual indicator
                    addModerationIndicator(element, "encrypt", data.reasons);
                    
                    // Save to filter history
                    saveFilterHistory('text', text, data.reasons);
                }
                
                // Update stats
                updateStats('text');
                
                return { status: "filtered", action: data.action, reasons: data.reasons };
            }
            
            return { status: "kept" };
            
        } catch (error) {
            debug('Error in fetch request:', error);
            return { status: "error", error: error.message };
        }
        
    } catch (error) {
        debug('Error in text processing:', error);
        return { status: "error", error: error.message };
    }
}

// Add visual indicator for moderated content - Enhanced user-friendly version
function addModerationIndicator(element, action, reasons) {
    try {
        // Clear any existing indicators for this element
        const existingIndicators = document.querySelectorAll('.' + INDICATOR_CLASS);
        for (const indicator of existingIndicators) {
            const rect = indicator.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            
            // If the indicator is close to this element, remove it
            if (Math.abs(rect.top - elementRect.top) < 30 && 
                Math.abs(rect.left - elementRect.left) < 30) {
                indicator.parentNode.removeChild(indicator);
            }
        }
        
        // Create indicator element
        const indicator = document.createElement('div');
        indicator.className = INDICATOR_CLASS;
        
        // Set icon, text and color based on action
        let icon, text, color;
        if (action === "remove") {
            icon = "🛡️";
            text = "View";
            color = "#4285f4"; // Google blue
        } else if (action === "encrypt") {
            icon = "🔒";
            text = "View";
            color = "#0f9d58"; // Google green
        } else {
            icon = "⚠️";
            text = "View";
            color = "#f4b400"; // Google yellow
        }
        
        // Position the indicator
        const rect = element.getBoundingClientRect();
        indicator.style.position = "absolute";
        indicator.style.top = `${window.scrollY + rect.top}px`;
        indicator.style.left = `${window.scrollX + rect.right - 50}px`; // Position at the right side
        indicator.style.backgroundColor = color;
        indicator.style.color = "white";
        indicator.style.padding = "4px 8px";
        indicator.style.borderRadius = "4px";
        indicator.style.fontSize = "12px";
        indicator.style.zIndex = "9999";
        indicator.style.cursor = "pointer";
        indicator.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
        indicator.style.display = "flex";
        indicator.style.alignItems = "center";
        indicator.style.transition = "all 0.2s ease";
        indicator.innerHTML = `${icon} <span style="margin-left: 4px;">${text}</span>`;
        
        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'socioio-tooltip';
        tooltip.style.display = "none";
        tooltip.style.position = "absolute";
        tooltip.style.top = "100%";
        tooltip.style.right = "0";
        tooltip.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
        tooltip.style.color = "white";
        tooltip.style.padding = "10px";
        tooltip.style.borderRadius = "4px";
        tooltip.style.width = "250px";
        tooltip.style.zIndex = "10000";
        tooltip.style.boxShadow = "0 3px 10px rgba(0,0,0,0.3)";
        
        // Add reasons to tooltip
        let tooltipContent = `<div style="font-weight: bold; margin-bottom: 8px;">Content Filtered by Socio.io</div>`;
        if (reasons && reasons.length > 0) {
            tooltipContent += `<div style="font-size: 12px; margin-bottom: 5px;">Filtered for the following reasons:</div>`;
            tooltipContent += `<ul style="margin: 5px 0; padding-left: 15px; font-size: 12px;">`;
            reasons.forEach(reason => {
                tooltipContent += `<li>${reason}</li>`;
            });
            tooltipContent += `</ul>`;
        }
        tooltipContent += `<div style="font-size: 12px; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2);">
            Click to view the original content
        </div>`;
        tooltip.innerHTML = tooltipContent;
        
        // Add tooltip to indicator
        indicator.appendChild(tooltip);
        
        // Show/hide tooltip on hover
        indicator.addEventListener('mouseenter', () => {
            tooltip.style.display = "block";
            indicator.style.backgroundColor = darkenColor(color, 10);
        });
        
        indicator.addEventListener('mouseleave', () => {
            tooltip.style.display = "none";
            indicator.style.backgroundColor = color;
        });
        
        // Add click handler to show original content
        indicator.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Get the original content from history
            chrome.storage.local.get(['filterHistory'], function(result) {
                const history = result.filterHistory || [];
                
                // Find the matching content
                const matchingItem = history.find(item => {
                    // Check if this element contains the filtered text
                    return element.classList.contains('socioio-filtered-text') && 
                           item.type === 'text' && 
                           element.textContent.includes('[Content filtered by Socio.io]');
                });
                
                if (matchingItem) {
                    // Show a modal with the original content
                    showContentModal(matchingItem.originalContent, reasons);
                } else {
                    // If we can't find the exact match, show a generic message
                    showContentModal("Original content not found in history. Please use the recovery option from the extension popup.", []);
                }
            });
        });
        
        // Add to document
        document.body.appendChild(indicator);
        
    } catch (error) {
        debug('Error adding moderation indicator:', error);
    }
}

// Helper function to darken a color
function darkenColor(color, percent) {
    // Convert hex to RGB
    let r, g, b;
    if (color.startsWith('#')) {
        r = parseInt(color.substr(1, 2), 16);
        g = parseInt(color.substr(3, 2), 16);
        b = parseInt(color.substr(5, 2), 16);
    } else {
        return color; // Return original if not hex
    }
    
    // Darken
    r = Math.max(0, Math.floor(r * (100 - percent) / 100));
    g = Math.max(0, Math.floor(g * (100 - percent) / 100));
    b = Math.max(0, Math.floor(b * (100 - percent) / 100));
    
    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Show a modal with the original content
function showContentModal(content, reasons) {
    // Create modal container
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '99999';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.backgroundColor = 'white';
    modalContent.style.padding = '20px';
    modalContent.style.borderRadius = '8px';
    modalContent.style.maxWidth = '600px';
    modalContent.style.maxHeight = '80%';
    modalContent.style.overflow = 'auto';
    modalContent.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.3)';
    
    // Add header
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '15px';
    header.style.paddingBottom = '10px';
    header.style.borderBottom = '1px solid #eee';
    
    const title = document.createElement('h3');
    title.style.margin = '0';
    title.style.color = '#333';
    title.textContent = 'Original Filtered Content';
    
    const closeBtn = document.createElement('button');
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.fontSize = '20px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.color = '#666';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    // Add content
    const contentDiv = document.createElement('div');
    contentDiv.style.marginBottom = '15px';
    contentDiv.style.color = '#333';
    contentDiv.style.lineHeight = '1.5';
    contentDiv.textContent = content;
    
    // Add reasons if available
    let reasonsDiv = '';
    if (reasons && reasons.length > 0) {
        reasonsDiv = document.createElement('div');
        reasonsDiv.style.marginTop = '15px';
        reasonsDiv.style.padding = '10px';
        reasonsDiv.style.backgroundColor = '#f8f9fa';
        reasonsDiv.style.borderRadius = '4px';
        reasonsDiv.style.fontSize = '14px';
        
        const reasonsTitle = document.createElement('div');
        reasonsTitle.style.fontWeight = 'bold';
        reasonsTitle.style.marginBottom = '5px';
        reasonsTitle.textContent = 'Filtered for the following reasons:';
        
        const reasonsList = document.createElement('ul');
        reasonsList.style.margin = '5px 0';
        reasonsList.style.paddingLeft = '20px';
        
        reasons.forEach(reason => {
            const item = document.createElement('li');
            item.textContent = reason;
            reasonsList.appendChild(item);
        });
        
        reasonsDiv.appendChild(reasonsTitle);
        reasonsDiv.appendChild(reasonsList);
    }
    
    // Add footer with buttons
    const footer = document.createElement('div');
    footer.style.display = 'flex';
    footer.style.justifyContent = 'flex-end';
    footer.style.marginTop = '15px';
    footer.style.paddingTop = '10px';
    footer.style.borderTop = '1px solid #eee';
    
    const copyBtn = document.createElement('button');
    copyBtn.style.backgroundColor = '#4285f4';
    copyBtn.style.color = 'white';
    copyBtn.style.border = 'none';
    copyBtn.style.padding = '8px 15px';
    copyBtn.style.borderRadius = '4px';
    copyBtn.style.cursor = 'pointer';
    copyBtn.style.marginLeft = '10px';
    copyBtn.textContent = 'Copy to Clipboard';
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(content)
            .then(() => {
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.textContent = 'Copy to Clipboard';
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy: ', err);
            });
    });
    
    footer.appendChild(copyBtn);
    
    // Assemble modal
    modalContent.appendChild(header);
    modalContent.appendChild(contentDiv);
    if (reasonsDiv) modalContent.appendChild(reasonsDiv);
    modalContent.appendChild(footer);
    
    modal.appendChild(modalContent);
    
    // Add click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
    
    // Add to document
    document.body.appendChild(modal);
}

// Store processed elements for persistence
function storeProcessedElements() {
    // This is a placeholder for future implementation
    // We might want to store the IDs of processed elements in local storage
    // so we don't reprocess them on page reload
}

// Update stats in the background script
function updateStats(type) {
    try {
        // Make sure we're using the correct type name for images
        const correctedType = type === 'image' ? 'images' : type;
        
        debug(`Updating stats for ${correctedType}`);
        
        chrome.runtime.sendMessage({
            action: 'updateStats',
            type: correctedType,
            count: 1
        }, function(response) {
            if (chrome.runtime.lastError) {
                debug("Error updating stats:", chrome.runtime.lastError);
                
                // Try again after a short delay
                setTimeout(() => {
                    chrome.runtime.sendMessage({
                        action: 'updateStats',
                        type: correctedType,
                        count: 1
                    });
                }, 500);
            } else {
                debug("Stats updated:", response);
            }
        });
        
        // Also update local storage directly as a backup
        chrome.storage.local.get([correctedType + 'Filtered'], function(result) {
            const current = parseInt(result[correctedType + 'Filtered']) || 0;
            const newCount = current + 1;
            
            chrome.storage.local.set({ 
                [correctedType + 'Filtered']: newCount 
            }, function() {
                debug(`Directly updated ${correctedType}Filtered to ${newCount}`);
            });
        });
    } catch (e) {
        debug("Error sending stats update:", e);
    }
}

// Restore original content when protection is disabled
function restoreOriginalContent() {
    debug("Restoring original content");
    
    // Remove all socioio elements
    document.querySelectorAll('.socioio-blocked-image, .socioio-image-overlay, .socioio-image-wrapper, .' + INDICATOR_CLASS).forEach(el => {
        try {
            el.parentNode.removeChild(el);
        } catch (e) {
            debug("Error removing element:", e);
        }
    });
    
    // Remove blur from all images
    document.querySelectorAll('img[style*="blur"], .socioio-filtered-image, img[data-socioio-filtered="true"]').forEach(img => {
        try {
            img.style.filter = 'none';
            img.style.border = '';
            img.classList.remove('socioio-filtered-image');
            img.removeAttribute('data-socioio-filtered');
            
            // If the image has an original src, restore it
            if (img.dataset.originalSrc) {
                img.src = img.dataset.originalSrc;
                img.removeAttribute('data-original-src');
            }
            
            // If the image is in a wrapper, unwrap it
            if (img.parentNode && img.parentNode.classList && img.parentNode.classList.contains('socioio-image-wrapper')) {
                const wrapper = img.parentNode;
                const parent = wrapper.parentNode;
                parent.insertBefore(img, wrapper);
                parent.removeChild(wrapper);
            }
        } catch (e) {
            debug("Error restoring image:", e);
        }
    });
    
    // Restore filtered text
    document.querySelectorAll('.socioio-filtered-text').forEach(el => {
        try {
            if (el.dataset.originalText) {
                el.textContent = el.dataset.originalText;
                el.removeAttribute('data-original-text');
            }
            el.classList.remove('socioio-filtered-text');
            el.style = '';
        } catch (e) {
            debug("Error restoring text:", e);
        }
    });
    
    // Remove any remaining overlays
    document.querySelectorAll('.socioio-overlay').forEach(el => {
        try {
            el.parentNode.removeChild(el);
        } catch (e) {
            debug("Error removing overlay:", e);
        }
    });
    
    debug("Content restoration complete");
}

// Apply recovered content from popup
function applyRecoveredContent(recoveredText) {
    debug("Applying recovered content:", recoveredText);
    
    try {
        // Find all elements with our new filtered text class
        const modernFilteredElements = Array.from(document.querySelectorAll('.socioio-filtered-text'));
        
        // Also find legacy elements with asterisks (for backward compatibility)
        const legacyFilteredElements = Array.from(document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6'))
            .filter(el => {
                // Check if the element contains only asterisks
                const text = el.textContent.trim();
                return text.length > 0 && text.split('').every(char => char === '*');
            });
        
        // Also find elements with our filtered content message
        const messageFilteredElements = Array.from(document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6'))
            .filter(el => {
                const text = el.textContent.trim();
                return text.includes('[Content filtered by Socio.io]');
            });
        
        // Combine all types of filtered elements
        const allFilteredElements = [
            ...modernFilteredElements, 
            ...legacyFilteredElements,
            ...messageFilteredElements
        ];
        
        debug(`Found ${allFilteredElements.length} filtered elements to restore (${modernFilteredElements.length} modern, ${legacyFilteredElements.length} legacy, ${messageFilteredElements.length} message)`);
        
        // If no filtered elements found, try to create a new element with the recovered text
        if (allFilteredElements.length === 0) {
            debug("No filtered elements found, creating a new element with the recovered text");
            
            // Create a notification to show the recovered text
            const notification = document.createElement('div');
            notification.style.position = 'fixed';
            notification.style.top = '20px';
            notification.style.left = '50%';
            notification.style.transform = 'translateX(-50%)';
            notification.style.backgroundColor = '#4285f4';
            notification.style.color = 'white';
            notification.style.padding = '15px 20px';
            notification.style.borderRadius = '5px';
            notification.style.zIndex = '9999999';
            notification.style.fontFamily = 'Arial, sans-serif';
            notification.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
            notification.style.maxWidth = '80%';
            notification.style.maxHeight = '80%';
            notification.style.overflow = 'auto';
            
            // Add a title
            const title = document.createElement('div');
            title.style.fontWeight = 'bold';
            title.style.marginBottom = '10px';
            title.textContent = 'Recovered Content:';
            notification.appendChild(title);
            
            // Add the recovered text
            const content = document.createElement('div');
            content.style.whiteSpace = 'pre-wrap';
            content.style.wordBreak = 'break-word';
            content.textContent = recoveredText;
            notification.appendChild(content);
            
            // Add a close button
            const closeButton = document.createElement('button');
            closeButton.style.position = 'absolute';
            closeButton.style.top = '5px';
            closeButton.style.right = '5px';
            closeButton.style.background = 'none';
            closeButton.style.border = 'none';
            closeButton.style.color = 'white';
            closeButton.style.fontSize = '20px';
            closeButton.style.cursor = 'pointer';
            closeButton.textContent = '×';
            closeButton.addEventListener('click', () => {
                document.body.removeChild(notification);
            });
            notification.appendChild(closeButton);
            
            // Add to document
            document.body.appendChild(notification);
            
            // Remove after 30 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 30000);
            
            return;
        }
        
        // If we found filtered elements, restore the first one
        if (allFilteredElements.length > 0) {
            const elementToRestore = allFilteredElements[0];
            
            // Restore the content
            elementToRestore.textContent = recoveredText;
            
            // Remove the filtered class if it exists
            elementToRestore.classList.remove('socioio-filtered-text');
            
            // Remove the indicator if it exists
            const indicators = document.querySelectorAll('.' + INDICATOR_CLASS);
            for (const indicator of indicators) {
                const rect = indicator.getBoundingClientRect();
                const elementRect = elementToRestore.getBoundingClientRect();
                
                // If the indicator is close to this element, remove it
                if (Math.abs(rect.top - elementRect.top) < 50 && 
                    Math.abs(rect.left - elementRect.left) < 100) {
                    indicator.parentNode.removeChild(indicator);
                }
            }
        }
        
        // Also try to find and update encrypted elements
        document.querySelectorAll('.socioio-encrypted').forEach(el => {
            el.textContent = recoveredText;
            el.classList.remove('socioio-encrypted');
        });
        
        // Show notification
        const notification = document.createElement('div');
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        notification.style.color = 'white';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '5px';
        notification.style.zIndex = '9999999';
        notification.style.fontFamily = 'Arial, sans-serif';
        notification.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        
        if (allFilteredElements.length > 0) {
            notification.textContent = 'Content restored successfully!';
        } else {
            notification.textContent = 'No filtered content found to restore. Content copied to clipboard.';
            
            // Copy to clipboard as fallback
            navigator.clipboard.writeText(recoveredText)
                .catch(err => {
                    debug("Error copying to clipboard:", err);
                });
        }
        
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
        
        debug("Content applied to page");
    } catch (e) {
        debug("Error applying recovered content:", e);
        
        // Show error notification
        const notification = document.createElement('div');
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.backgroundColor = 'rgba(220, 53, 69, 0.9)';
        notification.style.color = 'white';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '5px';
        notification.style.zIndex = '9999999';
        notification.style.fontFamily = 'Arial, sans-serif';
        notification.textContent = 'Error restoring content. Try copying it manually.';
        
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// Inject CSS styles for our elements
function injectStyles() {
    debug("Injecting styles");
    
    const styles = `
        .socioio-image-container {
            position: relative !important;
            display: inline-block !important;
            overflow: hidden !important;
        }
        
        .socioio-image-container img {
            transition: filter 0.3s ease !important;
        }
        
        .socioio-image-wrapper {
            position: relative !important;
            display: inline-block !important;
            overflow: hidden !important;
        }
        
        .socioio-overlay {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            background-color: rgba(0, 0, 0, 0.7) !important;
            color: white !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            z-index: 9999 !important;
            padding: 20px !important;
            box-sizing: border-box !important;
        }
        
        .socioio-warning {
            font-size: 14px !important;
            font-weight: bold !important;
            margin-bottom: 10px !important;
            font-family: Arial, sans-serif !important;
        }
        
        .socioio-show-button {
            background-color: #4285f4 !important;
            color: white !important;
            border: none !important;
            padding: 8px 16px !important;
            border-radius: 4px !important;
            cursor: pointer !important;
            font-size: 12px !important;
            font-weight: bold !important;
            font-family: Arial, sans-serif !important;
        }
        
        .socioio-show-button:hover {
            background-color: #356ac3 !important;
        }
        
        .socioio-viewed-indicator {
            position: absolute !important;
            top: 0 !important;
            right: 0 !important;
            background-color: rgba(255, 0, 0, 0.7) !important;
            color: white !important;
            padding: 2px 5px !important;
            font-size: 10px !important;
            z-index: 9999 !important;
            font-family: Arial, sans-serif !important;
        }
        
        .socioio-image-overlay {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            background-color: rgba(0, 0, 0, 0.7) !important;
            color: white !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            z-index: 9999 !important;
            cursor: pointer !important;
            transition: opacity 0.3s ease !important;
            padding: 20px !important;
        }
        
        .socioio-subtle {
            background-color: rgba(0, 0, 0, 0.5) !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }
        
        .socioio-overlay-content {
            max-width: 300px !important;
        }
        
        .socioio-icon {
            font-size: 24px !important;
            margin-bottom: 10px !important;
        }
        
        .socioio-message {
            font-weight: bold !important;
            margin-bottom: 10px !important;
        }
        
        .socioio-reasons {
            font-size: 12px !important;
            margin-bottom: 10px !important;
        }
        
        .socioio-instruction {
            font-size: 12px !important;
            font-style: italic !important;
        }
        
        .socioio-blocked-image {
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #f8f9fa;
            border: 1px solid #ddd;
            color: #666;
            padding: 20px;
            text-align: center;
            min-height: 100px;
            min-width: 100px;
        }
    `;
    
    const styleElement = document.createElement('style');
    styleElement.id = 'socioio-styles';
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
}

// Save filtered content to history
function saveFilterHistory(type, content, reasons) {
    try {
        debug(`Saving ${type} to filter history`);
        
        // Make sure we have valid content
        if (!content) {
            debug('No content provided for filter history');
            return;
        }
        
        // Make sure we have valid reasons
        const validReasons = Array.isArray(reasons) ? reasons.filter(r => r) : ['Filtered content'];
        
        // Create history item
        const historyItem = {
            type: type,
            content: type === 'image' ? 'Image URL: ' + content.substring(0, 50) + '...' : 
                    content.substring(0, 100) + (content.length > 100 ? '...' : ''),
            originalContent: content,
            reasons: validReasons,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            domain: new URL(window.location.href).hostname
        };
        
        debug('Created history item:', historyItem);
        
        // Get existing history
        chrome.storage.local.get(['filterHistory'], function(result) {
            let history = result.filterHistory || [];
            
            debug(`Current history has ${history.length} items`);
            
            // Add new item at the beginning
            history.unshift(historyItem);
            
            // Limit history to 100 items
            if (history.length > 100) {
                history = history.slice(0, 100);
            }
            
            // Save updated history
            chrome.storage.local.set({ 'filterHistory': history }, function() {
                if (chrome.runtime.lastError) {
                    debug('Error saving filter history:', chrome.runtime.lastError);
                } else {
                    debug(`Filter history updated successfully, now has ${history.length} items`);
                }
            });
        });
    } catch (e) {
        debug('Error saving to filter history:', e);
        
        // Try a simpler approach as fallback
        try {
            const simpleItem = {
                type: type,
                content: type === 'image' ? 'Image filtered' : 'Text filtered',
                timestamp: new Date().toISOString(),
                domain: window.location.hostname
            };
            
            chrome.storage.local.get(['filterHistory'], function(result) {
                let history = result.filterHistory || [];
                history.unshift(simpleItem);
                if (history.length > 100) history = history.slice(0, 100);
                chrome.storage.local.set({ 'filterHistory': history });
            });
        } catch (fallbackError) {
            debug('Fallback history save also failed:', fallbackError);
        }
    }
}

// Reset processed sets periodically
function resetProcessedSets() {
    // Clear the sets every 5 minutes to allow re-checking
    setInterval(() => {
        debug("Resetting processed element sets");
        textElementsProcessed.clear();
        imageElementsProcessed.clear();
    }, 5 * 60 * 1000);
}

// Initialize when the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

// Also initialize after a short delay to ensure everything is loaded
setTimeout(function() {
    debug("Running delayed initialization");
    initialize();
    
    // Force a scan of all images
    applyImmediateBlurToAllImages();
    scanImagesForModeration();
    
    // Reset processed sets periodically
    resetProcessedSets();
    
    // Set up periodic rescans to catch any new images
    setInterval(function() {
        debug("Running periodic rescan for new images");
        scanImagesForModeration();
    }, 3000); // Every 3 seconds
}, 1000);

// Add a mutation observer to detect new images added to the page
function setupImageMutationObserver() {
    try {
        const observer = new MutationObserver(function(mutations) {
            let newImagesFound = false;
            
            mutations.forEach(function(mutation) {
                // Check for added nodes
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];
                        
                        // Check if the node is an image
                        if (node.nodeName === 'IMG') {
                            newImagesFound = true;
                            break;
                        }
                        
                        // Check if the node contains images
                        if (node.nodeType === 1) { // Element node
                            const images = node.querySelectorAll('img');
                            if (images.length > 0) {
                                newImagesFound = true;
                                break;
                            }
                        }
                    }
                }
            });
            
            // If new images were found, scan them
            if (newImagesFound) {
                debug("New images detected, scanning...");
                scanImagesForModeration();
            }
        });
        
        // Start observing the document with the configured parameters
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        debug("Image mutation observer set up");
    } catch (error) {
        debug("Error setting up image mutation observer:", error);
    }
}

// Call this in initialize function
setTimeout(function() {
    setupImageMutationObserver();
}, 2000); // Delay to ensure document is fully loaded