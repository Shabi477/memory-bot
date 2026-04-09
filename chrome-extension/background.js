// Background service worker for AI Chat Organiser extension

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-to-organiser',
    title: 'Save to AI Organiser',
    contexts: ['selection']
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'save-to-organiser' && info.selectionText) {
    saveSelection(info.selectionText, tab);
  }
});

// Handle keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
  if (command === 'save-selection') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: getSelectedText
        }, (results) => {
          if (results && results[0] && results[0].result) {
            saveSelection(results[0].result, tabs[0]);
          }
        });
      }
    });
  }
});

// Get selected text from page
function getSelectedText() {
  return window.getSelection().toString();
}

// Detect AI source from URL
function detectSource(url) {
  if (!url) return 'unknown';
  if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) return 'chatgpt';
  if (url.includes('claude.ai')) return 'claude';
  if (url.includes('gemini.google.com') || url.includes('bard.google.com')) return 'gemini';
  if (url.includes('perplexity.ai')) return 'perplexity';
  if (url.includes('copilot.microsoft.com')) return 'copilot';
  if (url.includes('poe.com')) return 'poe';
  return 'other';
}

// Save selection - store temporarily and open popup
function saveSelection(text, tab) {
  const source = detectSource(tab.url);
  
  // Store the pending save data
  chrome.storage.local.set({
    pendingSave: {
      text: text,
      source: source,
      sourceUrl: tab.url,
      timestamp: Date.now()
    }
  }, () => {
    // Open the popup
    chrome.action.openPopup();
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPendingSave') {
    chrome.storage.local.get(['pendingSave'], (result) => {
      sendResponse(result.pendingSave || null);
    });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'clearPendingSave') {
    chrome.storage.local.remove(['pendingSave']);
    sendResponse({ success: true });
    return true;
  }
});
