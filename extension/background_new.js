// Background script for Socio.io content moderation extension
console.log("Background script loaded");

// Extension state
let state = {
  enabled: true,
  textFiltered: 0,
  imagesFiltered: 0,
  backendRunning: false,
  backendCheckInterval: null
};

// Initialize counters from storage
function initCounters() {
  chrome.storage.local.get(['textFiltered', 'imagesFiltered'], function(result) {
    state.textFiltered = result.textFiltered || 0;
    state.imagesFiltered = result.imagesFiltered || 0;
    
    // Update badge with current counts
    updateBadge();
  });
}

// Update the extension badge with the number of filtered items
function updateBadge() {
  const total = state.textFiltered + state.imagesFiltered;
  
  if (total > 0) {
    // Format the badge text - if over 99, show 99+
    const badgeText = total > 99 ? '99+' : total.toString();
    
    // Set the badge text
    chrome.action.setBadgeText({ text: badgeText });
    
    // Set badge background color
    chrome.action.setBadgeBackgroundColor({ color: '#4285f4' });
  } else {
    // Clear the badge if no items filtered
    chrome.action.setBadgeText({ text: '' });
  }
}

// Check backend status directly via HTTP
function checkBackendStatus() {
  console.log("Checking backend status via HTTP...");
  
  fetch('http://127.0.0.1:5000/ping')
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
      console.log("Backend is not running:", error);
      
      // Update state if backend status changed
      if (state.backendRunning) {
        state.backendRunning = false;
        
        // Notify any content scripts that the backend is not running
        chrome.tabs.query({}, function(tabs) {
          for (let tab of tabs) {
            // Only send messages to tabs that are fully loaded
            if (tab.status === 'complete') {
              chrome.tabs.sendMessage(tab.id, {
                action: "backendStatusChanged", 
                running: false
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
      
      // Show a notification to the user (only once)
      if (!state.backendNotificationShown) {
        try {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'images/icon128.png',
            title: 'Socio.io Backend Not Running',
            message: 'Please start the backend manually by running start_backend.bat',
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
initCounters();

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  try {
    console.log("Background script received message:", message);
    
    // Handle different message types
    if (message.action === 'updateStats') {
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
  }
  
  // Special handler for direct image stats update
  if (message.action === 'directImageUpdate') {
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
  }
  
  // Handle resetting stats
  if (message.action === 'resetStats') {
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
  }
  
  // Handle status check requests
  if (message.action === 'getStatus') {
    sendResponse({
      enabled: state.enabled,
      textFiltered: state.textFiltered,
      imagesFiltered: state.imagesFiltered,
      backendRunning: state.backendRunning,
      status: "Background script is active"
    });
    
    return true;
  }
  
  // Handle content script activation notification
  if (message.action === 'contentScriptActive') {
    console.log("Content script is active on:", message.url);
    
    // Check backend status
    checkBackendStatus();
    
    // Send the current backend status to the content script
    sendResponse({
      status: "Background acknowledged content script",
      backendRunning: state.backendRunning
    });
    
    return true;
  }
  
  // Handle backend status check
  if (message.action === 'checkBackendStatus') {
    checkBackendStatus();
    
    sendResponse({
      backendRunning: state.backendRunning
    });
    
    return true;
  }
  
  // Default response
  sendResponse({status: "Background script received message"});
  return true;
  } catch (error) {
    console.error("Error handling message in background script:", error);
    // Send an error response
    sendResponse({error: "Error processing message", message: error.message});
    return true;
  }
});