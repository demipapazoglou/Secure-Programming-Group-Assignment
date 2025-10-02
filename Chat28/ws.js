// const WebSocket = require("ws");
// const { v4: uuidv4 } = require("uuid");

// function startSOCPWebSocketServer(httpServer, locals) {
//   const state = {
//     serverId: `server_${uuidv4()}`,
//     servers: new Map(),        
//     server_addrs: new Map(),   
//     local_users: new Map(),    
//     user_locations: new Map(), 
//   };

//   locals.onlineUsers = state.local_users;

//   const wss = new WebSocket.Server({ server: httpServer });

//   wss.on("connection", (ws) => {
//     console.log("[SOCP] New WebSocket connection");

//     ws.on("message", async (data) => {
//       let envelope;
//       try {
//         envelope = JSON.parse(data.toString());
//       } catch {
//         return sendError(ws, "INVALID_JSON");
//       }

//       // SOCP envelope validation
//       if (!envelope.type || !envelope.from || !envelope.ts || !envelope.payload) {
//         return sendError(ws, "MALFORMED_ENVELOPE");
//       }

//       //add sig verification 
//       if (envelope.type !== "USER_HELLO" && envelope.type !== "SERVER_HELLO_JOIN") {
//         if (!envelope.sig) {
//           return sendError(ws, "MISSING_SIGNATURE");
//         }
    
//         try {
//           // Get sender's public key based on who sent it
//           let senderPublicKey;
//           if (envelope.from.startsWith('server_')) {
//             // For servers, get from server_addrs or bootstrap config
//             senderPublicKey = "TODO_SERVER_PUBKEY"; // You'll need to implement server key storage
//           } else {
//             // For users, get from database
//             const user = await locals.db.getUserByIdentifier(envelope.from);
//             senderPublicKey = user?.pubkey;
//           }
          
//           if (!senderPublicKey) {
//             return sendError(ws, "UNKNOWN_SENDER");
//           }
      
//           const isValid = await locals.cryptoManager.verifyEnvelope(
//             envelope.payload, 
//             envelope.sig, 
//             senderPublicKey
//           );
          
//           if (!isValid) {
//             return sendError(ws, "INVALID_SIGNATURE");
//           }
//         } catch (error) {
//           console.error("Signature verification error:", error);
//           return sendError(ws, "SIG_VERIFICATION_ERROR");
//         }
//       }

//       console.log(`[SOCP] Received: ${envelope.type} from ${envelope.from}`);

//       switch (envelope.type) {
//         case "USER_HELLO":
//           await handleUserHello(ws, envelope, state, locals);
//           break;

//         case "USER_REMOVE":
//           handleUserRemove(ws, envelope, state);
//           break;

//         case "MSG_PUBLIC":
//         case "MSG_PRIVATE":
//         case "MSG_DIRECT":
//           await handleUserMessage(envelope, state, locals);
//           break;

//         case "SERVER_HELLO_JOIN":
//           handleServerJoin(ws, envelope, state);
//           break;

//         case "SERVER_WELCOME":
//           handleServerWelcome(ws, envelope, state);
//           break;

//         case "SERVER_ANNOUNCE":
//           handleServerAnnounce(envelope, state);
//           break;

//         case "HEARTBEAT":
//           handleHeartbeat(ws, envelope);
//           break;

//         default:
//           console.log("[SOCP] Unknown message type:", envelope.type);
//           sendError(ws, "UNKNOWN_TYPE");
//       }
//     });

//     ws.on("close", () => {
//       console.log("[SOCP] Connection closed");
//       if (ws.user_id) {
//         state.local_users.delete(ws.user_id);
//         state.user_locations.delete(ws.user_id);
//         gossipUserStatus(ws.user_id, "offline", state);
//         broadcastMemberList(state);
//       }
//     });

//     ws.on("error", (error) => {
//       console.error("[SOCP] WebSocket error:", error);
//     });
//   });

//   // ---------- SOCP Message Handlers ----------
//   async function handleUserHello(ws, envelope, state, locals) {
//     const { from, payload } = envelope;
//     const { client, pubkey, enc_pubkey } = payload;

//     // Check if user exists in database
//     const user = await locals.db.getUserByIdentifier(from);
//     if (!user) {
//       return sendError(ws, "USER_NOT_FOUND");
//     }

//     // Verify pubkey matches stored key (simplified verification)
//     if (pubkey && user.pubkey && pubkey !== user.pubkey) {
//       console.warn(`[SOCP] Pubkey mismatch for user ${from}`);
//       // In production, this should be stricter
//     }

