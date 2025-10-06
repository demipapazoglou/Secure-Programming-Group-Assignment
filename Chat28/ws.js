/**
 * Chat28
 * Group: UG 28
 * Students: Samira Hazara | Demi Papazoglou | Caitlin Joyce Martyr | Amber Yaa Wen Chew | Grace Baek 
 * Course: COMP SCI 3307
 * Assignment: Advanced Secure Protocol Design, Implementation and Review
 *
 * SOCP v1.3 Compliance:
 * - E2EE using RSA-4096, RSA-OAEP (SHA-256), RSASSA-PSS (SHA-256)
 * - MSG_DIRECT for encrypted messages (server cannot decrypt)
 * - Content signatures over: ciphertext || from || to || timestamp
 * - Loop prevention for message routing
 */

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { User } = require('./database');

const clients = new Map(); // username -> WebSocket
const rooms = new Map();   // roomName -> Set of usernames

// Message loop prevention - cache seen message IDs
const seenMessages = new Set();
const MAX_SEEN_CACHE = 10000;
let seenCacheArray = [];

let address;

function addToSeenCache(msgId) {
  if (!seenMessages.has(msgId)) {
    seenMessages.add(msgId);
    seenCacheArray.push(msgId);

    // Prevent memory leak - remove oldest if cache too large
    if (seenCacheArray.length > MAX_SEEN_CACHE) {
      const oldest = seenCacheArray.shift();
      seenMessages.delete(oldest);
    }
  }
}

function initialiseWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', async (ws, req) => {
    let username = null;

	address = req.socket.remoteAddress;

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data);

        // Authentication
        if (message.type === 'AUTH') {
          try {
            const decoded = jwt.verify(message.token, process.env.JWT_SECRET || 'your-secret-key');
            username = decoded.username;

            // Store connection
            clients.set(username, ws);

            // Send auth success
            ws.send(JSON.stringify({
              type: 'AUTH_SUCCESS',
              username: username
            }));

            // Broadcast user joined
            broadcast({
              type: 'USER_JOIN',
              username: username,
              timestamp: Date.now()
            }, username);

            console.log(`User authenticated: ${username}`);
          } catch (err) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: 'Authentication failed'
            }));
            ws.close();
          }
          return;
        }

        // All other messages require authentication
        if (!username) {
          ws.send(JSON.stringify({
            type: 'ERROR',
            message: 'Not authenticated'
          }));
          return;
        }

        // Handle different message types
        switch (message.type) {
          case 'MSG_PUBLIC':
            handlePublicMessage(username, message);
            break;

          case 'MSG_DIRECT':
            await handleDirectMessage(username, message);
            break;

          case 'GET_ONLINE_USERS':
            handleGetOnlineUsers(ws);
            break;

          case 'GET_USER_KEY':
            await handleGetUserKey(ws, message);
            break;

          case 'ROOM_CREATE':
            handleRoomCreate(username, message);
            break;

          case 'ROOM_JOIN':
            handleRoomJoin(username, message);
            break;

          case 'ROOM_LEAVE':
            handleRoomLeave(username, message);
            break;

          case 'ROOM_MESSAGE':
            handleRoomMessage(username, message);
            break;

          case 'FILE_START':
            handleFileStart(username, message);
            break;

          case 'FILE_CHUNK':
            handleFileChunk(username, message);
            break;

          case 'FILE_END':
            handleFileEnd(username, message);
            break;

          case 'FILE_OFFER':
            handleFileOffer(username, message);
            break;

          case 'FILE_ANSWER':
            handleFileAnswer(username, message);
            break;

          case 'ICE_CANDIDATE':
            handleIceCandidate(username, message);
            break;

          default:
            console.log(`Unknown message type: ${message.type}`);
        }
      } catch (err) {
        console.error('Message handling error:', err.message);
        ws.send(JSON.stringify({
          type: 'ERROR',
          message: 'Invalid message format'
        }));
      }
    });

    ws.on('close', () => {
      if (username) {
        // Remove from all rooms
        rooms.forEach((members, roomName) => {
          if (members.has(username)) {
            members.delete(username);
            broadcastToRoom(roomName, {
              type: 'ROOM_USER_LEFT',
              room: roomName,
              username: username
            });
          }
        });

        clients.delete(username);

        // Broadcast user left
        broadcast({
          type: 'USER_LEAVE',
          username: username,
          timestamp: Date.now()
        });

        console.log(`User disconnected: ${username}`);
      }
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err.message);
    });
  });

  console.log('WebSocket server initialized with SOCP v1.3 support');
}

