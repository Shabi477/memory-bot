// ThreadMind Content Script for ChatGPT
// Injects save buttons and enables highlight-to-save

(function() {
  'use strict';

  const THREADMIND_CONFIG = {
    apiUrl: '', // Set from storage
    userToken: '', // Set from storage
    selectors: {
      // ChatGPT DOM selectors (may need updates if OpenAI changes their DOM)
      messageContainer: '[data-message-author-role]',
      userMessage: '[data-message-author-role="user"]',
      assistantMessage: '[data-message-author-role="assistant"]',
      conversationContainer: 'main',
      chatInput: '#prompt-textarea',
    }
  };

  let exchangeCount = 0;
  let lastNudgeTime = 0;
  const NUDGE_THRESHOLD = 15;
  const NUDGE_COOLDOWN = 300000; // 5 minutes

  // Initialize
  async function init() {
    try {
      const stored = await chrome.storage.sync.get(['threadmind_token', 'threadmind_api_url']);
      THREADMIND_CONFIG.userToken = stored.threadmind_token || '';
      THREADMIND_CONFIG.apiUrl = stored.threadmind_api_url || 'https://memory-bot-omega.vercel.app';
      
      if (!THREADMIND_CONFIG.userToken) {
        console.log('[ThreadMind] No token configured. Please set up in extension popup.');
        return;
      }

      injectStyles();
      observeMessages();
      console.log('[ThreadMind] Initialized for ChatGPT');
    } catch (err) {
      console.error('[ThreadMind] Init error:', err);
    }
  }

  // Inject CSS styles
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .threadmind-save-btn {
        position: absolute;
        right: 8px;
        top: 8px;
        background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
        color: white;
        border: none;
        border-radius: 6px;
        padding: 4px 10px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        opacity: 0;
        transition: all 0.2s ease;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 4px;
        box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
      }
      
      .threadmind-save-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
      }
      
      [data-message-author-role]:hover .threadmind-save-btn {
        opacity: 1;
      }
      
      .threadmind-save-btn.saved {
        background: #10b981;
      }
      
      .threadmind-highlight-tooltip {
        position: fixed;
        background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
        color: white;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .threadmind-highlight-tooltip:hover {
        transform: scale(1.05);
      }
      
      .threadmind-toast {
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 10001;
        animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s;
        box-shadow: 0 4px 16px rgba(124, 58, 237, 0.4);
      }
      
      .threadmind-nudge {
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: white;
        border: 2px solid #7c3aed;
        border-radius: 12px;
        padding: 16px 20px;
        z-index: 10001;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        max-width: 300px;
      }
      
      .threadmind-nudge h4 {
        color: #7c3aed;
        margin: 0 0 8px 0;
        font-size: 14px;
        font-weight: 600;
      }
      
      .threadmind-nudge p {
        color: #666;
        margin: 0 0 12px 0;
        font-size: 13px;
      }
      
      .threadmind-nudge-buttons {
        display: flex;
        gap: 8px;
      }
      
      .threadmind-nudge-btn {
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
        border: none;
      }
      
      .threadmind-nudge-btn.primary {
        background: #7c3aed;
        color: white;
      }
      
      .threadmind-nudge-btn.secondary {
        background: #f3f4f6;
        color: #666;
      }
      
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // Observe new messages
  function observeMessages() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const messages = node.querySelectorAll(THREADMIND_CONFIG.selectors.messageContainer);
            messages.forEach(addSaveButton);
            
            // Also check if the node itself is a message
            if (node.matches && node.matches(THREADMIND_CONFIG.selectors.messageContainer)) {
              addSaveButton(node);
            }
          }
        });
      });
      
      // Count exchanges and maybe nudge
      checkForNudge();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Process existing messages
    document.querySelectorAll(THREADMIND_CONFIG.selectors.messageContainer).forEach(addSaveButton);

    // Set up highlight-to-save
    setupHighlightToSave();
  }

  // Add save button to a message
  function addSaveButton(messageEl) {
    if (messageEl.querySelector('.threadmind-save-btn')) return;
    
    const btn = document.createElement('button');
    btn.className = 'threadmind-save-btn';
    btn.innerHTML = '🧠 Save';
    btn.title = 'Save to ThreadMind';
    
    btn.onclick = async (e) => {
      e.stopPropagation();
      btn.innerHTML = '⏳';
      btn.disabled = true;
      
      const role = messageEl.getAttribute('data-message-author-role');
      const content = messageEl.innerText;
      
      // Get the full exchange (user prompt + assistant response)
      const exchange = getFullExchange(messageEl, role);
      
      const success = await saveMoment(exchange);
      
      if (success) {
        btn.innerHTML = '✓ Saved';
        btn.classList.add('saved');
        showToast('Saved to ThreadMind!');
      } else {
        btn.innerHTML = '❌ Error';
        setTimeout(() => {
          btn.innerHTML = '🧠 Save';
          btn.disabled = false;
        }, 2000);
      }
    };
    
    messageEl.style.position = 'relative';
    messageEl.appendChild(btn);
  }

  // Get full exchange (user prompt + assistant response)
  function getFullExchange(messageEl, role) {
    let userContent = '';
    let assistantContent = '';
    
    if (role === 'assistant') {
      assistantContent = messageEl.innerText;
      // Try to find the preceding user message
      let prev = messageEl.previousElementSibling;
      while (prev) {
        if (prev.getAttribute('data-message-author-role') === 'user') {
          userContent = prev.innerText;
          break;
        }
        prev = prev.previousElementSibling;
      }
    } else {
      userContent = messageEl.innerText;
      // Try to find the following assistant message
      let next = messageEl.nextElementSibling;
      while (next) {
        if (next.getAttribute('data-message-author-role') === 'assistant') {
          assistantContent = next.innerText;
          break;
        }
        next = next.nextElementSibling;
      }
    }
    
    if (userContent && assistantContent) {
      return `**User:**\n${userContent}\n\n**Assistant:**\n${assistantContent}`;
    }
    return messageEl.innerText;
  }

  // Highlight-to-save functionality
  function setupHighlightToSave() {
    let tooltip = null;
    
    document.addEventListener('mouseup', (e) => {
      // Remove existing tooltip
      if (tooltip) {
        tooltip.remove();
        tooltip = null;
      }
      
      const selection = window.getSelection();
      const text = selection.toString().trim();
      
      if (text.length > 10) {
        tooltip = document.createElement('div');
        tooltip.className = 'threadmind-highlight-tooltip';
        tooltip.innerHTML = '🧠 Save to ThreadMind';
        tooltip.style.left = `${e.pageX}px`;
        tooltip.style.top = `${e.pageY - 40}px`;
        
        tooltip.onclick = async () => {
          tooltip.innerHTML = '⏳ Saving...';
          const success = await saveMoment(text);
          if (success) {
            showToast('Selection saved to ThreadMind!');
          }
          tooltip.remove();
          tooltip = null;
        };
        
        document.body.appendChild(tooltip);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
          if (tooltip) {
            tooltip.remove();
            tooltip = null;
          }
        }, 5000);
      }
    });
  }

  // Save moment to API
  async function saveMoment(content) {
    try {
      // Get selected thread from storage
      const stored = await chrome.storage.sync.get(['threadmind_selected_thread']);
      const threadId = stored.threadmind_selected_thread;
      
      if (!threadId) {
        showToast('Please select a thread in the extension popup first');
        return false;
      }
      
      const response = await fetch(`${THREADMIND_CONFIG.apiUrl}/api/moments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${THREADMIND_CONFIG.userToken}`,
        },
        body: JSON.stringify({
          threadId,
          source: 'chatgpt',
          sourceUrl: window.location.href,
          rawText: content,
        }),
      });
      
      if (response.ok) {
        exchangeCount = 0; // Reset after save
        return true;
      }
      
      console.error('[ThreadMind] Save failed:', await response.text());
      return false;
    } catch (err) {
      console.error('[ThreadMind] Save error:', err);
      return false;
    }
  }

  // Show toast notification
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'threadmind-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
  }

  // Check if we should nudge the user to save
  function checkForNudge() {
    const assistantMessages = document.querySelectorAll(THREADMIND_CONFIG.selectors.assistantMessage);
    exchangeCount = assistantMessages.length;
    
    const now = Date.now();
    if (exchangeCount >= NUDGE_THRESHOLD && (now - lastNudgeTime) > NUDGE_COOLDOWN) {
      showNudge();
      lastNudgeTime = now;
    }
  }

  // Show session nudge
  function showNudge() {
    const existing = document.querySelector('.threadmind-nudge');
    if (existing) return;
    
    const nudge = document.createElement('div');
    nudge.className = 'threadmind-nudge';
    nudge.innerHTML = `
      <h4>🧠 Long session detected!</h4>
      <p>You've had ${exchangeCount}+ exchanges. Want to save any key moments before they're lost?</p>
      <div class="threadmind-nudge-buttons">
        <button class="threadmind-nudge-btn primary" id="tm-open-popup">Open ThreadMind</button>
        <button class="threadmind-nudge-btn secondary" id="tm-dismiss">Dismiss</button>
      </div>
    `;
    
    document.body.appendChild(nudge);
    
    document.getElementById('tm-open-popup').onclick = () => {
      chrome.runtime.sendMessage({ action: 'openPopup' });
      nudge.remove();
    };
    
    document.getElementById('tm-dismiss').onclick = () => {
      nudge.remove();
    };
    
    // Auto-remove after 30 seconds
    setTimeout(() => nudge.remove(), 30000);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