//     // Register user connection
//     ws.user_id = from;
//     state.local_users.set(from, ws);
//     state.user_locations.set(from, "local");

//     console.log(`[SOCP] User ${from} connected with client ${client}`);

//     // Send member list to user
//     sendMemberList(ws, Array.from(state.local_users.keys()));

//     // Gossip user presence to other servers
//     gossipUserStatus(from, "online", state);

//     // Broadcast updated member list to all local users
//     broadcastMemberList(state);
//   }

//   function handleUserRemove(ws, envelope, state) {
//     const { from } = envelope;
    
//     state.local_users.delete(from);
//     state.user_locations.delete(from);
    
//     gossipUserStatus(from, "offline", state);
//     broadcastMemberList(state);
//   }

//   async function handleUserMessage(envelope, state, locals) {
//     const { type, from, to, payload } = envelope;

//     // Verify user is local
//     if (!state.local_users.has(from)) {
//       console.warn(`[SOCP] Message from non-local user: ${from}`);
//       return;
//     }

//     //add content sig verification for encrypted messages 
//     if ((type === "MSG_DIRECT" || type === "MSG_PUBLIC_CHANNEL") && payload.ciphertext) {
//       try {
//         const sender = await locals.db.getUserByIdentifier(from);
//         if (!sender?.pubkey) {
//           console.warn(`No public key for sender: ${from}`);
//           return;
//         }

//         // Verify content signature based on message type
//         let contentValid;
//         if (type === "MSG_DIRECT") {
//           contentValid = await locals.cryptoManager.verifyPrivateMsgContentSig(
//             payload.ciphertext,
//             from,
//             to,
//             envelope.ts,
//             payload.content_sig,
//             sender.pubkey
//           );
//         } else if (type === "MSG_PUBLIC_CHANNEL") {
//           contentValid = await locals.cryptoManager.verifyPublicCHContentSig(
//             payload.ciphertext,
//             from,
//             envelope.ts,
//             payload.content_sig,
//             sender.pubkey
//           );
//         }

//         if (!contentValid) {
//           console.warn(`Invalid content signature from: ${from}`);
//           return sendError(state.local_users.get(from), "INVALID_CONTENT_SIG");
//         }
//       } catch (error) {
//         console.error("Content signature verification failed:", error);
//         return;
//       }
//     }

//     if (type === "MSG_PUBLIC" || type === "MSG_PUBLIC_CHANNEL") {
//       // Broadcast to all local users (except sender)
//       for (const [userId, sock] of state.local_users) {
//         if (userId !== from) {
//           sock.send(JSON.stringify(envelope));
//         }
//       }

//       // Forward to other servers
//       for (const sock of state.servers.values()) {
//         sock.send(JSON.stringify(envelope));
//       }

//     } else if (type === "MSG_PRIVATE" || type === "MSG_DIRECT") {
//       // Route private message
//       if (state.local_users.has(to)) {
//         // Recipient is local
//         const recipientSocket = state.local_users.get(to);
        
//         // For SOCP compliance, wrap in USER_DELIVER
//         const deliveryEnvelope = {
//           type: "USER_DELIVER",
//           from: state.serverId,
//           to: to,
//           ts: Date.now(),
//           payload: {
//             ciphertext: payload.ciphertext || payload.text, // Handle both encrypted and plain
//             sender: from,
//             sender_pub: payload.sender_pub || "TODO_SENDER_PUBKEY",
//             content_sig: payload.content_sig || "TODO_CONTENT_SIG"
//           }
//         };
        
//         recipientSocket.send(JSON.stringify(deliveryEnvelope));
        
//       } else if (state.user_locations.has(to)) {
//         // Recipient is on another server
//         const targetServerId = state.user_locations.get(to);
//         if (state.servers.has(targetServerId)) {
//           const serverSocket = state.servers.get(targetServerId);
          
//           // Wrap in SERVER_DELIVER for routing
//           const routingEnvelope = {
//             type: "SERVER_DELIVER",
//             from: state.serverId,
//             to: targetServerId,
//             ts: Date.now(),
//             payload: {
//               user_id: to,
//               ciphertext: payload.ciphertext || payload.text,
//               sender: from,
//               sender_pub: payload.sender_pub || "TODO_SENDER_PUBKEY",
//               content_sig: payload.content_sig || "TODO_CONTENT_SIG"
//             }
//           };
          