// Public message broadcast with loop prevention
function handlePublicMessage(username, message) {
  const { content } = message;
  const timestamp = Date.now();
  
  // SOCP Loop Prevention: Use content + sender + time window (1 second)
  const timeWindow = Math.floor(timestamp / 1000);
  const msgId = `public:${username}:${content.substring(0, 100)}:${timeWindow}`;
  
  if (seenMessages.has(msgId)) {
    console.log(`[LOOP PREVENTED] Duplicate public message from ${username}`);
    return;
  }
  addToSeenCache(msgId);

  const msg = {
    type: 'MSG_PUBLIC',
    from: username,
    content: content,
    timestamp: timestamp
  };

  broadcast(msg);
  console.log(`[PUBLIC] ${username}: ${content}`);
}

// Direct encrypted message - SOCP MSG_DIRECT with loop prevention
async function handleDirectMessage(username, message) {
  const { to, ciphertext, sender_pub, content_sig } = message;

  if (!to || !ciphertext || !sender_pub || !content_sig) {
    console.error('Invalid MSG_DIRECT format');
    return;
  }

  // SOCP Loop Prevention: Use content_sig as unique identifier
  // Content signature includes ciphertext + from + to + timestamp, so it's unique per message
  const msgId = `direct:${username}:${to}:${content_sig}`;

  // Check if we've seen this message before
  if (seenMessages.has(msgId)) {
    console.log(`[LOOP PREVENTED] Duplicate MSG_DIRECT from ${username} to ${to}`);
    return;
  }
  addToSeenCache(msgId);

  // Server CANNOT and SHOULD NOT decrypt the message
  // This is E2EE - server is just a router
  console.log(`[E2EE MSG_DIRECT] ${username} -> ${to} (encrypted)`);

  // Wrap in USER_DELIVER and send to recipient
  const deliverMsg = {
    type: 'USER_DELIVER',
    from: username,
    to: to,
    payload: {
      ciphertext: ciphertext,
      sender_pub: sender_pub,
      content_sig: content_sig
    },
    timestamp: Date.now()
  };

  const recipientWs = clients.get(to);
  if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
    recipientWs.send(JSON.stringify(deliverMsg));
    console.log(`[DELIVERED] Message delivered to ${to}`);
  } else {
    // User offline - could store for later delivery
    console.log(`[OFFLINE] User ${to} is offline, message not delivered`);

    // Send error back to sender
    const senderWs = clients.get(username);
    if (senderWs && senderWs.readyState === WebSocket.OPEN) {
      senderWs.send(JSON.stringify({
        type: 'MSG_ERROR',
        error: 'Recipient offline',
        to: to
      }));
    }
  }
}

// File transfer handlers with loop prevention
function handleFileStart(username, message) {
  const { to, payload } = message;
  const { file_id } = payload;

  // Loop prevention for file transfers
  const msgId = `file_start:${username}:${to}:${file_id}`;
  if (seenMessages.has(msgId)) {
    console.log(`[LOOP PREVENTED] Duplicate FILE_START from ${username}`);
    return;
  }
  addToSeenCache(msgId);

  const recipientWs = clients.get(to);
  if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
    recipientWs.send(JSON.stringify({
      type: 'FILE_START',
      from: username,
      to: to,
      ts: Date.now(),
      payload: payload
    }));
    console.log(`[FILE] Transfer started: ${username} -> ${to}`);
  }
}

function handleFileChunk(username, message) {
  const { to, payload } = message;
  const { file_id, index } = payload;

  // Loop prevention for chunks
  const msgId = `file_chunk:${file_id}:${index}`;
  if (seenMessages.has(msgId)) {
    console.log(`[LOOP PREVENTED] Duplicate FILE_CHUNK ${index} for ${file_id}`);
    return;
  }
  addToSeenCache(msgId);

  const recipientWs = clients.get(to);
  if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
    recipientWs.send(JSON.stringify({
      type: 'FILE_CHUNK',
      from: username,
      to: to,
      ts: Date.now(),
      payload: payload
    }));
  }
}

function handleFileEnd(username, message) {
  const { to, payload } = message;
  const { file_id } = payload;

  // Loop prevention for file end
  const msgId = `file_end:${file_id}`;
  if (seenMessages.has(msgId)) {
    console.log(`[LOOP PREVENTED] Duplicate FILE_END for ${file_id}`);
    return;
  }
  addToSeenCache(msgId);

  const recipientWs = clients.get(to);
  if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
    recipientWs.send(JSON.stringify({
      type: 'FILE_END',
      from: username,
      to: to,
      ts: Date.now(),
      payload: payload
    }));
    console.log(`[FILE] Transfer completed: ${file_id}`);
  }
}

