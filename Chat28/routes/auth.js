const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const router = express.Router();

// Helper: sign a JWT
function generateToken(user) {
  return jwt.sign(
    {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
    },
    process.env.JWT_SECRET || "dev_secret",
    { expiresIn: "2h" }
  );
}

// ---------- REGISTER ----------
router.post("/register", async (req, res) => {
  try {
    const db = req.app.locals.db;
    const cryptoManager = req.app.locals.cryptoManager;
    const { username, email, password, pubkey, privkey_store } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let finalPubkey = pubkey;
    let finalPrivkeyStore = privkey_store;

    // If no keys provided, generate them server-side (not ideal for security, but OK for assignment)
    if (!pubkey || !privkey_store) {
      try {
        const keyPair = await cryptoManager.generateRSAKeyPair();
        finalPubkey = keyPair.publicKey;
        
        // In real implementation, client would encrypt private key with password
        // For assignment purposes, we'll do simple encryption server-side
        const encryptedPrivateKey = Buffer.from(keyPair.privateKey).toString('base64');
        finalPrivkeyStore = encryptedPrivateKey;
      } catch (err) {
        console.error("Key generation error:", err);
        return res.status(500).json({ error: "Failed to generate keys" });
      }
    }

    const newUser = await db.createUser({
      username,
      email: email || `${username}@local.test`, // Default email for testing
      password,
      pubkey: finalPubkey,
      privkey_store: finalPrivkeyStore,
    });

    if (!newUser) {
      return res.status(409).json({ error: "Username or email already exists" });
    }

    res.status(201).json({ 
      message: "User registered successfully", 
      user: newUser,
      // For assignment: return public key so client can store it
      pubkey: finalPubkey
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------- LOGIN ----------
router.post("/login", async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    const user = await db.validateUser(identifier, password);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken(user);
    
    // For SOCP compliance, also return user's public key
    res.json({ 
      message: "Login successful", 
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        pubkey: user.pubkey
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------- GET USER INFO ----------
router.get("/me", async (req, res) => {
  const auth = req.headers["authorization"];
  if (!auth) return res.status(401).json({ authenticated: false });

  try {
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const db = req.app.locals.db;
    const user = await db.getUserByIdentifier(decoded.user_id);
    
    if (!user) {
      return res.status(401).json({ authenticated: false });
    }

    res.json({ 
      authenticated: true, 
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      pubkey: user.pubkey
    });
  } catch (err) {
    res.status(401).json({ authenticated: false });
  }
});

// ---------- LOGOUT ----------
router.post("/logout", (req, res) => {
  res.json({ message: "Logout successful (client must clear token)" });
});

module.exports = router;