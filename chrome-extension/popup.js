// Popup script for ThreadMind extension

const API_BASE = 'https://memory-bot-omega.vercel.app';

// State
let threads = [];
let pendingSave = null;
let authToken = null;

// DOM ready
document.addEventListener('DOMContentLoaded', init);

async function init() {
  // Load auth token from storage (sync for cross-script access)
  const stored = await chrome.storage.sync.get(['threadmind_token']);
  authToken = stored.threadmind_token;
  
  // Check for pending save from context menu
  chrome.runtime.sendMessage({ action: 'getPendingSave' }, (response) => {
    pendingSave = response;
    render();
  });
}

async function render() {
  const content = document.getElementById('content');
  
  // Not logged in
  if (!authToken) {
    content.innerHTML = `
      <div class="bot-message">
        <div class="bot-name">Memory Bot</div>
        <p>Hey there! 👋 I'm your Memory Bot. I'll help you save the best bits from your AI chats!</p>
      </div>
      <div class="content-card">
        <div class="login-section">
          <p>Let's get you connected first:</p>
          <a href="${API_BASE}/settings" target="_blank">🔑 Get Your Token</a>
          <button class="btn btn-secondary" id="connectBtn" style="margin-top: 12px;">✨ Connect Account</button>
        </div>
      </div>
    `;
    
    document.getElementById('connectBtn').addEventListener('click', connectAccount);
    return;
  }
  
  // Has pending save
  if (pendingSave && pendingSave.text) {
    await loadThreads();
    renderSaveForm();
    return;
  }
  
  // No selection - show thread selector and instructions
  await loadThreads();
  const stored = await chrome.storage.sync.get(['threadmind_selected_thread']);
  const selectedThread = stored.threadmind_selected_thread;
  
  const threadOptions = threads.map(t => 
    `<option value="${t.id}" ${t.id === selectedThread ? 'selected' : ''}>${t.title}</option>`
  ).join('');
  
  content.innerHTML = `
    <div class="bot-message">
      <div class="bot-name">ThreadMind</div>
      <p>I'm ready! 🧠 Click the <strong>"Save"</strong> button on any AI message, or highlight text to save just part of it.</p>
    </div>
    <div class="content-card">
      <div class="form-group">
        <label for="defaultThread">📂 Default thread for quick saves:</label>
        <select id="defaultThread">
          <option value="">Select a thread...</option>
          ${threadOptions}
        </select>
      </div>
      <p style="font-size: 11px; color: #888; margin: 12px 0;">
        💡 Go to ChatGPT or Claude — you'll see a <strong>"🧠 Save"</strong> button on every message!
      </p>
      <div class="button-group">
        <a href="${API_BASE}/threads" target="_blank" class="btn btn-primary">📋 View Threads</a>
        <button class="btn btn-secondary" id="disconnectBtn">🔌 Disconnect</button>
      </div>
    </div>
  `;
  
  document.getElementById('defaultThread').addEventListener('change', async (e) => {
    await chrome.storage.sync.set({ threadmind_selected_thread: e.target.value });
    // Show confirmation
    const label = document.querySelector('label[for="defaultThread"]');
    label.textContent = '📂 ✓ Thread selected!';
    setTimeout(() => {
      label.textContent = '📂 Default thread for quick saves:';
    }, 1500);
  });
  
  document.getElementById('disconnectBtn').addEventListener('click', disconnectAccount);
}

async function loadThreads() {
  try {
    const response = await fetch(`${API_BASE}/api/threads`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token expired
        authToken = null;
        await chrome.storage.sync.remove(['threadmind_token']);
        render();
        return;
      }
      throw new Error('Failed to load threads');
    }
    
    const data = await response.json();
    threads = data.threads || [];
  } catch (error) {
    console.error('Error loading threads:', error);
    threads = [];
  }
}

