// /**
//  * Chat28
//  * Group: UG 28
//  * Students: Samira Hazara | Demi Papazoglou | Caitlin Joyce Martyr | Amber Yaa Wen Chew | Grace Baek 
//  * Course: COMP SCI 3307
//  * Assignment: Advanced Secure Protocol Design, Implementation and Review
//  */

// // Global state
// let ws = null;
// let currentUsername = null;
// let currentUserPrivateKey = null;
// let currentUserPublicKey = null;
// let onlineUsers = new Set();
// let publicKeysCache = new Map();
// let currentMessageType = 'public';

// // ========== CRYPTO FUNCTIONS ==========
// class CryptoHelper {
//     static async importPublicKey(pemKey) {
//         const pemHeader = "-----BEGIN PUBLIC KEY-----";
//         const pemFooter = "-----END PUBLIC KEY-----";
//         const pemContents = pemKey.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '');
//         const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

//         return await crypto.subtle.importKey(
//             'spki',
//             binaryDer,
//             { name: 'RSA-OAEP', hash: 'SHA-256' },
//             true,
//             ['encrypt']
//         );
//     }

//     static async importPrivateKey(pemKey) {
//         const pemHeader = "-----BEGIN PRIVATE KEY-----";
//         const pemFooter = "-----END PRIVATE KEY-----";
//         const pemContents = pemKey.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '');
//         const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

//         return await crypto.subtle.importKey(
//             'pkcs8',
//             binaryDer,
//             { name: 'RSA-OAEP', hash: 'SHA-256' },
//             true,
//             ['decrypt']
//         );
//     }

//     static async encrypt(plaintext, publicKeyPem) {
//         const publicKey = await this.importPublicKey(publicKeyPem);
//         const encoded = new TextEncoder().encode(plaintext);
//         const encrypted = await crypto.subtle.encrypt(
//             { name: 'RSA-OAEP' },
//             publicKey,
//             encoded
//         );
//         return this.arrayBufferToBase64Url(encrypted);
//     }

//     static async decrypt(ciphertextBase64, privateKeyPem) {
//         const privateKey = await this.importPrivateKey(privateKeyPem);
//         const ciphertext = this.base64UrlToArrayBuffer(ciphertextBase64);
//         const decrypted = await crypto.subtle.decrypt(
//             { name: 'RSA-OAEP' },
//             privateKey,
//             ciphertext
//         );
//         return new TextDecoder().decode(decrypted);
//     }

//     static arrayBufferToBase64Url(buffer) {
//         const bytes = new Uint8Array(buffer);
//         let binary = '';
//         for (let i = 0; i < bytes.byteLength; i++) {
//             binary += String.fromCharCode(bytes[i]);
//         }
//         return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
//     }

//     static base64UrlToArrayBuffer(base64url) {
//         const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
//         const binary = atob(base64);
//         const bytes = new Uint8Array(binary.length);
//         for (let i = 0; i < binary.length; i++) {
//             bytes[i] = binary.charCodeAt(i);
//         }
//         return bytes.buffer;
//     }
// }

// // ========== INITIALISATION ==========
// // document.addEventListener('DOMContentLoaded', async () => {
// //     console.log('[INIT] Starting Chat28...');

// //     const params = new URLSearchParams(window.location.search);
// //     const u = params.get('u') || localStorage.getItem('activeUser');

// //     if (!u) {
// //         window.location.href = '/login.html';
// //         return;
// //     }
// //     currentUsername = u;

// //     // pull per-user values
// //     const token = localStorage.getItem(`token_${u}`);
// //     currentUserPublicKey = localStorage.getItem(`publicKey_${u}`);
// //     currentUserPrivateKey = localStorage.getItem(`privateKey_${u}`);

// //     if (!token || !currentUserPublicKey) {
// //         alert('Missing credentials. Please login again.');
// //         logout();
// //         return;
// //     }

// //     // keep token in a variable for the WS auth step
// //     window.__tokenForWS = token;


// //     currentUsername = localStorage.getItem('username');
// //     currentUserPublicKey = localStorage.getItem('publicKey');
// //     currentUserPrivateKey = localStorage.getItem(`privateKey_${currentUsername}`);

// //     if (!currentUsername || !currentUserPublicKey) {
// //         alert('Missing credentials. Please login again.');
// //         logout();
// //         return;
// //     }

// //     if (!currentUserPrivateKey) {
// //         console.warn('[INIT] No private key - cannot decrypt messages');
// //     }

// //     console.log('[INIT] Logged in as:', currentUsername);

// //     // Update UI
// //     updateConnectionStatus('connecting');

// //     // Connect WebSocket
// //     connectWebSocket();
// // });
// // ========== INITIALISATION ==========
// document.addEventListener('DOMContentLoaded', async () => {
//     console.log('[INIT] Starting Chat28...');

//     const params = new URLSearchParams(window.location.search);
//     const usernameFromUrl = params.get('u');
    
//     if (!usernameFromUrl) {
//         window.location.href = '/login.html';
//         return;
//     }

//     currentUsername = usernameFromUrl;

//     // Get credentials for this specific user
//     const token = localStorage.getItem(`token_${currentUsername}`);
//     currentUserPublicKey = localStorage.getItem(`publicKey_${currentUsername}`);
//     currentUserPrivateKey = localStorage.getItem(`privateKey_${currentUsername}`);

//     console.log('[INIT] Token exists:', !!token);
//     console.log('[INIT] Public key exists:', !!currentUserPublicKey);
//     console.log('[INIT] Private key exists:', !!currentUserPrivateKey);

//     if (!token || !currentUserPublicKey) {
//         alert('Missing credentials. Please login again.');
//         logout();
//         return;
//     }

//     // Store token for WebSocket auth
//     window.__tokenForWS = token;

//     console.log('[INIT] Logged in as:', currentUsername);

//     // Update UI
//     updateConnectionStatus('connecting');

//     // Connect WebSocket
//     connectWebSocket();
// });
// // ========== WEBSOCKET CONNECTION ==========
// function connectWebSocket() {
//     const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
//     const wsUrl = `${protocol}//${window.location.host}`;

//     console.log('[WS] Connecting to:', wsUrl);
//     ws = new WebSocket(wsUrl);

//     ws.onopen = () => {
//         console.log('[WS] Connected');
//         updateConnectionStatus('connected');

//         // Authenticate
//         const token = window.__tokenForWS;
//         ws.send(JSON.stringify({ type: 'AUTH', token }));

//     };

//     ws.onmessage = (event) => {
//         try {
//             const message = JSON.parse(event.data);
//             handleMessage(message);
//         } catch (error) {
//             console.error('[WS] Parse error:', error);
//         }
//     };

//     ws.onclose = () => {
//         console.log('[WS] Disconnected');
//         updateConnectionStatus('disconnected');
//         setTimeout(connectWebSocket, 3000);
//     };

//     ws.onerror = (error) => {
//         console.error('[WS] Error:', error);
//         updateConnectionStatus('error');
//     };
// }

// // ========== MESSAGE HANDLING ==========
// function handleMessage(message) {
//     console.log('[WS] Received:', message.type);

//     switch (message.type) {
//         case 'AUTH_SUCCESS':
//             console.log('[AUTH] Success:', message.username);
//             displaySystemMessage('Connected as ' + message.username);
//             requestOnlineUsers();
//             break;

//         case 'MSG_PUBLIC':
//             displayPublicMessage(message.from, message.content, message.timestamp);
//             break;