//           serverSocket.send(JSON.stringify(routingEnvelope));
//         }
//       } else {
//         // User not found
//         const errorEnvelope = {
//           type: "ERROR",
//           from: state.serverId,
//           to: from,
//           ts: Date.now(),
//           payload: { code: "USER_NOT_FOUND", detail: `User ${to} not found` }
//         };
        
//         const senderSocket = state.local_users.get(from);
//         if (senderSocket) {
//           senderSocket.send(JSON.stringify(errorEnvelope));
//         }
//       }
//     }
//   }

//   function handleServerJoin(ws, envelope, state) {
//     const { from, payload } = envelope;
//     const { host, port, pubkey } = payload;

//     state.servers.set(from, ws);
//     state.server_addrs.set(from, { host, port });

//     // Send SERVER_WELCOME response
//     const welcomeEnvelope = {
//       type: "SERVER_WELCOME",
//       from: state.serverId,
//       to: from,
//       ts: Date.now(),
//       payload: {
//         assigned_id: from, // Echo back the same ID
//         clients: Array.from(state.local_users.keys()).map(userId => ({
//           user_id: userId,
//           host: "localhost", // Simplified
//           port: 3000,
//           pubkey: "TODO_USER_PUBKEY"
//         }))
//       }
//     };

//     ws.send(JSON.stringify(welcomeEnvelope));
//     console.log(`[SOCP] Server ${from} joined from ${host}:${port}`);
//   }

//   function handleServerWelcome(ws, envelope, state) {
//     const { from, payload } = envelope;
    
//     state.servers.set(from, ws);
    
//     // Process client list from remote server
//     if (payload.clients) {
//       payload.clients.forEach(client => {
//         state.user_locations.set(client.user_id, from);
//       });
//     }
    
//     console.log(`[SOCP] Received welcome from server ${from}`);
//   }

//   function handleServerAnnounce(envelope, state) {
//     const { payload } = envelope;
    
//     if (payload.user_id && payload.status) {
//       if (payload.status === "online") {
//         state.user_locations.set(payload.user_id, envelope.from);
//       } else if (payload.status === "offline") {
//         state.user_locations.delete(payload.user_id);
//       }
      
//       broadcastMemberList(state);
//     }
    
//     console.log("[SOCP] Server announcement:", payload);
//   }

//   function handleHeartbeat(ws, envelope) {
//     // Respond to heartbeat
//     const response = {
//       type: "HEARTBEAT",
//       from: state.serverId,
//       to: envelope.from,
//       ts: Date.now(),
//       payload: {}
//     };
    
//     ws.send(JSON.stringify(response));
//   }

//   // ---------- Helper Functions ----------
//   function gossipUserStatus(userId, status, state) {
//     const announcement = {
//       type: "SERVER_ANNOUNCE",
//       from: state.serverId,
//       to: "*",
//       ts: Date.now(),
//       payload: { user_id: userId, status }
//     };
    
//     for (const sock of state.servers.values()) {
//       sock.send(JSON.stringify(announcement));
//     }
//   }

//   function sendMemberList(ws, members) {
//     const envelope = {
//       type: "MEMBER_LIST",
//       from: state.serverId,
//       to: ws.user_id || "*",
//       ts: Date.now(),
//       payload: { members }
//     };
    
//     ws.send(JSON.stringify(envelope));
//   }

//   function broadcastMemberList(state) {
//     const allUsers = new Set([
//       ...state.local_users.keys(),
//       ...state.user_locations.keys()
//     ]);
    
//     const members = Array.from(allUsers);
    
//     for (const sock of state.local_users.values()) {
//       sendMemberList(sock, members);
//     }
//   }

//   function sendError(ws, code, detail = "") {
//     const errorEnvelope = {
//       type: "ERROR",
//       from: state.serverId,
//       to: "*",
//       ts: Date.now(),
//       payload: { code, detail }
//     };
    
//     ws.send(JSON.stringify(errorEnvelope));
//   }

//   console.log(`[SOCP] WebSocket server running with ID: ${state.serverId}`);
//   return state;
// }

// module.exports = { startSOCPWebSocketServer };

const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");

