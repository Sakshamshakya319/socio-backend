// Background script for Socio.io content moderation extension
console.log("Background script loaded");

// Extension state
let state = {
  enabled: true,
  textFiltered: 0,
  imagesFiltered: 0,
  backendRunning: true, // Always assume backend is running for testing
  backendCheckInterval: null,
  backendNotificationShown: false
};

// Initialize extension state from storage
function initExtensionState() {
  chrome.storage.local.get(['textFiltered', 'imagesFiltered', 'enabled'], function(result) {
    // Initialize counters
    state.textFiltered = parseInt(result.textFiltered) || 0;
    state.imagesFiltered = parseInt(result.imagesFiltered) || 0;
    
    // Initialize enabled state (default to true if not set)
    state.enabled = result.enabled !== undefined ? result.enabled : true;
    
    console.log("Initialized state - Enabled:", state.enabled, "Text:", state.textFiltered, "Images:", state.imagesFiltered);
    
    // Make sure we have valid numbers
    if (isNaN(state.textFiltered)) state.textFiltered = 0;
    if (isNaN(state.imagesFiltered)) state.imagesFiltered = 0;
    
    // Store the values back to ensure consistency
    chrome.storage.local.set({
      'enabled': state.enabled,
      'textFiltered': state.textFiltered,
      'imagesFiltered': state.imagesFiltered
    }, function() {
      console.log("State stored back to storage");
    });
    
    // Update badge with current counts
    updateBadge();
    
    // Notify all tabs about the current enabled state
    notifyAllTabsAboutEnabledState();
  });
}

// Notify all tabs about the current enabled state
function notifyAllTabsAboutEnabledState() {
  chrome.tabs.query({}, function(tabs) {
    for (let tab of tabs) {
      chrome.tabs.sendMessage(tab.id, {
        action: "setEnabled", 
        enabled: state.enabled
      }, function(response) {
        // Ignore errors when content script isn't loaded
        if (chrome.runtime.lastError) {
          console.log(`Could not send message to tab ${tab.id}: ${chrome.runtime.lastError.message}`);
        }
      });
    }
  });
}

// Update the extension badge with the number of filtered items
function updateBadge() {
  // Make sure we have valid numbers
  if (isNaN(state.textFiltered)) state.textFiltered = 0;
  if (isNaN(state.imagesFiltered)) state.imagesFiltered = 0;
  
  const total = state.textFiltered + state.imagesFiltered;
  console.log("Updating badge with total:", total, "Text:", state.textFiltered, "Images:", state.imagesFiltered);
  
  if (total > 0) {
    // Format the badge text - if over 99, show 99+
    const badgeText = total > 99 ? '99+' : total.toString();
    
    // Set the badge text
    chrome.action.setBadgeText({ text: badgeText });
    
    // Set badge background color
    chrome.action.setBadgeBackgroundColor({ color: '#4285f4' });
    
    console.log("Badge updated to:", badgeText);
  } else {
    // Clear the badge if no items filtered
    chrome.action.setBadgeText({ text: '' });
    console.log("Badge cleared (no items filtered)");
  }
  
  // Double-check storage to ensure consistency
  chrome.storage.local.get(['textFiltered', 'imagesFiltered'], function(result) {
    console.log("Storage values - Text:", result.textFiltered, "Images:", result.imagesFiltered);
  });
}

// Check backend status directly via HTTP
function checkBackendStatus() {
  console.log("Checking backend status via HTTP...");
  
  fetch('https://socio-backend-zxxd.onrender.com/ping')
    .then(response => response.json())
    .then(data => {
      console.log("Backend is running:", data);
      
      // Update state if backend status changed
      if (!state.backendRunning) {
        state.backendRunning = true;
        
        // Notify any content scripts that the backend is running
        chrome.tabs.query({}, function(tabs) {
          for (let tab of tabs) {
            // Only send messages to tabs that are fully loaded
            if (tab.status === 'complete') {
              chrome.tabs.sendMessage(tab.id, {
                action: "backendStatusChanged", 
                running: true
              }, function(response) {
                // Check for error and ignore it - this happens when the content script isn't loaded
                if (chrome.runtime.lastError) {
                  console.log(`Could not send message to tab ${tab.id}: ${chrome.runtime.lastError.message}`);
                }
              });
            }
          }
        });
      }
    })
    .catch(error => {
      console.log("Backend connection error:", error);
      
      // For testing purposes, keep backend running even if there's an error
      console.log("Keeping backend status as running for testing despite connection error");
      
      // Don't change the backend status
      // state.backendRunning = false;
      
      // Show a notification to the user (only once)
      if (!state.backendNotificationShown) {
        try {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'images/icon128.png',
            title: 'Socio.io Backend Connection Issue',
            message: 'Cannot connect to cloud backend. Using local filtering only.',
            priority: 2
          });
          
          state.backendNotificationShown = true;
        } catch (e) {
          console.error("Could not show notification:", e);
        }
      }
    });
}

// Start periodic backend status checks
function startBackendStatusChecks() {
  // Clear any existing interval
  if (state.backendCheckInterval) {
    clearInterval(state.backendCheckInterval);
  }
  
  // Check immediately
  checkBackendStatus();
  
  // Then check every 10 seconds
  state.backendCheckInterval = setInterval(checkBackendStatus, 10000);
}

