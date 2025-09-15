// ws.js — Fixed version with better authentication and connection handling
const WebSocket = require('ws');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// helper function to make a standard message envelope
function pack(type, from, to, payload) {
  return { type, from, to, ts: Date.now(), payload };
}

function startWebSocketServer(httpServer, locals) {
  const db = locals?.db;
  const state = {
    selfServerId: `server_${uuidv4()}`,
    local_users: new Map(),    // username -> websocket
    user_connections: new Map(), // username -> array of websockets (for multiple tabs)
    user_locations: new Map(), // track where a user lives (here = 'local')
    publicChannelId: 'public',
  };

  const wss = new WebSocket.Server({ server: httpServer });

  // helper: send a frame to everyone connected (except maybe the sender)
  function fanoutLocal(frame, exceptWs = null) {
    for (const [username, connections] of state.user_connections) {
      connections.forEach(ws => {
        if (ws !== exceptWs && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(frame));
        }
      });
    }
  }

  // helper: send message to specific user (all their connections)
  function sendToUser(username, frame) {
    const connections = state.user_connections.get(username);
    if (connections) {
      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(frame));
        }
      });
    }
  }

  // helper: remove a websocket from user's connections
  function removeConnection(username, ws) {
    const connections = state.user_connections.get(username);
    if (connections) {
      const index = connections.indexOf(ws);
      if (index > -1) {
        connections.splice(index, 1);
      }
      
      // If no more connections for this user, remove them entirely
      if (connections.length === 0) {
        state.user_connections.delete(username);
        state.user_locations.delete(username);
        // Notify others that user went offline
        fanoutLocal(pack('USER_REMOVE', 'server', '*', { user_id: username }));
      }
    }
  }

  // helper: add connection for user
  function addConnection(username, ws) {
    if (!state.user_connections.has(username)) {
      state.user_connections.set(username, []);
      state.user_locations.set(username, 'local');
      // Notify others that user came online
      fanoutLocal(pack('USER_ADVERTISE', 'server', '*', { user_id: username }), ws);
    }
    state.user_connections.get(username).push(ws);
  }

  // Get current online users
  function getOnlineUsers() {
    return Array.from(state.user_locations.keys());
  }

  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection from:', req.connection.remoteAddress);
    
    // try pull username from jwt cookie
    let authedUser = null;
    try {
      const cookies = cookie.parse(req.headers.cookie || '');
      const token = cookies[process.env.JWT_COOKIE_NAME || 'chat28_token'];
      if (token) {
        const payload = jwt.verify(token, process.env.JWT_SECRET, {
          issuer: process.env.JWT_ISSUER || 'chat28'
        });
        authedUser = payload.sub; // username
        console.log('Authenticated user:', authedUser);
      }
    } catch (err) {
      console.log('Authentication failed:', err.message);
    }

    const ctx = { id: null }; // store the username for this ws

    ws.on('message', async (buf) => {
      let msg;
      try { 
        msg = JSON.parse(buf.toString('utf8')); 
        console.log('Received message from', authedUser + ':', msg);
      } catch { 
        return ws.send(JSON.stringify(pack('ERROR', 'server', '*', { code: 'BAD_JSON' }))); 
      }

      const { type, from, to, payload } = msg || {};
      if (!type || !payload) {
        return ws.send(JSON.stringify(pack('ERROR', 'server', from || '*', { code: 'MALFORMED' })));
      }

      switch (type) {
        case 'USER_HELLO': {
          if (!authedUser) {
            return ws.send(JSON.stringify(pack('ERROR', 'server', '*', { code: 'UNAUTHENTICATED' })));
          }
          
          const user = authedUser;
          console.log('User joining:', user);
          
          ctx.id = user;
          addConnection(user, ws);

          // Send current online list to the new user
          ws.send(JSON.stringify(pack('ONLINE_LIST', 'server', user, {
            online: getOnlineUsers()
          })));

          console.log('Current online users:', getOnlineUsers());
          break;
        }

        case 'MSG_DIRECT': {
          if (!authedUser || from !== authedUser) {
            console.log('Unauthorized direct message attempt');
            return;
          }
          
          const recipient = to;
          console.log(`Direct message from ${from} to ${recipient}: ${payload.text}`);
          
          // Send to recipient
          sendToUser(recipient, pack('USER_DELIVER', 'server', recipient, {
            sender: from,
            text: payload.text
          }));
          
          // Save to database
          if (db?.addMessage) {
            try { 
              await db.addMessage({ from, to: recipient, content: payload.text }); 
              console.log('Saved direct message to database');
            } catch (err) {
              console.error('Failed to save direct message:', err);
            }
          }
          break;
        }

        case 'MSG_PUBLIC_CHANNEL': {
          if (!authedUser || from !== authedUser) {
            console.log('Unauthorized public message attempt');
            return;
          }
          
          console.log(`Public message from ${from}: ${payload.text}`);
          
          const frame = pack('USER_DELIVER_PUBLIC', 'server', '*', {
            sender: from,
            group_id: state.publicChannelId,
            text: payload.text
          });
          fanoutLocal(frame);

          // Save to database
          if (db?.addMessage) {
            try { 
              await db.addMessage({ from, to: 'public', content: payload.text }); 
              console.log('Saved public message to database');
            } catch (err) {
              console.error('Failed to save public message:', err);
            }
          }
          break;
        }

        case 'FILE_START':
        case 'FILE_CHUNK':
        case 'FILE_END': {
          if (!authedUser || from !== authedUser) {
            console.log('Unauthorized file transfer attempt');
            return;
          }
          
          const mode = payload.mode || 'dm';
          console.log(`File transfer ${type} from ${from}, mode: ${mode}`);
          
          if (mode === 'public') {
            // Send to all users except sender
            fanoutLocal(pack(type, 'server', '*', { sender: from, ...payload }), ws);
          } else {
            // Send to specific recipient
            sendToUser(to, pack(type, 'server', to, { sender: from, ...payload }));
          }
          break;
        }

        case 'CMD_LIST': {
          if (!authedUser || from !== authedUser) return;
          ws.send(JSON.stringify(pack('ONLINE_LIST', 'server', from, {
            online: getOnlineUsers()
          })));
          break;
        }

        default:
          ws.send(JSON.stringify(pack('ERROR', 'server', from || '*', { code: 'UNKNOWN_TYPE', detail: type })));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
      if (ctx.id) {
        console.log('User leaving:', ctx.id);
        removeConnection(ctx.id, ws);
        console.log('Remaining online users:', getOnlineUsers());
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  console.log('WebSocket server initialized');
  return { wss };
}

module.exports = { startWebSocketServer };