//         case 'USER_DELIVER':
//             handleEncryptedMessage(message);
//             break;
        
//         // for file transfer:
//         case 'FILE_START':
//         case 'FILE_CHUNK':
//         case 'FILE_END':
//             handleEncryptedFileMessage(message);
//             break;

//         case 'ONLINE_USERS':
//             updateOnlineUsers(message.users);
//             break;

//         case 'USER_KEY':
//             publicKeysCache.set(message.username, message.publicKey);
//             console.log('[KEY] Cached key for:', message.username);
//             break;

//         case 'USER_JOIN':
//             if (message.username !== currentUsername) {
//                 displaySystemMessage(message.username + ' joined');
//                 requestOnlineUsers();
//             }
//             break;

//         case 'USER_LEAVE':
//             if (message.username !== currentUsername) {
//                 displaySystemMessage(message.username + ' left');
//                 requestOnlineUsers();
//             }
//             break;

//         case 'MSG_ERROR':
//             displaySystemMessage('Error: ' + message.error, 'error');
//             break;

//         case 'ERROR':
//             displaySystemMessage('Server error: ' + message.message, 'error');
//             break;
//     }
// }

// async function handleEncryptedMessage(message) {
//     const { from, payload } = message;
//     const { ciphertext, sender_pub } = payload;

//     console.log('[E2EE] Encrypted message from:', from);

//     if (!currentUserPrivateKey) {
//         displaySystemMessage('Cannot decrypt message - no private key', 'error');
//         return;
//     }

//     try {
//         const plaintext = await CryptoHelper.decrypt(ciphertext, currentUserPrivateKey);
//         displayPrivateMessage(from, plaintext, false);
//         console.log('[E2EE] Decrypted successfully');
//     } catch (error) {
//         console.error('[E2EE] Decryption failed:', error);
//         displaySystemMessage('Failed to decrypt message from ' + from, 'error');
//     }
// }

// // ========== SENDING MESSAGES ==========
// function sendMessage() {
//     const input = document.getElementById('messageInput');
//     const text = input.value.trim();

//     if (!text) return;

//     if (text.startsWith('/')) {
//         handleCommand(text);
//     } else {
//         if (currentMessageType === 'public') {
//             sendPublicMessage(text);
//         } else if (currentMessageType === 'private') {
//             sendPrivateMessage(text);
//         }
//     }

//     input.value = '';
// }

// // function sendPublicMessage(text) {
// //     if (!ws || ws.readyState !== WebSocket.OPEN) {
// //         displaySystemMessage('Not connected', 'error');
// //         return;
// //     }

// //     ws.send(JSON.stringify({
// //         type: 'MSG_PUBLIC',
// //         content: text
// //     }));

// //     displayPublicMessage(currentUsername, text, Date.now());
// // }

// function sendPublicMessage(text) {
//     if (!ws || ws.readyState !== WebSocket.OPEN) {
//         displaySystemMessage('Not connected', 'error');
//         return;
//     }

//     // Don't display immediately - wait for server broadcast
//     // Remove this line: displayPublicMessage(currentUsername, text, Date.now());

//     ws.send(JSON.stringify({
//         type: 'MSG_PUBLIC',
//         content: text
//     }));
// }

// async function sendPrivateMessage(text) {
//     const recipientSelect = document.getElementById('recipientSelect');
//     const recipient = recipientSelect.value;

//     if (!recipient) {
//         displaySystemMessage('Please select a recipient', 'error');
//         return;
//     }

//     if (!ws || ws.readyState !== WebSocket.OPEN) {
//         displaySystemMessage('Not connected', 'error');
//         return;
//     }

//     try {
//         // Get recipient public key
//         let recipientKey = publicKeysCache.get(recipient);

//         if (!recipientKey) {
//             ws.send(JSON.stringify({
//                 type: 'GET_USER_KEY',
//                 username: recipient
//             }));

//             await new Promise(resolve => setTimeout(resolve, 1000));
//             recipientKey = publicKeysCache.get(recipient);

//             if (!recipientKey) {
//                 throw new Error('Could not get recipient key');
//             }
//         }

//         // Encrypt message
//         const ciphertext = await CryptoHelper.encrypt(text, recipientKey);

//         // Send encrypted message
//         ws.send(JSON.stringify({
//             type: 'MSG_DIRECT',
//             to: recipient,
//             ciphertext: ciphertext,
//             sender_pub: currentUserPublicKey,
//             content_sig: 'placeholder_signature'
//         }));

//         displayPrivateMessage(recipient, text, true);
//         console.log('[E2EE] Sent encrypted message to:', recipient);

//     } catch (error) {
//         console.error('[E2EE] Encryption failed:', error);
//         displaySystemMessage('Failed to send: ' + error.message, 'error');
//     }
// }

// // ========== COMMANDS ==========
// async function handleCommand(text) {
//     const parts = text.split(' ');
//     const command = parts[0].toLowerCase();

//     switch (command) {
//         case '/list':
//             requestOnlineUsers();
//             break;

//         case '/tell':
//             if (parts.length < 3) {
//                 displaySystemMessage('Usage: /tell <username> <message>', 'error');
//                 return;
//             }
//             const recipient = parts[1];
//             const message = parts.slice(2).join(' ');

//             // Set recipient and send
//             document.getElementById('recipientSelect').value = recipient;
//             await sendPrivateMessage(message);
//             break;

//         case '/all':
//             if (parts.length < 2) {
//                 displaySystemMessage('Usage: /all <message>', 'error');
//                 return;
//             }
//             sendPublicMessage(parts.slice(1).join(' '));
//             break;

//         default:
//             displaySystemMessage('Unknown command: ' + command, 'error');
//     }
// }

// // ========== UI FUNCTIONS ==========
// function displayPublicMessage(from, content, timestamp) {
//     const container = document.getElementById('messageContainer');
//     const div = document.createElement('div');
//     div.className = from === currentUsername ? 'my message' : 'other message';

//     const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
//     div.innerHTML = `
//         <div class="message-content">
//             <div class="message-header">
//                 <span class="message-sender">${escapeHtml(from)}</span>
//                 <span>Public</span>
//             </div>
//             <div class="text">${escapeHtml(content)}</div>
//             <div class="message-time">${time}</div>
//         </div>
//     `;

//     container.appendChild(div);
//     container.scrollTop = container.scrollHeight;
// }

// function displayPrivateMessage(user, content, isSent) {
//     const container = document.getElementById('messageContainer');
//     const div = document.createElement('div');
//     div.className = isSent ? 'my message private-message' : 'other message private-message';

//     const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
//     const label = isSent ? `To ${user}` : `From ${user}`;

//     div.innerHTML = `
//         <div class="message-content">
//             <div class="message-header">
//                 <span class="message-sender">🔒 ${label}</span>
//                 <span>Private (E2EE)</span>
//             </div>
//             <div class="text">${escapeHtml(content)}</div>
//             <div class="message-time">${time}</div>
//         </div>
//     `;

//     container.appendChild(div);
//     container.scrollTop = container.scrollHeight;
// }

// function displaySystemMessage(text, type = 'info') {
//     const container = document.getElementById('messageContainer');
//     const div = document.createElement('div');
//     div.className = 'system-message' + (type === 'error' ? ' error' : '');
//     div.textContent = text;
//     container.appendChild(div);
//     container.scrollTop = container.scrollHeight;
// }

// function updateOnlineUsers(users) {
//     onlineUsers = new Set(users);

//     const container = document.getElementById('onlineUsers');
//     const recipientSelect = document.getElementById('recipientSelect');