// Listen for installation
chrome.runtime.onInstalled.addListener(function() {
  // Set default values
  chrome.storage.local.set({
    enabled: true,
    textFiltered: 0,
    imagesFiltered: 0,
    setupCompleted: false
  });
  
  console.log('Socio.io Content Moderation extension installed successfully');
  
  // Start backend status checks
  startBackendStatusChecks();
  
  // Open setup page
  chrome.tabs.create({
    url: chrome.runtime.getURL('setup.html')
  });
});

// Call initialization
initExtensionState();

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  try {
    console.log("Background script received message:", message);
    
    // Handle different message types
    switch (message.action) {
      case 'updateStats':
        // Update statistics
        const type = message.type;
        const count = message.count || 1;
        
        console.log(`Background: Received updateStats for ${type}, count=${count}`);
        
        chrome.storage.local.get([type + 'Filtered'], function(result) {
          const current = parseInt(result[type + 'Filtered']) || 0;
          const newCount = current + count;
          
          console.log(`Background: Updating ${type}Filtered from ${current} to ${newCount}`);
          
          // Update local state
          state[type + 'Filtered'] = newCount;
          
          // Store in persistent storage
          chrome.storage.local.set({ 
            [type + 'Filtered']: newCount 
          }, function() {
            console.log(`Background: Successfully updated ${type}Filtered to ${newCount}`);
            
            // Double-check the update
            chrome.storage.local.get([type + 'Filtered'], function(checkResult) {
              console.log(`Background: Verified ${type}Filtered is now ${checkResult[type + 'Filtered']}`);
            });
          });
          
          // Update the badge
          updateBadge();
          
          sendResponse({success: true, newCount: newCount});
        });
        
        return true; // Keep the messaging channel open for async response
        break;
  
      case 'directImageUpdate':
        console.log('Background: Received direct image update request');
        
        chrome.storage.local.get(['imagesFiltered'], function(result) {
          const current = parseInt(result.imagesFiltered) || 0;
          const newCount = current + 1;
          
          console.log(`Background: Directly updating imagesFiltered from ${current} to ${newCount}`);
          
          // Update local state
          state.imagesFiltered = newCount;
          
          // Store in persistent storage
          chrome.storage.local.set({ 
            'imagesFiltered': newCount 
          }, function() {
            console.log(`Background: Successfully updated imagesFiltered to ${newCount}`);
          });
          
          // Update the badge
          updateBadge();
          
          sendResponse({success: true, newCount: newCount});
        });
        
        return true; // Keep the messaging channel open for async response
        break;
      
      case 'resetStats':
        chrome.storage.local.set({
          textFiltered: 0,
          imagesFiltered: 0
        });
        
        state.textFiltered = 0;
        state.imagesFiltered = 0;
        
        // Update the badge
        updateBadge();
        
        sendResponse({success: true});
        return true;
        break;
      
      case 'getStatus':
        sendResponse({
          enabled: state.enabled,
          textFiltered: state.textFiltered,
          imagesFiltered: state.imagesFiltered,
          backendRunning: state.backendRunning,
          status: "Background script is active"
        });
        
        return true;
        break;
        
      case 'setEnabled':
        state.enabled = message.enabled;
        chrome.storage.local.set({ enabled: state.enabled });
        
        // Notify all tabs about the state change
        chrome.tabs.query({}, function(tabs) {
          for (let tab of tabs) {
            chrome.tabs.sendMessage(tab.id, {
              action: "setEnabled", 
              enabled: state.enabled
            }, function(response) {
              // Ignore errors when content script isn't loaded
              if (chrome.runtime.lastError) {
                console.log(`Could not send message to tab ${tab.id}: ${chrome.runtime.lastError.message}`);
              }
            });
          }
        });
        
        sendResponse({
          success: true,
          enabled: state.enabled
        });
        
        return true;
        break;
      
      case 'contentScriptActive':
        console.log("Content script is active on:", message.url);
        
        // Check backend status
        checkBackendStatus();
        
        // Send the current backend status and enabled state to the content script
        sendResponse({
          status: "Background acknowledged content script",
          backendRunning: state.backendRunning,
          enabled: state.enabled
        });
        
        return true;
        break;
      
      case 'checkBackendStatus':
        checkBackendStatus();
        
        sendResponse({
          backendRunning: state.backendRunning
        });
        
        return true;
        break;
      
      case 'backendConnectionIssue':
        console.log("Received backend connection issue notification");
        
        // Show notification if not already shown
        if (!state.backendNotificationShown) {
          try {
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'images/icon128.png',
              title: 'Socio.io Backend Connection Issue',
              message: 'Cannot connect to cloud backend. Please check your internet connection.',
              priority: 2
            });
            
            state.backendNotificationShown = true;
          } catch (e) {
            console.error("Could not show notification:", e);
          }
        }
        
        sendResponse({
          status: "Backend connection issue acknowledged"
        });
        
        return true;
        break;
      
      default:
        // Default response
        sendResponse({status: "Background script received message"});
        return true;
    }
  } catch (error) {
    console.error("Error handling message in background script:", error);
    // Send an error response
    sendResponse({error: "Error processing message", message: error.message});
    return true;
  }
});