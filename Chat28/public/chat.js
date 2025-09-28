// -------------------- State --------------------
let currentMessageType = 'public';
let dragCounter = 0;
let ws = null;
let currentUsername = null;
let onlineUsers = new Set();
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
let cryptoManager = null; 

// -------------------- Boot --------------------
document.addEventListener('DOMContentLoaded', () => {
  const chatContainer = document.querySelector('.chat-container');
  chatContainer.addEventListener('dragenter', handleDragEnter);
  chatContainer.addEventListener('dragleave', handleDragLeave);
  chatContainer.addEventListener('dragover', handleDragOver);
  chatContainer.addEventListener('drop', handleDrop);
  document.getElementById('messageInput').focus();
  cryptoManager = new CryptoManager();

  // Check authentication
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  currentUsername = localStorage.getItem('username') || 'Unknown';
  connectWebSocket();
});

// -------------------- WebSocket --------------------
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  updateConnectionStatus('connecting');

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    updateConnectionStatus('connected');
    reconnectAttempts = 0;
    // Send USER_HELLO as per SOCP
    sendWebSocketMessage('USER_HELLO', currentUsername, '*', {
      client: 'chat28-v1',
      pubkey: 'TODO_RSA_PUBKEY', // Will be generated properly later
      enc_pubkey: 'TODO_RSA_PUBKEY'
    });
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleWebSocketMessage(msg);
    } catch (e) {
      console.error('Bad JSON from WS:', e);
    }
  };

  ws.onclose = () => {
    updateConnectionStatus('disconnected');
    if (reconnectAttempts < maxReconnectAttempts) {
      const delay = Math.min(1000 * (2 ** reconnectAttempts), 10000);
      reconnectAttempts++;
      setTimeout(connectWebSocket, delay);
    }
  };

  ws.onerror = () => {
    updateConnectionStatus('error');
  };
}

function sendWebSocketMessage(type, from, to, payload) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    displaySystemMessage('Not connected. Try reconnect.');
    return;
  }
  ws.send(JSON.stringify({ type, from, to, ts: Date.now(), payload }));
}

// -------------------- WS Message Handling --------------------
async function handleWebSocketMessage(message) {
  const { type, from, payload } = message;

  switch (type) {
    case 'MEMBER_LIST': {
      const list = payload?.members || [];
      onlineUsers = new Set(list);
      renderOnlineUsers();
      updateMemberCount();
      break;
    }

    case 'MSG_PUBLIC': {
      const { text } = payload || {};
      if (typeof text === 'string') displayPublicMessage(from, text);
      break;
    }

    case 'MSG_PRIVATE': {
      const { text } = payload || {};
      if (typeof text === 'string') displayPrivateMessage(from, text);
      break;
    }

    case 'USER_DELIVER': {
      const { ciphertext, sender, sender_pub, content_sig } = payload || {};
      
      if (ciphertext) {
        try {
          //get current user's private key (need to store this during login)
          const userPrivateKey = localStorage.getItem('privkey_store');
          
          const decrypted = await cryptoManager.decryptPublicMessage(
            { ciphertext, content_sig, from: sender, ts: message.ts },
            userPrivateKey, 
            sender_pub
          );
          displayPublicMessage(sender, decrypted);
        } catch (error) {
          displaySystemMessage(`Failed to decrypt message from ${sender}`);
        }
      }
      break;
    }

    case 'ERROR': {
      const code = payload?.code || 'UNKNOWN_ERROR';
      displaySystemMessage(`Error: ${code}`);
      break;
    }

    default:
      console.log('[WS] unhandled type:', type, payload);
  }
}

// -------------------- UI Functions --------------------
function displayPublicMessage(sender, text) {
  const container = document.getElementById('messageContainer');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message public-message';
  
  const time = new Date().toLocaleTimeString();
  messageDiv.innerHTML = `
    <div class="message-header">
      <span class="sender">${escapeHtml(sender)}</span>
      <span class="timestamp">${time}</span>
    </div>
    <div class="message-content">${escapeHtml(text)}</div>
  `;
  
  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
}

function displayPrivateMessage(sender, text) {
  const container = document.getElementById('messageContainer');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message private-message';
  
  const time = new Date().toLocaleTimeString();
  messageDiv.innerHTML = `
    <div class="message-header">
      <span class="sender">🔒 ${escapeHtml(sender)}</span>
      <span class="timestamp">${time}</span>
    </div>
    <div class="message-content">${escapeHtml(text)}</div>
  `;
  
  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
}

function displaySystemMessage(text) {
  const container = document.getElementById('messageContainer');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message system-message';
  messageDiv.textContent = text;
  
  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
}