//     container.innerHTML = '';
//     recipientSelect.innerHTML = '<option value="">Select a user...</option>';

//     users.forEach(user => {
//         if (user !== currentUsername) {
//             // Sidebar user item
//             const userDiv = document.createElement('div');
//             userDiv.className = 'user-item online';
//             userDiv.innerHTML = `
//                 <div class="user-avatar"></div>
//                 <span class="user-name">${escapeHtml(user)}</span>
//                 <button class="dm-btn" onclick="startPrivateChat('${user}')">DM</button>
//             `;
//             container.appendChild(userDiv);

//             // Recipient select option
//             const option = document.createElement('option');
//             option.value = user;
//             option.textContent = user;
//             recipientSelect.appendChild(option);

//             // Request public key
//             if (!publicKeysCache.has(user)) {
//                 ws.send(JSON.stringify({
//                     type: 'GET_USER_KEY',
//                     username: user
//                 }));
//             }
//         }
//     });

//     document.getElementById('memberCount').textContent = users.length;
//     document.getElementById('chatSubtitle').textContent = `${users.length} members online`;
// }

// function updateConnectionStatus(status) {
//     const statusEl = document.getElementById('connectionStatus');
//     const configs = {
//         connecting: { icon: 'fa-circle-notch fa-spin', text: 'Connecting...', color: '#ffa500' },
//         connected: { icon: 'fa-circle', text: 'Connected', color: '#4CAF50' },
//         disconnected: { icon: 'fa-circle', text: 'Reconnecting...', color: '#ff9800' },
//         error: { icon: 'fa-exclamation-triangle', text: 'Error', color: '#f44336' }
//     };

//     const config = configs[status] || configs.error;
//     statusEl.innerHTML = `<i class="fa-solid ${config.icon}" style="color: ${config.color};"></i> ${config.text}`;
// }

// function setMessageType(type, button) {
//     currentMessageType = type;
//     document.querySelectorAll('.type-btn').forEach(btn => btn.classList.remove('active'));
//     button.classList.add('active');
//     document.getElementById('recipientSelector').style.display = type === 'private' ? 'block' : 'none';
// }

// function startPrivateChat(username) {
//     const privateBtn = document.querySelectorAll('.type-btn')[1];
//     setMessageType('private', privateBtn);
//     document.getElementById('recipientSelect').value = username;
//     document.getElementById('messageInput').focus();
// }

// function requestOnlineUsers() {
//     if (ws && ws.readyState === WebSocket.OPEN) {
//         ws.send(JSON.stringify({
//             type: 'GET_ONLINE_USERS'
//         }));
//     }
// }

// function reconnectWebSocket() {
//     if (ws) ws.close();
//     connectWebSocket();
// }

// function toggleMode() {
//     const body = document.body;
//     const currentTheme = body.dataset.theme || 'light';
//     const newTheme = currentTheme === 'light' ? 'dark' : 'light';
//     body.dataset.theme = newTheme;
//     localStorage.setItem('theme', newTheme);
// }

// function logout() {
//     if (confirm('Logout?')) {
//         const u = currentUsername || localStorage.getItem('activeUser');
//         if (u) {
//             localStorage.removeItem(`token_${u}`);
//             localStorage.removeItem(`publicKey_${u}`);
//             localStorage.removeItem(`fingerprint_${u}`);
//             // localStorage.removeItem(`privateKey_${u}`);
//             if (localStorage.getItem('activeUser') === u) {
//                 localStorage.removeItem('activeUser');
//             }
//         }
//         if (ws) ws.close();
//         window.location.href = '/login.html';
//     }
// }


// function handleKeyPress(event) {
//     if (event.key === 'Enter' && !event.shiftKey) {
//         event.preventDefault();
//         sendMessage();
//     }
// }

// function adjustHeight(textarea) {
//     textarea.style.height = 'auto';
//     textarea.style.height = textarea.scrollHeight + 'px';
// }

// function escapeHtml(text) {
//     const div = document.createElement('div');
//     div.textContent = text;
//     return div.innerHTML;
// }

// // -------------------- FILE TRANSFER --------------------
// // const FILE_CHUNK_SIZE = 64 * 1024; // 64KB per chunk
// // let sendingInProgress = {}; // recipient -> transfer metadata
// // let receivingInProgress = {}; // transferId -> {chunks:[], meta}

// // // Called when user picks a file
// // async function onFileSelected(event) {
// //     const file = event.target.files[0];
// //     if (!file) return;

// //     // Ask which recipient (only for private file transfer)
// //     const recipientSelect = document.getElementById('recipientSelect');
// //     let recipient = recipientSelect.value;
// //     if (!recipient) {
// //         // if no recipient selected, try to prompt - we require a recipient for now
// //         recipient = prompt('Enter recipient username for the file (private transfer):');
// //         if (!recipient) {
// //             displaySystemMessage('File transfer cancelled: no recipient selected', 'error');
// //             return;
// //         }
// //     }

// //     // confirm
// //     if (!confirm(`Send "${file.name}" (${(file.size / 1024).toFixed(1)} KB) to ${recipient}?`)) {
// //         return;
// //     }

// //     try {
// //         await sendFile(file, recipient);
// //     } catch (err) {
// //         console.error('File send failed:', err);
// //         displaySystemMessage('File send failed: ' + err.message, 'error');
// //     } finally {
// //         // clear file input
// //         event.target.value = '';
// //     }
// // }

// // // Send file in chunks via WS using FILE_OFFER messages (wrapped by server routing)
// // async function sendFile(file, recipient) {
// //     if (!ws || ws.readyState !== WebSocket.OPEN) {
// //         throw new Error('Not connected');
// //     }

// //     // Generate a transfer ID
// //     const transferId = `${localStorage.getItem('username') || currentUsername}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
// //     const meta = {
// //         transferId,
// //         fileName: file.name,
// //         fileSize: file.size,
// //         fileType: file.type || 'application/octet-stream',
// //         from: currentUsername,
// //         to: recipient,
// //         chunkCount: Math.ceil(file.size / FILE_CHUNK_SIZE)
// //     };

// //     sendingInProgress[transferId] = { meta, sentChunks: 0 };

// //     displaySystemMessage(`Starting file transfer "${meta.fileName}" → ${recipient}`, 'info');
// //     document.getElementById('fileTransferStatus').textContent = `Sending ${meta.fileName} to ${recipient} — 0%`;

// //     // Send an initial FILE_OFFER message with metadata (recipient will accept/reject)
// //     ws.send(JSON.stringify({
// //         type: 'FILE_OFFER',
// //         to: recipient,
// //         transferId,
// //         fileName: meta.fileName,
// //         fileSize: meta.fileSize,
// //         fileType: meta.fileType,
// //         chunkCount: meta.chunkCount
// //     }));

// //     // Wait for FILE_ANSWER from recipient (accept/reject). We'll rely on server routing;
// //     // a real app would use a proper ack mechanism; here we poll receiving state for a short time.
// //     // We'll set up a promise that resolves when recipient sends FILE_ANSWER with accept=true

// //     const answer = await waitForFileAnswer(transferId, 30000); // 30s timeout
// //     if (!answer || !answer.accept) {
// //         delete sendingInProgress[transferId];
// //         document.getElementById('fileTransferStatus').textContent = '';
// //         displaySystemMessage('File transfer declined or timed out', 'error');
// //         return;
// //     }

// //     // Start streaming chunks
// //     const reader = file.stream().getReader();
// //     let chunkIndex = 0;
// //     let done = false;