// Get list of online users
function handleGetOnlineUsers(ws) {
  const users = Array.from(clients.keys());
  ws.send(JSON.stringify({
    type: 'ONLINE_USERS',
    users: users
  }));
}

// Get public key for a user
async function handleGetUserKey(ws, message) {
  try {
    const user = await User.findOne({ username: message.username });
    if (user) {
      ws.send(JSON.stringify({
        type: 'USER_KEY',
        username: message.username,
        publicKey: user.publicKey,
        fingerprint: user.fingerprint
      }));
    } else {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'User not found'
      }));
    }
  } catch (err) {
    console.error('Error fetching user key:', err);
    ws.send(JSON.stringify({
      type: 'ERROR',
      message: 'Failed to fetch user key'
    }));
  }
}

// Room management
function handleRoomCreate(username, message) {
  const { room } = message;
  if (!rooms.has(room)) {
    rooms.set(room, new Set([username]));
    console.log(`Room created: ${room} by ${username}`);

    const ws = clients.get(username);
    if (ws) {
      ws.send(JSON.stringify({
        type: 'ROOM_CREATED',
        room: room
      }));
    }
  } else {
    const ws = clients.get(username);
    if (ws) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Room already exists'
      }));
    }
  }
}

function handleRoomJoin(username, message) {
  const { room } = message;
  if (rooms.has(room)) {
    rooms.get(room).add(username);

    const ws = clients.get(username);
    if (ws) {
      ws.send(JSON.stringify({
        type: 'ROOM_JOINED',
        room: room,
        members: Array.from(rooms.get(room))
      }));
    }

    // Notify other room members
    broadcastToRoom(room, {
      type: 'ROOM_USER_JOINED',
      room: room,
      username: username
    }, username);

    console.log(`${username} joined room: ${room}`);
  } else {
    const ws = clients.get(username);
    if (ws) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Room does not exist'
      }));
    }
  }
}

function handleRoomLeave(username, message) {
  const { room } = message;
  if (rooms.has(room)) {
    rooms.get(room).delete(username);

    // Notify room members
    broadcastToRoom(room, {
      type: 'ROOM_USER_LEFT',
      room: room,
      username: username
    });

    console.log(`${username} left room: ${room}`);

    // Delete room if empty
    if (rooms.get(room).size === 0) {
      rooms.delete(room);
      console.log(`Room deleted (empty): ${room}`);
    }
  }
}

function handleRoomMessage(username, message) {
  const { room, content } = message;
  if (rooms.has(room) && rooms.get(room).has(username)) {
    broadcastToRoom(room, {
      type: 'ROOM_MESSAGE',
      room: room,
      from: username,
      content: content,
      timestamp: Date.now()
    });

    console.log(`[ROOM ${room}] ${username}: ${content}`);
  }
}

// File transfer signaling
function handleFileOffer(username, message) {
  const { to, offer, fileName, fileSize } = message;
  const recipientWs = clients.get(to);

  if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
    recipientWs.send(JSON.stringify({
      type: 'FILE_OFFER',
      from: username,
      offer: offer,
      fileName: fileName,
      fileSize: fileSize
    }));
    console.log(`[FILE] Offer from ${username} to ${to}: ${fileName}`);
  }
}

function handleFileAnswer(username, message) {
  const { to, answer } = message;
  const recipientWs = clients.get(to);

  if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
    recipientWs.send(JSON.stringify({
      type: 'FILE_ANSWER',
      from: username,
      answer: answer
    }));
    console.log(`[FILE] Answer from ${username} to ${to}`);
  }
}

function handleIceCandidate(username, message) {
  const { to, candidate } = message;
  const recipientWs = clients.get(to);

  if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
    recipientWs.send(JSON.stringify({
      type: 'ICE_CANDIDATE',
      from: username,
      candidate: candidate
    }));
  }
}

// Broadcast to all connected clients
function broadcast(message, excludeUser = null) {
  const messageStr = JSON.stringify(message);
  clients.forEach((ws, user) => {
    if (user !== excludeUser && ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });
}

// Broadcast to room members
function broadcastToRoom(room, message, excludeUser = null) {
  if (!rooms.has(room)) return;

  const messageStr = JSON.stringify(message);
  const members = rooms.get(room);

  members.forEach(username => {
    if (username !== excludeUser) {
      const ws = clients.get(username);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    }
  });
}

module.exports = { initialiseWebSocket, address };