function renderOnlineUsers() {
  const container = document.getElementById('onlineUsers');
  const recipientSelect = document.getElementById('recipientSelect');
  
  container.innerHTML = '';
  recipientSelect.innerHTML = '<option value="">Select a user...</option>';
  
  onlineUsers.forEach(userId => {
    // Online users list
    const userDiv = document.createElement('div');
    userDiv.className = 'user-item online';
    userDiv.innerHTML = `
      <div class="user-status online"></div>
      <div class="user-name">${escapeHtml(userId)}</div>
    `;
    container.appendChild(userDiv);
    
    // Recipient dropdown (exclude self)
    if (userId !== currentUsername) {
      const option = document.createElement('option');
      option.value = userId;
      option.textContent = userId;
      recipientSelect.appendChild(option);
    }
  });
}

function updateConnectionStatus(status) {
  const statusElement = document.getElementById('connectionStatus');
  const statusMap = {
    connecting: { icon: 'fa-circle-notch fa-spin', text: 'Connecting...', class: 'connecting' },
    connected: { icon: 'fa-circle', text: 'Connected', class: 'connected' },
    disconnected: { icon: 'fa-circle', text: 'Disconnected', class: 'disconnected' },
    error: { icon: 'fa-exclamation-triangle', text: 'Error', class: 'error' }
  };
  
  const config = statusMap[status] || statusMap.error;
  statusElement.innerHTML = `<i class="fa-solid ${config.icon}"></i> ${config.text}`;
  statusElement.className = `connection-status ${config.class}`;
}

function updateMemberCount() {
  const countElement = document.getElementById('memberCount');
  if (countElement) {
    countElement.textContent = onlineUsers.size;
  }
  
  const subtitle = document.getElementById('chatSubtitle');
  if (subtitle) {
    subtitle.textContent = `${onlineUsers.size} online members`;
  }
}

// -------------------- Message Sending --------------------
function sendMessage() {
  const input = document.getElementById('messageInput');
  const text = input.value.trim();
  
  if (!text) return;
  
  // Check for SOCP mandatory commands
  if (text.startsWith('/')) {
    handleCommand(text);
  } else {
    if (currentMessageType === 'public') {
      sendPublicMessage(text);
    } else if (currentMessageType === 'private') {
      sendPrivateMessage(text);
    }
  }
  
  input.value = '';
  adjustHeight(input);
}

// -------------------- SOCP Mandatory Commands --------------------
function handleCommand(text) {
  const parts = text.split(' ');
  const command = parts[0].toLowerCase();
  
  switch (command) {
    case '/list':
      handleListCommand();
      break;
      
    case '/tell':
      if (parts.length < 3) {
        displaySystemMessage('Usage: /tell <username> <message>');
        return;
      }
      const recipient = parts[1];
      const message = parts.slice(2).join(' ');
      handleTellCommand(recipient, message);
      break;
      
    case '/all':
      if (parts.length < 2) {
        displaySystemMessage('Usage: /all <message>');
        return;
      }
      const publicMessage = parts.slice(1).join(' ');
      handleAllCommand(publicMessage);
      break;
      
    case '/file':
      if (parts.length < 3) {
        displaySystemMessage('Usage: /file <username> <filepath>');
        return;
      }
      const fileRecipient = parts[1];
      const filepath = parts.slice(2).join(' ');
      handleFileCommand(fileRecipient, filepath);
      break;
      
    default:
      displaySystemMessage(`Unknown command: ${command}. Available: /list, /tell, /all, /file`);
  }
}

async function handleListCommand() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('/users/all', {  // Changed from /api/users to /users/all
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (res.ok) {
      const data = await res.json();
      const userList = data.users.map(u => 
        `${u.username} (${u.meta?.status || 'unknown'})`
      ).join(', ');
      displaySystemMessage(`All users (${data.count}): ${userList}`);
    } else {
      displaySystemMessage('Failed to get user list');
    }
  } catch (err) {
    displaySystemMessage('Error getting user list: ' + err.message);
  }
}

// function handleTellCommand(recipient, message) {
//   // Use existing private message system but with command format
//   sendWebSocketMessage('MSG_DIRECT', currentUsername, recipient, { 
//     text: message,
//     ciphertext: message, // TODO: proper RSA encryption
//     sender_pub: localStorage.getItem('pubkey') || 'TODO_PUBKEY',
//     content_sig: 'TODO_CONTENT_SIG'
//   });
//   displayPrivateMessage(`To ${recipient}`, message);
// }