// //     while (!done) {
// //         const { value, done: readerDone } = await reader.read();
// //         done = readerDone;
// //         if (value && value.length) {
// //             // send chunk (base64)
// //             const chunkArray = new Uint8Array(value);
// //             const chunkBase64 = arrayBufferToBase64(chunkArray);
// //             ws.send(JSON.stringify({
// //                 type: 'FILE_CHUNK',
// //                 to: recipient,
// //                 transferId,
// //                 index: chunkIndex,
// //                 data: chunkBase64
// //             }));

// //             chunkIndex++;
// //             sendingInProgress[transferId].sentChunks = chunkIndex;

// //             // update UI
// //             const percent = Math.floor((chunkIndex / meta.chunkCount) * 100);
// //             document.getElementById('fileTransferStatus').textContent = `Sending ${meta.fileName} — ${percent}% (${chunkIndex}/${meta.chunkCount})`;
// //         }
// //     }

// //     // finished - send FILE_COMPLETE
// //     ws.send(JSON.stringify({
// //         type: 'FILE_COMPLETE',
// //         to: recipient,
// //         transferId
// //     }));

// //     document.getElementById('fileTransferStatus').textContent = '';
// //     displaySystemMessage(`File transfer "${meta.fileName}" sent to ${recipient}`, 'info');
// //     delete sendingInProgress[transferId];
// // }

// // // Helper: wait for FILE_ANSWER routed back to us
// // function waitForFileAnswer(transferId, timeoutMs = 15000) {
// //     return new Promise((resolve) => {
// //         const key = `file_answer_${transferId}`;
// //         let resolved = false;

// //         function handler(message) {
// //             if (message.type === 'FILE_ANSWER' && message.transferId === transferId) {
// //                 resolved = true;
// //                 ws.removeEventListener('message', wsMessageProxy);
// //                 resolve(message);
// //             }
// //         }

// //         // We'll add a small proxy to ws.onmessage by wrapping JSON parse - integrate with existing handler
// //         function wsMessageProxy(event) {
// //             try {
// //                 const m = JSON.parse(event.data);
// //                 handler(m);
// //             } catch (e) { }
// //         }

// //         ws.addEventListener('message', wsMessageProxy);

// //         setTimeout(() => {
// //             if (!resolved) {
// //                 ws.removeEventListener('message', wsMessageProxy);
// //                 resolve(null);
// //             }
// //         }, timeoutMs);
// //     });
// // }

// // // Convert Uint8Array to base64 (browser)
// // function arrayBufferToBase64(buffer) {
// //     // buffer is Uint8Array
// //     let binary = '';
// //     const bytes = buffer;
// //     const len = bytes.byteLength;
// //     for (let i = 0; i < len; i++) {
// //         binary += String.fromCharCode(bytes[i]);
// //     }
// //     return btoa(binary);
// // }

// // // Convert base64 to Uint8Array
// // function base64ToUint8Array(base64) {
// //     const binary = atob(base64);
// //     const len = binary.length;
// //     const bytes = new Uint8Array(len);
// //     for (let i = 0; i < len; i++) {
// //         bytes[i] = binary.charCodeAt(i);
// //     }
// //     return bytes;
// // }

// // // Handle incoming file messages 
// // async function handleFileMessage(message) {
// //     switch (message.type) {
// //         case 'FILE_OFFER': {
// //             // Someone wants to send a file to us
// //             const { from, transferId, fileName, fileSize, fileType, chunkCount } = message;
// //             // Prompt accept/reject - keep simple
// //             const accept = confirm(`${from} wants to send "${fileName}" (${(fileSize / 1024).toFixed(1)} KB). Accept?`);
// //             // Send FILE_ANSWER (server will route to sender)
// //             ws.send(JSON.stringify({
// //                 type: 'FILE_ANSWER',
// //                 to: from,
// //                 transferId,
// //                 accept: !!accept
// //             }));
// //             if (accept) {
// //                 // Prepare receiving state
// //                 receivingInProgress[transferId] = {
// //                     from,
// //                     fileName,
// //                     fileSize,
// //                     fileType,
// //                     chunkCount,
// //                     chunks: [],
// //                     receivedCount: 0
// //                 };
// //                 displaySystemMessage(`Accepted file "${fileName}" from ${from}. Receiving...`);
// //                 document.getElementById('fileTransferStatus').textContent = `Receiving ${fileName} — 0%`;
// //             }
// //             break;
// //         }

// //         case 'FILE_CHUNK': {
// //             const { transferId, index, data } = message;
// //             const state = receivingInProgress[transferId];
// //             if (!state) {
// //                 console.warn('Received chunk for unknown transfer:', transferId);
// //                 return;
// //             }
// //             state.chunks[index] = data; // store base64 chunk
// //             state.receivedCount++;
// //             // update progress UI
// //             const percent = Math.floor((state.receivedCount / state.chunkCount) * 100);
// //             document.getElementById('fileTransferStatus').textContent = `Receiving ${state.fileName} — ${percent}% (${state.receivedCount}/${state.chunkCount})`;
// //             break;
// //         }

// //         case 'FILE_COMPLETE': {
// //             const { transferId } = message;
// //             const state = receivingInProgress[transferId];
// //             if (!state) return;
// //             const combined = state.chunks.join(''); // concatenated base64 string of chunks
// //             // convert base64 to binary
// //             const bytes = base64ToUint8Array(combined);
// //             const blob = new Blob([bytes], { type: state.fileType || 'application/octet-stream' });
// //             // create download link
// //             const url = URL.createObjectURL(blob);
// //             const a = document.createElement('a');
// //             a.href = url;
// //             a.download = state.fileName;
// //             document.body.appendChild(a);
// //             a.click();
// //             a.remove();
// //             URL.revokeObjectURL(url);

// //             displaySystemMessage(`Received file "${state.fileName}" from ${state.from}. Saved locally.`, 'info');
// //             document.getElementById('fileTransferStatus').textContent = '';
// //             delete receivingInProgress[transferId];
// //             break;
// //         }

// //         case 'FILE_ANSWER': {
// //             // these are handled by waitForFileAnswer in the sender; we also show feedback
// //             const { transferId, accept, from } = message;
// //             if (!accept) {
// //                 displaySystemMessage(`${from} declined file transfer ${transferId}`, 'error');
// //                 delete sendingInProgress[transferId];
// //                 document.getElementById('fileTransferStatus').textContent = '';
// //             } else {
// //                 displaySystemMessage(`${from} accepted file transfer ${transferId}. Upload starting...`, 'info');
// //             }
// //             break;
// //         }
// //     }
// // }

// // -------------------- FILE TRANSFER --------------------
// let receivingInProgress = {}; // file_id -> {chunks, metadata}

// // Called when user picks a file
// async function onFileSelected(event) {
//     const file = event.target.files[0];
//     if (!file) return;

//     // Ask which recipient (only for private file transfer)
//     const recipientSelect = document.getElementById('recipientSelect');
//     let recipient = recipientSelect.value;
//     if (!recipient) {
//         recipient = prompt('Enter recipient username for the file (private transfer):');
//         if (!recipient) {
//             displaySystemMessage('File transfer cancelled: no recipient selected', 'error');
//             return;
//         }
//     }

//     // confirm
//     if (!confirm(`Send "${file.name}" (${(file.size / 1024).toFixed(1)} KB) to ${recipient}?`)) {
//         return;
//     }

