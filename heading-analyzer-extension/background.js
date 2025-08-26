// Background service worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('Heading Analyzer Extension installed');
  
  // Set default state
  chrome.storage.local.set({
    active: false,
    data: null
  });
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // Reset state when navigating to new page
    chrome.storage.local.get(['active'], (result) => {
      if (result.active) {
        // Re-activate on new page if was active
        chrome.tabs.sendMessage(tabId, { 
          action: 'activate',
          url: tab.url 
        });
      }
    });
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.storage.local.get(['active'], (result) => {
    const newState = !result.active;
    
    if (newState) {
      chrome.tabs.sendMessage(tab.id, { 
        action: 'activate',
        url: tab.url 
      });
    } else {
      chrome.tabs.sendMessage(tab.id, { 
        action: 'deactivate' 
      });
    }
    
    chrome.storage.local.set({ active: newState });
  });
});