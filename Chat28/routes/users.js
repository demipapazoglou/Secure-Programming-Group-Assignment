// routes/users.js
const express = require("express");
const jwt = require("jsonwebtoken"); 
const router = express.Router();

const SAFE_PROJECTION = { _id: 0, user_id: 1, username: 1, email: 1, pubkey: 1, meta: 1 };

// helper: get a Set of online user_ids from app.locals (supports a few shapes)
function getOnlineIdSet(app) {
  const s = new Set();

  // Preferred: app.locals.onlineUsers is a Map<user_id, {ws,...}>
  if (app.locals && app.locals.onlineUsers instanceof Map) {
    for (const key of app.locals.onlineUsers.keys()) s.add(key);
  }

  // Also accept: app.locals.user_locations = { [user_id]: {...} }
  else if (app.locals && app.locals.user_locations && typeof app.locals.user_locations === "object") {
    for (const key of Object.keys(app.locals.user_locations)) s.add(key);
  }

  // Or: app.locals.wsClients = Map or Object
  else if (app.locals && app.locals.wsClients) {
    const c = app.locals.wsClients;
    if (c instanceof Map) for (const key of c.keys()) s.add(key);
    else if (typeof c === "object") for (const key of Object.keys(c)) s.add(key);
  }

  return s;
}

// JWT Authentication middleware
function authenticateToken(req, res, next) {
  const auth = req.headers["authorization"];
  if (!auth) return res.status(401).json({ error: "No token" });

  try {
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// GET /users  -> online only (default). Add ?all=true to return all users.
router.get("/", authenticateToken, async (req, res) => {
  try {
    const dbm = req.app.locals.db;
    const db = dbm.db || dbm.getDb?.() || dbm; // support either style
    const usersCol = db.collection ? db.collection("users") : dbm.users;

    const wantAll = String(req.query.all || "").toLowerCase() === "true";

    if (wantAll) {
      // Get all users from database using the new method
      const users = await dbm.getAllUsers ? 
        await dbm.getAllUsers() : 
        await usersCol.find({}, { projection: SAFE_PROJECTION }).toArray();
      return res.json({ mode: "all", count: users.length, users });
    }

    // online only
    const onlineIds = Array.from(getOnlineIdSet(req.app));
    if (onlineIds.length === 0) return res.json({ mode: "online", count: 0, users: [] });

    const users = await usersCol
      .find({ user_id: { $in: onlineIds } }, { projection: SAFE_PROJECTION })
      .toArray();

    res.json({ mode: "online", count: users.length, users });
  } catch (err) {
    console.error("Error in GET /users:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /users/online  -> always online only (no ?all switch here)
router.get("/online", authenticateToken, async (req, res) => {
  try {
    const dbm = req.app.locals.db;
    const db = dbm.db || dbm.getDb?.() || dbm;
    const usersCol = db.collection ? db.collection("users") : dbm.users;

    const onlineIds = Array.from(getOnlineIdSet(req.app));
    if (onlineIds.length === 0) return res.json({ mode: "online", count: 0, users: [] });

    const users = await usersCol
      .find({ user_id: { $in: onlineIds } }, { projection: SAFE_PROJECTION })
      .toArray();

    res.json({ mode: "online", count: users.length, users });
  } catch (err) {
    console.error("Error in GET /users/online:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// NEW: GET /users/all -> all users with status (for /list command)
router.get("/all", authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    
    // Get all users from database
    const allUsers = await db.getAllUsers();
    
    // Get online users from WebSocket state
    const onlineUsers = req.app.locals.onlineUsers || new Map();
    const onlineUserIds = new Set(onlineUsers.keys());
    
    // Mark users as online/offline
    const usersWithStatus = allUsers.map(user => ({
      ...user,
      meta: {
        ...user.meta,
        status: onlineUserIds.has(user.user_id) ? 'online' : 'offline'
      }
    }));
    
    res.json({
      mode: "all",
      count: usersWithStatus.length,
      users: usersWithStatus
    });
    
  } catch (err) {
    console.error("List all users error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /users/:id  -> that user if online (add ?all=true to bypass online filter)
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const dbm = req.app.locals.db;
    const db = dbm.db || dbm.getDb?.() || dbm;
    const usersCol = db.collection ? db.collection("users") : dbm.users;

    const { id } = req.params;
    const wantAll = String(req.query.all || "").toLowerCase() === "true";

    // if not ?all=true, enforce "online only"
    if (!wantAll) {
      const onlineIds = getOnlineIdSet(req.app);
      if (!onlineIds.has(id)) return res.status(404).json({ error: "User not online" });
    }

    const user = await usersCol.findOne({ user_id: id }, { projection: SAFE_PROJECTION });
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("Error in GET /users/:id:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;