//     try {
//         await sendFile(file, recipient);
//     } catch (err) {
//         console.error('File send failed:', err);
//         displaySystemMessage('File send failed: ' + err.message, 'error');
//     } finally {
//         // clear file input
//         event.target.value = '';
//     }
// }

// // Send file using RSA-4096 encryption
// async function sendFile(file, recipient) {
//     if (!ws || ws.readyState !== WebSocket.OPEN) {
//         throw new Error('Not connected');
//     }

//     // Get recipient public key
//     let recipientKey = publicKeysCache.get(recipient);
//     if (!recipientKey) {
//         ws.send(JSON.stringify({
//             type: 'GET_USER_KEY',
//             username: recipient
//         }));
//         await new Promise(resolve => setTimeout(resolve, 1000));
//         recipientKey = publicKeysCache.get(recipient);
//         if (!recipientKey) {
//             throw new Error('Could not get recipient public key');
//         }
//     }

//     const fileId = `${currentUsername}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
//     // Calculate file hash
//     const fileBuffer = await file.arrayBuffer();
//     const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
//     const sha256 = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

//     // Send FILE_START (unencrypted metadata)
//     ws.send(JSON.stringify({
//         type: 'FILE_START',
//         from: currentUsername,
//         to: recipient,
//         ts: Date.now(),
//         payload: {
//             file_id: fileId,
//             name: file.name,
//             size: file.size,
//             sha256: sha256,
//             mode: 'dm'
//         }
//     }));

//     displaySystemMessage(`Starting encrypted file transfer "${file.name}" → ${recipient}`, 'info');
//     document.getElementById('fileTransferStatus').textContent = `Encrypting ${file.name} — 0%`;

//     // Encrypt and send file in chunks
//     const CHUNK_SIZE = 64 * 1024; // 64KB chunks (RSA can encrypt ~446 bytes at a time)
//     const reader = file.stream().getReader();
//     let chunkIndex = 0;
//     let bytesProcessed = 0;
//     let done = false;

//     while (!done) {
//         const { value, done: readerDone } = await reader.read();
//         done = readerDone;
        
//         if (value) {
//             // Convert chunk to base64 for RSA encryption
//             const chunkArray = new Uint8Array(value);
//             const chunkBase64 = arrayBufferToBase64(chunkArray);
            
//             try {
//                 // Encrypt chunk with recipient's public key
//                 const encryptedChunk = await CryptoHelper.encrypt(chunkBase64, recipientKey);
                
//                 // Send FILE_CHUNK with encrypted data
//                 ws.send(JSON.stringify({
//                     type: 'FILE_CHUNK',
//                     from: currentUsername,
//                     to: recipient,
//                     ts: Date.now(),
//                     payload: {
//                         file_id: fileId,
//                         index: chunkIndex,
//                         ciphertext: encryptedChunk
//                     }
//                 }));

//                 chunkIndex++;
//                 bytesProcessed += value.length;
                
//                 // Update progress
//                 const percent = Math.floor((bytesProcessed / file.size) * 100);
//                 document.getElementById('fileTransferStatus').textContent = 
//                     `Encrypting ${file.name} — ${percent}% (${Math.round(bytesProcessed/1024)}/${Math.round(file.size/1024)} KB)`;
                    
//             } catch (error) {
//                 console.error('Chunk encryption failed:', error);
//                 throw new Error('File encryption failed');
//             }
//         }
//     }

//     // Send FILE_END
//     ws.send(JSON.stringify({
//         type: 'FILE_END',
//         from: currentUsername,
//         to: recipient,
//         ts: Date.now(),
//         payload: { file_id: fileId }
//     }));

//     document.getElementById('fileTransferStatus').textContent = '';
//     displaySystemMessage(`File "${file.name}" sent encrypted to ${recipient}`, 'info');
// }

// // Handle incoming encrypted file transfers
// async function handleEncryptedFileMessage(message) {
//     const { type, from, payload, ts } = message;
    
//     switch (type) {
//         case 'FILE_START': {
//             const { file_id, name, size, sha256, mode } = payload;
            
//             // Store file metadata for receiving
//             if (!receivingInProgress[file_id]) {
//                 receivingInProgress[file_id] = {
//                     from: from,
//                     fileName: name,
//                     fileSize: size,
//                     fileHash: sha256,
//                     chunks: [],
//                     receivedCount: 0,
//                     totalChunks: Math.ceil(size / (64 * 1024))
//                 };
                
//                 displaySystemMessage(`Receiving encrypted file "${name}" from ${from}`, 'info');
//                 document.getElementById('fileTransferStatus').textContent = `Receiving ${name} — 0%`;
//             }
//             break;
//         }

//         case 'FILE_CHUNK': {
//             const { file_id, index, ciphertext } = payload;
//             const state = receivingInProgress[file_id];
            
//             if (!state) {
//                 console.warn('Received chunk for unknown file:', file_id);
//                 return;
//             }

//             try {
//                 // Decrypt chunk with our private key
//                 if (!currentUserPrivateKey) {
//                     throw new Error('No private key available for decryption');
//                 }
                
//                 const decryptedBase64 = await CryptoHelper.decrypt(ciphertext, currentUserPrivateKey);
//                 const decryptedChunk = base64ToUint8Array(decryptedBase64);
                
//                 // Store decrypted chunk
//                 state.chunks[index] = decryptedChunk;
//                 state.receivedCount++;
                
//                 // Update progress
//                 const percent = Math.floor((state.receivedCount / state.totalChunks) * 100);
//                 document.getElementById('fileTransferStatus').textContent = 
//                     `Receiving ${state.fileName} — ${percent}% (${state.receivedCount}/${state.totalChunks})`;
                    
//             } catch (error) {
//                 console.error('File chunk decryption failed:', error);
//                 displaySystemMessage(`Failed to decrypt file chunk from ${from}`, 'error');
//             }
//             break;
//         }

//         case 'FILE_END': {
//             const { file_id } = payload;
//             const state = receivingInProgress[file_id];
            
//             if (!state) return;

//             try {
//                 // Reconstruct file from decrypted chunks
//                 const totalSize = state.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
//                 const fileBuffer = new Uint8Array(totalSize);
//                 let offset = 0;
                
//                 for (let i = 0; i < state.chunks.length; i++) {
//                     if (state.chunks[i]) {
//                         fileBuffer.set(state.chunks[i], offset);
//                         offset += state.chunks[i].length;
//                     }
//                 }

//                 // Verify file hash
//                 const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
//                 const receivedHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
                
//                 if (receivedHash !== state.fileHash) {
//                     throw new Error('File integrity check failed - hashes do not match');
//                 }

//                 // Create download
//                 const blob = new Blob([fileBuffer], { type: 'application/octet-stream' });
//                 const url = URL.createObjectURL(blob);
//                 const a = document.createElement('a');
//                 a.href = url;
//                 a.download = state.fileName;
//                 document.body.appendChild(a);
//                 a.click();
//                 a.remove();
//                 URL.revokeObjectURL(url);

//                 displaySystemMessage(`Received and decrypted "${state.fileName}" from ${from}`, 'info');
//                 document.getElementById('fileTransferStatus').textContent = '';
                
//             } catch (error) {
//                 console.error('File reconstruction failed:', error);
//                 displaySystemMessage(`Failed to reconstruct file: ${error.message}`, 'error');
//             } finally {
//                 delete receivingInProgress[file_id];
//             }
//             break;
//         }
//     }
// }

