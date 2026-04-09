// ThreadMind Content Script for Claude
// Injects save buttons and enables highlight-to-save

(function() {
  'use strict';

  const THREADMIND_CONFIG = {
    apiUrl: '',
    userToken: '',
    selectors: {
      // Claude DOM selectors (may need updates if Anthropic changes their DOM)
      messageContainer: '[data-testid="user-message"], [data-testid="ai-message"]',
      userMessage: '[data-testid="user-message"]',
      assistantMessage: '[data-testid="ai-message"]',
      conversationContainer: 'main',
    }
  };

  let exchangeCount = 0;
  let lastNudgeTime = 0;
  const NUDGE_THRESHOLD = 15;
  const NUDGE_COOLDOWN = 300000;

  async function init() {
    try {
      const stored = await chrome.storage.sync.get(['threadmind_token', 'threadmind_api_url']);
      THREADMIND_CONFIG.userToken = stored.threadmind_token || '';
      THREADMIND_CONFIG.apiUrl = stored.threadmind_api_url || 'https://memory-bot-omega.vercel.app';
      
      if (!THREADMIND_CONFIG.userToken) {
        console.log('[ThreadMind] No token configured.');
        return;
      }

      injectStyles();
      observeMessages();
      console.log('[ThreadMind] Initialized for Claude');
    } catch (err) {
      console.error('[ThreadMind] Init error:', err);
    }
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .threadmind-save-btn {
        position: absolute;
        right: 12px;
        top: 12px;
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
      
      [data-testid="user-message"]:hover .threadmind-save-btn,
      [data-testid="ai-message"]:hover .threadmind-save-btn {
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

  function observeMessages() {
    const selectors = '[data-testid="user-message"], [data-testid="ai-message"]';
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check for messages in added nodes
            const messages = node.querySelectorAll ? node.querySelectorAll(selectors) : [];
            messages.forEach(addSaveButton);
            
            if (node.matches && node.matches(selectors)) {
              addSaveButton(node);
            }
          }
        });
      });
      checkForNudge();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    
    // Process existing messages
    document.querySelectorAll(selectors).forEach(addSaveButton);
    setupHighlightToSave();
  }

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
      
      const isUser = messageEl.getAttribute('data-testid') === 'user-message';
      const exchange = getFullExchange(messageEl, isUser ? 'user' : 'assistant');
      
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

  function getFullExchange(messageEl, role) {
    let userContent = '';
    let assistantContent = '';
    
    // Claude's DOM structure - traverse siblings
    const allMessages = document.querySelectorAll('[data-testid="user-message"], [data-testid="ai-message"]');
    const messageArray = Array.from(allMessages);
    const currentIndex = messageArray.indexOf(messageEl);
    
    if (role === 'assistant') {
      assistantContent = messageEl.innerText;
      // Find preceding user message
      for (let i = currentIndex - 1; i >= 0; i--) {
        if (messageArray[i].getAttribute('data-testid') === 'user-message') {
          userContent = messageArray[i].innerText;
          break;
        }
      }
    } else {
      userContent = messageEl.innerText;
      // Find following assistant message
      for (let i = currentIndex + 1; i < messageArray.length; i++) {
        if (messageArray[i].getAttribute('data-testid') === 'ai-message') {
          assistantContent = messageArray[i].innerText;
          break;
        }
      }
    }
    
    if (userContent && assistantContent) {
      return `**Human:**\n${userContent}\n\n**Claude:**\n${assistantContent}`;
    }
    return messageEl.innerText;
  }

  function setupHighlightToSave() {
    let tooltip = null;
    
    document.addEventListener('mouseup', (e) => {
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
        
        setTimeout(() => {
          if (tooltip) {
            tooltip.remove();
            tooltip = null;
          }
        }, 5000);
      }
    });
  }

  async function saveMoment(content) {
    try {
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
          source: 'claude',
          sourceUrl: window.location.href,
          rawText: content,
        }),
      });
      
      if (response.ok) {
        exchangeCount = 0;
        return true;
      }
      
      console.error('[ThreadMind] Save failed:', await response.text());
      return false;
    } catch (err) {
      console.error('[ThreadMind] Save error:', err);
      return false;
    }
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'threadmind-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function checkForNudge() {
    const assistantMessages = document.querySelectorAll('[data-testid="ai-message"]');
    exchangeCount = assistantMessages.length;
    
    const now = Date.now();
    if (exchangeCount >= NUDGE_THRESHOLD && (now - lastNudgeTime) > NUDGE_COOLDOWN) {
      showNudge();
      lastNudgeTime = now;
    }
  }

  function showNudge() {
    const existing = document.querySelector('.threadmind-nudge');
    if (existing) return;
    
    const nudge = document.createElement('div');
    nudge.className = 'threadmind-nudge';
    nudge.innerHTML = `
      <h4>🧠 Long session detected!</h4>
      <p>You've had ${exchangeCount}+ exchanges. Want to save any key moments?</p>
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
    
    document.getElementById('tm-dismiss').onclick = () => nudge.remove();
    
    setTimeout(() => nudge.remove(), 30000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