function startSOCPWebSocketServer(httpServer, locals) {
  const state = {
    serverId: `server_${uuidv4()}`,
    servers: new Map(),        
    server_addrs: new Map(),   
    local_users: new Map(),    
    user_locations: new Map(), 
  };

  locals.onlineUsers = state.local_users;

  const wss = new WebSocket.Server({ server: httpServer });

  wss.on("connection", (ws) => {
    console.log("[SOCP] New WebSocket connection");

    ws.on("message", async (data) => {
      let envelope;
      try {
        envelope = JSON.parse(data.toString());
      } catch {
        return sendError(ws, "INVALID_JSON");
      }

      // SOCP envelope validation
      if (!envelope.type || !envelope.from || !envelope.ts || !envelope.payload) {
        return sendError(ws, "MALFORMED_ENVELOPE");
      }

      console.log(`[SOCP] Received: ${envelope.type} from ${envelope.from}`);

      switch (envelope.type) {
        case "USER_HELLO":
          await handleUserHello(ws, envelope, state, locals);
          break;

        case "USER_REMOVE":
          handleUserRemove(ws, envelope, state);
          break;

        case "MSG_PUBLIC":
        case "MSG_PRIVATE":
        case "MSG_DIRECT":
          await handleUserMessage(envelope, state, locals);
          break;

        case "SERVER_HELLO_JOIN":
          handleServerJoin(ws, envelope, state);
          break;

        case "SERVER_WELCOME":
          handleServerWelcome(ws, envelope, state);
          break;

        case "SERVER_ANNOUNCE":
          handleServerAnnounce(envelope, state);
          break;

        case "HEARTBEAT":
          handleHeartbeat(ws, envelope);
          break;

        default:
          console.log("[SOCP] Unknown message type:", envelope.type);
          sendError(ws, "UNKNOWN_TYPE");
      }
    });

    ws.on("close", () => {
      console.log("[SOCP] Connection closed");
      if (ws.user_id) {
        state.local_users.delete(ws.user_id);
        state.user_locations.delete(ws.user_id);
        gossipUserStatus(ws.user_id, "offline", state);
        broadcastMemberList(state);
      }
    });

    ws.on("error", (error) => {
      console.error("[SOCP] WebSocket error:", error);
    });
  });

  // ---------- SOCP Message Handlers ----------
  async function handleUserHello(ws, envelope, state, locals) {
    const { from, payload } = envelope;
    const { client, pubkey, enc_pubkey } = payload;

    // Check if user exists in database
    const user = await locals.db.getUserByIdentifier(from);
    if (!user) {
      return sendError(ws, "USER_NOT_FOUND");
    }

    // Verify pubkey matches stored key (simplified verification)
    if (pubkey && user.pubkey && pubkey !== user.pubkey) {
      console.warn(`[SOCP] Pubkey mismatch for user ${from}`);
      // In production, this should be stricter
    }

    // Register user connection
    ws.user_id = from;
    state.local_users.set(from, ws);
    state.user_locations.set(from, "local");

    console.log(`[SOCP] User ${from} connected with client ${client}`);

    // Send member list to user
    sendMemberList(ws, Array.from(state.local_users.keys()));

    // Gossip user presence to other servers
    gossipUserStatus(from, "online", state);

    // Broadcast updated member list to all local users
    broadcastMemberList(state);
  }

  function handleUserRemove(ws, envelope, state) {
    const { from } = envelope;
    
    state.local_users.delete(from);
    state.user_locations.delete(from);
    
    gossipUserStatus(from, "offline", state);
    broadcastMemberList(state);
  }

  async function handleUserMessage(envelope, state, locals) {
    const { type, from, to, payload } = envelope;

    // Verify user is local
    if (!state.local_users.has(from)) {
      console.warn(`[SOCP] Message from non-local user: ${from}`);
      return;
    }

    if (type === "MSG_PUBLIC" || type === "MSG_PUBLIC_CHANNEL") {
      // Broadcast to all local users (except sender)
      for (const [userId, sock] of state.local_users) {
        if (userId !== from) {
          sock.send(JSON.stringify(envelope));
        }
      }

      // Forward to other servers
      for (const sock of state.servers.values()) {
        sock.send(JSON.stringify(envelope));
      }

    } else if (type === "MSG_PRIVATE" || type === "MSG_DIRECT") {
      // Route private message
      if (state.local_users.has(to)) {
        // Recipient is local
        const recipientSocket = state.local_users.get(to);
        
        // For SOCP compliance, wrap in USER_DELIVER
        const deliveryEnvelope = {
          type: "USER_DELIVER",
          from: state.serverId,
          to: to,
          ts: Date.now(),
          payload: {
            ciphertext: payload.ciphertext || payload.text, // Handle both encrypted and plain
            sender: from,
            sender_pub: payload.sender_pub || "TODO_SENDER_PUBKEY",
            content_sig: payload.content_sig || "TODO_CONTENT_SIG"
          }
        };
        
        recipientSocket.send(JSON.stringify(deliveryEnvelope));
        
      } else if (state.user_locations.has(to)) {
        // Recipient is on another server
        const targetServerId = state.user_locations.get(to);
        if (state.servers.has(targetServerId)) {
          const serverSocket = state.servers.get(targetServerId);
          
          // Wrap in SERVER_DELIVER for routing
          const routingEnvelope = {
            type: "SERVER_DELIVER",
            from: state.serverId,
            to: targetServerId,
            ts: Date.now(),
            payload: {
              user_id: to,
              ciphertext: payload.ciphertext || payload.text,
              sender: from,
              sender_pub: payload.sender_pub || "TODO_SENDER_PUBKEY",
              content_sig: payload.content_sig || "TODO_CONTENT_SIG"
            }
          };
          
          serverSocket.send(JSON.stringify(routingEnvelope));
        }
      } else {
        // User not found
        const errorEnvelope = {
          type: "ERROR",
          from: state.serverId,
          to: from,
          ts: Date.now(),
          payload: { code: "USER_NOT_FOUND", detail: `User ${to} not found` }
        };
        
        const senderSocket = state.local_users.get(from);
        if (senderSocket) {
          senderSocket.send(JSON.stringify(errorEnvelope));
        }
      }
    }
  }

  function handleServerJoin(ws, envelope, state) {
    const { from, payload } = envelope;
    const { host, port, pubkey } = payload;

    state.servers.set(from, ws);
    state.server_addrs.set(from, { host, port });

    // Send SERVER_WELCOME response
    const welcomeEnvelope = {
      type: "SERVER_WELCOME",
      from: state.serverId,
      to: from,
      ts: Date.now(),
      payload: {
        assigned_id: from, // Echo back the same ID
        clients: Array.from(state.local_users.keys()).map(userId => ({
          user_id: userId,
          host: "localhost", // Simplified
          port: 3000,
          pubkey: "TODO_USER_PUBKEY"
        }))
      }
    };

    ws.send(JSON.stringify(welcomeEnvelope));
    console.log(`[SOCP] Server ${from} joined from ${host}:${port}`);
  }

  function handleServerWelcome(ws, envelope, state) {
    const { from, payload } = envelope;
    
    state.servers.set(from, ws);
    
    // Process client list from remote server
    if (payload.clients) {
      payload.clients.forEach(client => {
        state.user_locations.set(client.user_id, from);
      });
    }
    
    console.log(`[SOCP] Received welcome from server ${from}`);
  }

  function handleServerAnnounce(envelope, state) {
    const { payload } = envelope;
    
    if (payload.user_id && payload.status) {
      if (payload.status === "online") {
        state.user_locations.set(payload.user_id, envelope.from);
      } else if (payload.status === "offline") {
        state.user_locations.delete(payload.user_id);
      }
      
      broadcastMemberList(state);
    }
    
    console.log("[SOCP] Server announcement:", payload);
  }

  function handleHeartbeat(ws, envelope) {
    // Respond to heartbeat
    const response = {
      type: "HEARTBEAT",
      from: state.serverId,
      to: envelope.from,
      ts: Date.now(),
      payload: {}
    };
    
    ws.send(JSON.stringify(response));
  }

  // ---------- Helper Functions ----------
  function gossipUserStatus(userId, status, state) {
    const announcement = {
      type: "SERVER_ANNOUNCE",
      from: state.serverId,
      to: "*",
      ts: Date.now(),
      payload: { user_id: userId, status }
    };
    
    for (const sock of state.servers.values()) {
      sock.send(JSON.stringify(announcement));
    }
  }

  function sendMemberList(ws, members) {
    const envelope = {
      type: "MEMBER_LIST",
      from: state.serverId,
      to: ws.user_id || "*",
      ts: Date.now(),
      payload: { members }
    };
    
    ws.send(JSON.stringify(envelope));
  }

  function broadcastMemberList(state) {
    const allUsers = new Set([
      ...state.local_users.keys(),
      ...state.user_locations.keys()
    ]);
    
    const members = Array.from(allUsers);
    
    for (const sock of state.local_users.values()) {
      sendMemberList(sock, members);
    }
  }

  function sendError(ws, code, detail = "") {
    const errorEnvelope = {
      type: "ERROR",
      from: state.serverId,
      to: "*",
      ts: Date.now(),
      payload: { code, detail }
    };
    
    ws.send(JSON.stringify(errorEnvelope));
  }

  console.log(`[SOCP] WebSocket server running with ID: ${state.serverId}`);
  return state;
}

module.exports = { startSOCPWebSocketServer };