// // Convert Uint8Array to base64 (browser)
// function arrayBufferToBase64(buffer) {
//     let binary = '';
//     const bytes = new Uint8Array(buffer);
//     const len = bytes.byteLength;
//     for (let i = 0; i < len; i++) {
//         binary += String.fromCharCode(bytes[i]);
//     }
//     return btoa(binary);
// }

// // Convert base64 to Uint8Array
// function base64ToUint8Array(base64) {
//     const binary = atob(base64);
//     const len = binary.length;
//     const bytes = new Uint8Array(len);
//     for (let i = 0; i < len; i++) {
//         bytes[i] = binary.charCodeAt(i);
//     }
//     return bytes;
// }


/**
 * Chat28
 * Group: UG 28
 * Students: Samira Hazara | Demi Papazoglou | Caitlin Joyce Martyr | Amber Yaa Wen Chew | Grace Baek 
 * Course: COMP SCI 3307
 * Assignment: Advanced Secure Protocol Design, Implementation and Review
 */

// Global state
let ws = null;
let currentUsername = null;
let currentUserPrivateKey = null;
let currentUserPublicKey = null;
let onlineUsers = new Set();
let publicKeysCache = new Map();
let currentMessageType = 'public';

// ========== CRYPTO FUNCTIONS ==========
class CryptoHelper {
    static async importPublicKey(pemKey) {
        const pemHeader = "-----BEGIN PUBLIC KEY-----";
        const pemFooter = "-----END PUBLIC KEY-----";
        const pemContents = pemKey.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '');
        const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

        return await crypto.subtle.importKey(
            'spki',
            binaryDer,
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            true,
            ['encrypt']
        );
    }

    static async importPrivateKey(pemKey) {
        const pemHeader = "-----BEGIN PRIVATE KEY-----";
        const pemFooter = "-----END PRIVATE KEY-----";
        const pemContents = pemKey.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '');
        const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

        return await crypto.subtle.importKey(
            'pkcs8',
            binaryDer,
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            true,
            ['decrypt']
        );
    }

    static async encrypt(plaintext, publicKeyPem) {
        const publicKey = await this.importPublicKey(publicKeyPem);
        const encoded = new TextEncoder().encode(plaintext);
        const encrypted = await crypto.subtle.encrypt(
            { name: 'RSA-OAEP' },
            publicKey,
            encoded
        );
        return this.arrayBufferToBase64Url(encrypted);
    }

    static async decrypt(ciphertextBase64, privateKeyPem) {
        const privateKey = await this.importPrivateKey(privateKeyPem);
        const ciphertext = this.base64UrlToArrayBuffer(ciphertextBase64);
        const decrypted = await crypto.subtle.decrypt(
            { name: 'RSA-OAEP' },
            privateKey,
            ciphertext
        );
        return new TextDecoder().decode(decrypted);
    }

    static arrayBufferToBase64Url(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }

    static base64UrlToArrayBuffer(base64url) {
        const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
}

// ========== INITIALISATION ==========
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[INIT] Starting Chat28...');

    const params = new URLSearchParams(window.location.search);
    const usernameFromUrl = params.get('u');
    
    if (!usernameFromUrl) {
        window.location.href = '/login.html';
        return;
    }

    currentUsername = usernameFromUrl;

    // Get credentials for this specific user
    const token = localStorage.getItem(`token_${currentUsername}`);
    currentUserPublicKey = localStorage.getItem(`publicKey_${currentUsername}`);
    currentUserPrivateKey = localStorage.getItem(`privateKey_${currentUsername}`);

    console.log('[INIT] Token exists:', !!token);
    console.log('[INIT] Public key exists:', !!currentUserPublicKey);
    console.log('[INIT] Private key exists:', !!currentUserPrivateKey);

    if (!token || !currentUserPublicKey) {
        alert('Missing credentials. Please login again.');
        logout();
        return;
    }

    // Store token for WebSocket auth
    window.__tokenForWS = token;

    console.log('[INIT] Logged in as:', currentUsername);

    // Update UI
    updateConnectionStatus('connecting');

    // Connect WebSocket
    connectWebSocket();
});

// ========== WEBSOCKET CONNECTION ==========
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    console.log('[WS] Connecting to:', wsUrl);
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('[WS] Connected');
        updateConnectionStatus('connected');

        // Authenticate
        const token = window.__tokenForWS;
        ws.send(JSON.stringify({ type: 'AUTH', token }));
    };

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            handleMessage(message);
        } catch (error) {
            console.error('[WS] Parse error:', error);
        }
    };

    ws.onclose = () => {
        console.log('[WS] Disconnected');
        updateConnectionStatus('disconnected');
        setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = (error) => {
        console.error('[WS] Error:', error);
        updateConnectionStatus('error');
    };
}

// ========== MESSAGE HANDLING ==========
function handleMessage(message) {
    console.log('[WS] Received:', message.type);

    switch (message.type) {
        case 'AUTH_SUCCESS':
            console.log('[AUTH] Success:', message.username);
            displaySystemMessage('Connected as ' + message.username);
            requestOnlineUsers();
            break;

        case 'MSG_PUBLIC':
            displayPublicMessage(message.from, message.content, message.timestamp);
            break;

        case 'USER_DELIVER':
            handleEncryptedMessage(message);
            break;
        
        // for file transfer:
        case 'FILE_START':
        case 'FILE_CHUNK':
        case 'FILE_END':
            handleEncryptedFileMessage(message);
            break;

        case 'ONLINE_USERS':
            updateOnlineUsers(message.users);
            break;

        case 'USER_KEY':
            publicKeysCache.set(message.username, message.publicKey);
            console.log('[KEY] Cached key for:', message.username);
            break;

        case 'USER_JOIN':
            if (message.username !== currentUsername) {
                displaySystemMessage(message.username + ' joined');
                requestOnlineUsers();
            }
            break;

        case 'USER_LEAVE':
            if (message.username !== currentUsername) {
                displaySystemMessage(message.username + ' left');
                requestOnlineUsers();
            }
            break;

        case 'MSG_ERROR':
            displaySystemMessage('Error: ' + message.error, 'error');
            break;

        case 'ERROR':
            displaySystemMessage('Server error: ' + message.message, 'error');
            break;
    }
}

async function handleEncryptedMessage(message) {
    const { from, payload } = message;
    const { ciphertext, sender_pub } = payload;

    console.log('[E2EE] Encrypted message from:', from);

    if (!currentUserPrivateKey) {
        displaySystemMessage('Cannot decrypt message - no private key', 'error');
        return;
    }

    try {
        const plaintext = await CryptoHelper.decrypt(ciphertext, currentUserPrivateKey);
        displayPrivateMessage(from, plaintext, false);
        console.log('[E2EE] Decrypted successfully');
    } catch (error) {
        console.error('[E2EE] Decryption failed:', error);
        displaySystemMessage('Failed to decrypt message from ' + from, 'error');
    }
}

// ========== SENDING MESSAGES ==========
function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();

    if (!text) return;

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
}

function sendPublicMessage(text) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        displaySystemMessage('Not connected', 'error');
        return;
    }

    ws.send(JSON.stringify({
        type: 'MSG_PUBLIC',
        content: text
    }));
}