async function handleTellCommand(recipient, message) {
  //get recipient's public key from server
  const recipientPubKey = await getPublicKey(recipient);
  const userPrivateKey = localStorage.getItem('privkey'); // Need to store this
  
  //encrypt using cryptoManager
  const encrypted = await cryptoManager.encryptPrivateMessage(
    message, 
    recipientPubKey, 
    userPrivateKey, 
    currentUsername, 
    recipient
  );
  
  sendWebSocketMessage('MSG_DIRECT', currentUsername, recipient, encrypted);
  displayPrivateMessage(`To ${recipient}`, message);
}

function handleAllCommand(message) {
  // Send to public channel
  sendWebSocketMessage('MSG_PUBLIC_CHANNEL', currentUsername, 'public', { 
    text: message,
    ciphertext: message, // TODO: proper group encryption
    sender_pub: localStorage.getItem('pubkey') || 'TODO_PUBKEY',
    content_sig: 'TODO_CONTENT_SIG'
  });
  displayPublicMessage(currentUsername, message);
}

function handleFileCommand(recipient, filepath) {
  displaySystemMessage(`File transfer initiated: ${filepath} -> ${recipient}`);
  // TODO: Implement SOCP file transfer protocol
  // For now, just show the command was recognized
  displaySystemMessage('File transfer not yet implemented');
}

async function sendPublicMessage(text) {
  //get all public channel members' public keys
  const publicKeys = await getAllPublicChannelMemberKeys(); 
  
  // Encrypt the message (you'll need to implement multi-recipient encryption)
  const encrypted = await cryptoManager.encryptPublicMessage(
    text, 
    publicKeys, 
    currentUserPrivateKey, 
    currentUsername
  );

  // For SOCP compliance, this should be MSG_PUBLIC_CHANNEL with encryption
  // sendWebSocketMessage('MSG_PUBLIC', currentUsername, '*', { text });
  sendWebSocketMessage('MSG_PUBLIC_CHANNEL', currentUsername, 'public', encrypted); 
  displayPublicMessage(currentUsername, text); // Show locally
}

function sendPrivateMessage(text) {
  const recipient = document.getElementById('recipientSelect').value;
  if (!recipient) {
    alert('Please select a recipient for private messages');
    return;
  }
  
  // For SOCP compliance, this should be MSG_DIRECT with RSA encryption
  sendWebSocketMessage('MSG_PRIVATE', currentUsername, recipient, { text });
  displayPrivateMessage(`To ${recipient}`, text); // Show locally
}

function setMessageType(type, button) {
  currentMessageType = type;
  
  // Update button states
  document.querySelectorAll('.type-btn').forEach(btn => btn.classList.remove('active'));
  button.classList.add('active');
  
  // Show/hide recipient selector
  const recipientSelector = document.getElementById('recipientSelector');
  recipientSelector.style.display = type === 'private' ? 'block' : 'none';
}

// -------------------- Utility Functions --------------------
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function adjustHeight(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
}

function handleKeyPress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

// -------------------- File Handling --------------------
function handleDragEnter(e) {
  e.preventDefault();
  dragCounter++;
  document.getElementById('dropZone').style.display = 'flex';
}

function handleDragLeave(e) {
  e.preventDefault();
  dragCounter--;
  if (dragCounter === 0) {
    document.getElementById('dropZone').style.display = 'none';
  }
}

function handleDragOver(e) {
  e.preventDefault();
}

function handleDrop(e) {
  e.preventDefault();
  dragCounter = 0;
  document.getElementById('dropZone').style.display = 'none';
  
  const files = Array.from(e.dataTransfer.files);
  handleFiles(files);
}

function triggerFileInput() {
  document.getElementById('fileInput').click();
}

function handleFileSelect(event) {
  const files = Array.from(event.target.files);
  handleFiles(files);
}

function handleFiles(files) {
  files.forEach(file => {
    displaySystemMessage(`File selected: ${file.name} (${file.size} bytes)`);
    // TODO: Implement SOCP file transfer protocol
  });
}

// -------------------- UI Actions --------------------
function addEmoji() {
  const input = document.getElementById('messageInput');
  const emojis = ['😀', '😂', '😍', '🤔', '👍', '❤️', '🎉', '🔥'];
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];
  input.value += emoji;
  input.focus();
}

function reconnectWebSocket() {
  if (ws) {
    ws.close();
  }
  reconnectAttempts = 0;
  connectWebSocket();
}

function showProfile() {
  window.location.href = '/profile.html';
}

function showChannelInfo() {
  alert('Public Channel - All members can see messages here');
}

function toggleMode() {
  const body = document.body;
  const currentTheme = body.dataset.theme || 'light';
  body.dataset.theme = currentTheme === 'light' ? 'dark' : 'light';
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  window.location.href = '/login.html';
}