function renderSaveForm() {
  const content = document.getElementById('content');
  const preview = pendingSave.text.length > 150 
    ? pendingSave.text.substring(0, 150) + '...' 
    : pendingSave.text;
  
  const threadOptions = threads.map(t => 
    `<option value="${t.id}">${t.title}</option>`
  ).join('');
  
  const sourceEmoji = {
    'chatgpt': '🟢',
    'claude': '🟠', 
    'gemini': '🔵',
    'perplexity': '🟣',
    'copilot': '💙'
  }[pendingSave.source] || '💬';
  
  content.innerHTML = `
    <div class="bot-message">
      <div class="bot-name">Memory Bot</div>
      <p>Ooh, nice find from ${sourceEmoji} <strong>${pendingSave.source}</strong>! 📸 Let me save this for you...</p>
    </div>
    
    <div class="content-card">
      <div id="message"></div>
      
      <div class="form-group">
        <div class="preview">"${escapeHtml(preview)}"</div>
        <p class="tip">📝 ${pendingSave.text.length} characters captured</p>
      </div>
      
      <form id="saveForm">
        <div class="form-group">
          <label for="title">✏️ Give it a name (optional)</label>
          <input type="text" id="title" placeholder="e.g., 'Cool regex trick'">
        </div>
        
        <div class="form-group">
          <label for="thread">📂 Save to thread</label>
          <select id="thread" required>
            <option value="">Pick a thread...</option>
            ${threadOptions}
            <option value="__new__">➕ Create new thread</option>
          </select>
        </div>
        
        <div id="newThreadSection" style="display: none;">
          <div class="new-thread-form">
            <input type="text" id="newThreadTitle" placeholder="New thread name...">
            <input type="text" id="newThreadDesc" placeholder="What's it about? (optional)">
          </div>
        </div>
        
        <button type="submit" class="btn btn-primary" id="saveBtn">💾 Save Memory</button>
      </form>
      
      <button class="btn btn-secondary" id="cancelBtn">❌ Nevermind</button>
    </div>
  `;
  
  // Event listeners
  document.getElementById('thread').addEventListener('change', (e) => {
    const newSection = document.getElementById('newThreadSection');
    newSection.style.display = e.target.value === '__new__' ? 'block' : 'none';
  });
  
  document.getElementById('saveForm').addEventListener('submit', handleSave);
  document.getElementById('cancelBtn').addEventListener('click', cancelSave);
}

async function handleSave(e) {
  e.preventDefault();
  
  const saveBtn = document.getElementById('saveBtn');
  const message = document.getElementById('message');
  
  saveBtn.disabled = true;
  saveBtn.textContent = '🔄 Saving...';
  
  try {
    let threadId = document.getElementById('thread').value;
    
    // Create new thread if needed
    if (threadId === '__new__') {
      const newTitle = document.getElementById('newThreadTitle').value.trim();
      if (!newTitle) {
        throw new Error('Oops! I need a name for the new thread 📝');
      }
      
      const newDesc = document.getElementById('newThreadDesc').value.trim();
      
      const threadResponse = await fetch(`${API_BASE}/api/threads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc || null
        })
      });
      
      if (!threadResponse.ok) {
        throw new Error('Hmm, couldn\'t create that thread. Try again? 🔄');
      }
      
      const threadData = await threadResponse.json();
      threadId = threadData.thread.id;
    }
    
    // Save the moment
    const title = document.getElementById('title').value.trim();
    
    const response = await fetch(`${API_BASE}/api/moments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        threadId: threadId,
        source: pendingSave.source,
        sourceUrl: pendingSave.sourceUrl,
        title: title || null,
        rawText: pendingSave.text
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Something went wrong! 😅 Try again?');
    }
    
    // Success! Show celebratory message
    const successMessages = [
      '🎉 Memory saved! You\'re building something great!',
      '✨ Got it! That one\'s in the vault!',
      '🧠 Locked in! Your future self will thank you!',
      '💾 Saved! Knowledge is power!',
      '🚀 Done! Another moment captured!'
    ];
    const randomSuccess = successMessages[Math.floor(Math.random() * successMessages.length)];
    
    message.className = 'message success';
    message.innerHTML = randomSuccess;
    
    // Clear pending save
    chrome.runtime.sendMessage({ action: 'clearPendingSave' });
    pendingSave = null;
    
    // Show success for a moment then close
    setTimeout(() => {
      window.close();
    }, 1800);
    
  } catch (error) {
    message.className = 'message error';
    message.textContent = error.message;
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 Save Memory';
  }
}

function cancelSave() {
  chrome.runtime.sendMessage({ action: 'clearPendingSave' });
  pendingSave = null;
  render();
}

async function connectAccount() {
  // Prompt user to paste their token
  const token = prompt('🧠 ThreadMind here! Paste your User ID from the Settings page:');
  
  if (token && token.trim()) {
    authToken = token.trim();
    // Save to sync storage so content scripts can access it
    await chrome.storage.sync.set({ 
      threadmind_token: authToken,
      threadmind_api_url: API_BASE
    });
    
    // Verify token works
    try {
      const response = await fetch(`${API_BASE}/api/threads`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (!response.ok) {
        throw new Error('Invalid token');
      }
      
      render();
    } catch (error) {
      alert('� Hmm, that token didn\'t work! Make sure you copied your User ID from Settings.');
      authToken = null;
      await chrome.storage.sync.remove(['threadmind_token']);
    }
  }
}

async function disconnectAccount() {
  if (!confirm('� Are you sure? I\'ll forget who you are... 😢')) {
    return;
  }
  authToken = null;
  await chrome.storage.sync.remove(['threadmind_token', 'threadmind_selected_thread']);
  render();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