async function sendPrivateMessage(text) {
    const recipientSelect = document.getElementById('recipientSelect');
    const recipient = recipientSelect.value;

    if (!recipient) {
        displaySystemMessage('Please select a recipient', 'error');
        return;
    }

    if (!ws || ws.readyState !== WebSocket.OPEN) {
        displaySystemMessage('Not connected', 'error');
        return;
    }

    try {
        // Get recipient public key
        let recipientKey = publicKeysCache.get(recipient);

        if (!recipientKey) {
            ws.send(JSON.stringify({
                type: 'GET_USER_KEY',
                username: recipient
            }));

            await new Promise(resolve => setTimeout(resolve, 1000));
            recipientKey = publicKeysCache.get(recipient);

            if (!recipientKey) {
                throw new Error('Could not get recipient key');
            }
        }

        // Encrypt message
        const ciphertext = await CryptoHelper.encrypt(text, recipientKey);

        // Send encrypted message
        ws.send(JSON.stringify({
            type: 'MSG_DIRECT',
            to: recipient,
            ciphertext: ciphertext,
            sender_pub: currentUserPublicKey,
            content_sig: 'placeholder_signature'
        }));

        displayPrivateMessage(recipient, text, true);
        console.log('[E2EE] Sent encrypted message to:', recipient);

    } catch (error) {
        console.error('[E2EE] Encryption failed:', error);
        displaySystemMessage('Failed to send: ' + error.message, 'error');
    }
}

// ========== COMMANDS ==========
async function handleCommand(text) {
    const parts = text.split(' ');
    const command = parts[0].toLowerCase();

    switch (command) {
        case '/list':
            requestOnlineUsers();
            break;

        case '/tell':
            if (parts.length < 3) {
                displaySystemMessage('Usage: /tell <username> <message>', 'error');
                return;
            }
            const recipient = parts[1];
            const message = parts.slice(2).join(' ');

            // Set recipient and send
            document.getElementById('recipientSelect').value = recipient;
            await sendPrivateMessage(message);
            break;

        case '/all':
            if (parts.length < 2) {
                displaySystemMessage('Usage: /all <message>', 'error');
                return;
            }
            sendPublicMessage(parts.slice(1).join(' '));
            break;

        default:
            displaySystemMessage('Unknown command: ' + command, 'error');
    }
}

// ========== UI FUNCTIONS ==========
function displayPublicMessage(from, content, timestamp) {
    const container = document.getElementById('messageContainer');
    const div = document.createElement('div');
    div.className = from === currentUsername ? 'my message' : 'other message';

    const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    div.innerHTML = `
        <div class="message-content">
            <div class="message-header">
                <span class="message-sender">${escapeHtml(from)}</span>
                <span>Public</span>
            </div>
            <div class="text">${escapeHtml(content)}</div>
            <div class="message-time">${time}</div>
        </div>
    `;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function displayPrivateMessage(user, content, isSent) {
    const container = document.getElementById('messageContainer');
    const div = document.createElement('div');
    div.className = isSent ? 'my message private-message' : 'other message private-message';

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const label = isSent ? `To ${user}` : `From ${user}`;

    div.innerHTML = `
        <div class="message-content">
            <div class="message-header">
                <span class="message-sender">🔒 ${label}</span>
                <span>Private (E2EE)</span>
            </div>
            <div class="text">${escapeHtml(content)}</div>
            <div class="message-time">${time}</div>
        </div>
    `;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function displaySystemMessage(text, type = 'info') {
    const container = document.getElementById('messageContainer');
    const div = document.createElement('div');
    div.className = 'system-message' + (type === 'error' ? ' error' : '');
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function updateOnlineUsers(users) {
    onlineUsers = new Set(users);

    const container = document.getElementById('onlineUsers');
    const recipientSelect = document.getElementById('recipientSelect');

    container.innerHTML = '';
    recipientSelect.innerHTML = '<option value="">Select a user...</option>';

    users.forEach(user => {
        if (user !== currentUsername) {
            // Sidebar user item
            const userDiv = document.createElement('div');
            userDiv.className = 'user-item online';
            userDiv.innerHTML = `
                <div class="user-avatar"></div>
                <span class="user-name">${escapeHtml(user)}</span>
                <button class="dm-btn" onclick="startPrivateChat('${user}')">DM</button>
            `;
            container.appendChild(userDiv);

            // Recipient select option
            const option = document.createElement('option');
            option.value = user;
            option.textContent = user;
            recipientSelect.appendChild(option);

            // Request public key
            if (!publicKeysCache.has(user)) {
                ws.send(JSON.stringify({
                    type: 'GET_USER_KEY',
                    username: user
                }));
            }
        }
    });

    document.getElementById('memberCount').textContent = users.length;
    document.getElementById('chatSubtitle').textContent = `${users.length} members online`;
}

function updateConnectionStatus(status) {
    const statusEl = document.getElementById('connectionStatus');
    const configs = {
        connecting: { icon: 'fa-circle-notch fa-spin', text: 'Connecting...', color: '#ffa500' },
        connected: { icon: 'fa-circle', text: 'Connected', color: '#4CAF50' },
        disconnected: { icon: 'fa-circle', text: 'Reconnecting...', color: '#ff9800' },
        error: { icon: 'fa-exclamation-triangle', text: 'Error', color: '#f44336' }
    };

    const config = configs[status] || configs.error;
    statusEl.innerHTML = `<i class="fa-solid ${config.icon}" style="color: ${config.color};"></i> ${config.text}`;
}

function setMessageType(type, button) {
    currentMessageType = type;
    document.querySelectorAll('.type-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    document.getElementById('recipientSelector').style.display = type === 'private' ? 'block' : 'none';
}

function startPrivateChat(username) {
    const privateBtn = document.querySelectorAll('.type-btn')[1];
    setMessageType('private', privateBtn);
    document.getElementById('recipientSelect').value = username;
    document.getElementById('messageInput').focus();
}

function requestOnlineUsers() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'GET_ONLINE_USERS'
        }));
    }
}

function reconnectWebSocket() {
    if (ws) ws.close();
    connectWebSocket();
}

function toggleMode() {
    const body = document.body;
    const currentTheme = body.dataset.theme || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    body.dataset.theme = newTheme;
    localStorage.setItem('theme', newTheme);
}

function logout() {
    if (confirm('Logout?')) {
        const u = currentUsername || localStorage.getItem('activeUser');
        if (u) {
            localStorage.removeItem(`token_${u}`);
            localStorage.removeItem(`publicKey_${u}`);
            localStorage.removeItem(`fingerprint_${u}`);
            if (localStorage.getItem('activeUser') === u) {
                localStorage.removeItem('activeUser');
            }
        }
        if (ws) ws.close();
        window.location.href = '/login.html';
    }
}

function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function adjustHeight(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== FILE TRANSFER (RSA-ONLY) ==========
let receivingInProgress = {}; // file_id -> {chunks, metadata}

// Called when user picks a file
async function onFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Ask which recipient
    const recipientSelect = document.getElementById('recipientSelect');
    let recipient = recipientSelect.value;
    if (!recipient) {
        recipient = prompt('Enter recipient username for the file (private transfer):');
        if (!recipient) {
            displaySystemMessage('File transfer cancelled: no recipient selected', 'error');
            return;
        }
    }

    // Format file size display
    const sizeDisplay = file.size < 1024 
        ? `${file.size} bytes` 
        : file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(1)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

    // Confirm
    if (!confirm(`Send "${file.name}" (${sizeDisplay}) to ${recipient}?`)) {
        return;
    }

    try {
        await sendFile(file, recipient);
    } catch (err) {
        console.error('File send failed:', err);
        displaySystemMessage('File send failed: ' + err.message, 'error');
    } finally {
        event.target.value = '';
    }
}

// Send file using RSA encryption (split into small chunks)
async function sendFile(file, recipient) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        throw new Error('Not connected');
    }

    // Get recipient public key
    let recipientKey = publicKeysCache.get(recipient);
    if (!recipientKey) {
        ws.send(JSON.stringify({
            type: 'GET_USER_KEY',
            username: recipient
        }));
        await new Promise(resolve => setTimeout(resolve, 1000));
        recipientKey = publicKeysCache.get(recipient);
        if (!recipientKey) {
            throw new Error('Could not get recipient public key');
        }
    }

    const fileId = `${currentUsername}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate file hash
    const fileBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
    const sha256 = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    // RSA-4096 with SHA-256 can encrypt max 446 bytes
    // We'll use 400 bytes to be safe
    const MAX_CHUNK_SIZE = 400;
    const fileBytes = new Uint8Array(fileBuffer);
    const totalChunks = Math.ceil(fileBytes.length / MAX_CHUNK_SIZE);

    // Send FILE_START
    ws.send(JSON.stringify({
        type: 'FILE_START',
        from: currentUsername,
        to: recipient,
        ts: Date.now(),
        payload: {
            file_id: fileId,
            name: file.name,
            size: file.size,
            sha256: sha256,
            mode: 'dm',
            total_chunks: totalChunks
        }
    }));

    displaySystemMessage(`Starting encrypted file transfer "${file.name}" → ${recipient}`, 'info');
    
    const statusEl = document.getElementById('fileTransferStatus');
    if (statusEl) {
        statusEl.textContent = `Encrypting ${file.name} — 0%`;
    }

    // Send file in small encrypted chunks
    for (let i = 0; i < totalChunks; i++) {
        const start = i * MAX_CHUNK_SIZE;
        const end = Math.min(start + MAX_CHUNK_SIZE, fileBytes.length);
        const chunk = fileBytes.slice(start, end);
        
        // Convert chunk to hex string for encryption (more reliable than base64)
        const chunkHex = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join('');
        
        try {
            // Encrypt chunk with recipient's public key
            const encryptedChunk = await CryptoHelper.encrypt(chunkHex, recipientKey);
            
            // Send FILE_CHUNK
            ws.send(JSON.stringify({
                type: 'FILE_CHUNK',
                from: currentUsername,
                to: recipient,
                ts: Date.now(),
                payload: {
                    file_id: fileId,
                    index: i,
                    ciphertext: encryptedChunk
                }
            }));

            // Update progress
            const percent = Math.floor(((i + 1) / totalChunks) * 100);
            if (statusEl) {
                statusEl.textContent = `Encrypting ${file.name} — ${percent}% (${i + 1}/${totalChunks})`;
            }
            
            // Small delay to avoid overwhelming the server
            if (i % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            
        } catch (error) {
            console.error('Chunk encryption failed:', error);
            throw new Error('File encryption failed at chunk ' + i);
        }
    }

    // Send FILE_END
    ws.send(JSON.stringify({
        type: 'FILE_END',
        from: currentUsername,
        to: recipient,
        ts: Date.now(),
        payload: { file_id: fileId }
    }));

    if (statusEl) {
        statusEl.textContent = '';
    }
    displaySystemMessage(`File "${file.name}" sent encrypted to ${recipient}`, 'info');
}

// Handle incoming encrypted file transfers
async function handleEncryptedFileMessage(message) {
    const { type, from, payload, ts } = message;
    
    switch (type) {
        case 'FILE_START': {
            const { file_id, name, size, sha256, mode, total_chunks } = payload;
            
            // Store file metadata for receiving
            if (!receivingInProgress[file_id]) {
                receivingInProgress[file_id] = {
                    from: from,
                    fileName: name,
                    fileSize: size,
                    fileHash: sha256,
                    chunks: [],
                    receivedCount: 0,
                    totalChunks: total_chunks || 0
                };
                
                displaySystemMessage(`Receiving encrypted file "${name}" from ${from}`, 'info');
                const statusEl = document.getElementById('fileTransferStatus');
                if (statusEl) {
                    statusEl.textContent = `Receiving ${name} — 0%`;
                }
            }
            break;
        }

        case 'FILE_CHUNK': {
            const { file_id, index, ciphertext } = payload;
            console.log(`[FILE] Received chunk ${index} for file ${file_id}`);
            console.log(`[FILE] Payload keys:`, Object.keys(payload));
            console.log(`[FILE] Ciphertext exists:`, !!ciphertext);
            
            const state = receivingInProgress[file_id];
            
            if (!state) {
                console.warn('Received chunk for unknown file:', file_id);
                return;
            }

            try {
                // Decrypt chunk with our private key
                if (!currentUserPrivateKey) {
                    throw new Error('No private key available for decryption');
                }
                
                console.log(`[FILE] Decrypting chunk ${index}, ciphertext length: ${ciphertext.length}`);
                const decryptedHex = await CryptoHelper.decrypt(ciphertext, currentUserPrivateKey);
                console.log(`[FILE] Decrypted hex length: ${decryptedHex.length}`);
                
                const decryptedChunk = hexToUint8Array(decryptedHex);
                console.log(`[FILE] Decrypted chunk bytes: ${decryptedChunk.length}`);
                
                // Store decrypted chunk
                state.chunks[index] = decryptedChunk;
                state.receivedCount++;
                
                // Update progress
                const percent = state.totalChunks > 0 
                    ? Math.floor((state.receivedCount / state.totalChunks) * 100)
                    : 0;
                    
                const statusEl = document.getElementById('fileTransferStatus');
                if (statusEl) {
                    statusEl.textContent = `Receiving ${state.fileName} — ${percent}% (${state.receivedCount}/${state.totalChunks})`;
                }
                    
            } catch (error) {
                console.error('File chunk decryption failed:', error);
                console.error('Error details:', error.message, error.stack);
                displaySystemMessage(`Failed to decrypt file chunk ${index} from ${from}: ${error.message}`, 'error');
            }
            break;
        }

        case 'FILE_END': {
            const { file_id } = payload;
            const state = receivingInProgress[file_id];
            
            if (!state) return;

            try {
                // Reconstruct file from decrypted chunks
                const totalSize = state.chunks.reduce((sum, chunk) => sum + (chunk ? chunk.length : 0), 0);
                const fileBuffer = new Uint8Array(totalSize);
                let offset = 0;
                
                for (let i = 0; i < state.chunks.length; i++) {
                    if (state.chunks[i]) {
                        fileBuffer.set(state.chunks[i], offset);
                        offset += state.chunks[i].length;
                    }
                }

                // Verify file hash
                const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
                const receivedHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
                
                if (receivedHash !== state.fileHash) {
                    throw new Error('File integrity check failed - hashes do not match');
                }

                // Create download
                const blob = new Blob([fileBuffer], { type: 'application/octet-stream' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = state.fileName;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);

                displaySystemMessage(`Received and decrypted "${state.fileName}" from ${from}`, 'info');
                
                const statusEl = document.getElementById('fileTransferStatus');
                if (statusEl) {
                    statusEl.textContent = '';
                }
                
            } catch (error) {
                console.error('File reconstruction failed:', error);
                displaySystemMessage(`Failed to reconstruct file: ${error.message}`, 'error');
            } finally {
                delete receivingInProgress[file_id];
            }
            break;
        }
    }
}

// Convert Uint8Array to base64
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Convert base64 to Uint8Array
function base64ToUint8Array(base64) {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

// Convert hex string to Uint8Array
function hexToUint8Array(hexString) {
    if (!hexString || hexString.length === 0) {
        return new Uint8Array(0);
    }
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
        bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
    }
    return bytes;
}