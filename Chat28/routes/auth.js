/**
 * Chat28
 * Group: UG 28
 * Students: Samira Hazara | Demi Papazoglou | Caitlin Joyce Martyr | Amber Yaa Wen Chew | Grace Baek 
 * Course: COMP SCI 3307
 * Assignment: Advanced Secure Protocol Design, Implementation and Review
 */

const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt"); 
const jwt = require("jsonwebtoken");
const { User } = require("../database");
const CryptoManager = require("../crypto/CryptoManager");

const cryptoManager = new CryptoManager();

const crypto = require('crypto');

// Helper function to encrypt private key with password
function encryptPrivateKey(privateKey, password) {
  // Derive key from password using PBKDF2
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  
  // Encrypt with AES-256-CBC
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Format: salt:iv:encryptedData
  return `${salt.toString('hex')}:${iv.toString('hex')}:${encrypted}`;
}

router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate RSA key pair
    const { publicKey, privateKey } = await cryptoManager.generateRSAKeyPair();

    // Encrypt private key with user's password (SOCP requirement)
    const privkey_store = encryptPrivateKey(privateKey, password);

    // Fingerprint = hash of public key
    const fingerprint = cryptoManager.base64urlEncode(
      Buffer.from(publicKey).subarray(0, 32)
    );

    const newUser = new User({
      username,
      password: hashedPassword,
      publicKey,
      privkey_store,  // Store encrypted private key
      fingerprint,
    });

    await newUser.save();

    const token = jwt.sign(
      { user_id: newUser.user_id, username: newUser.username },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "2h" }
    );

    res.status(201).json({
      user_id: newUser.user_id,
      username: newUser.username,
      token,
      publicKey: newUser.publicKey,
      fingerprint: newUser.fingerprint,
      privateKey, // Send plaintext private key ONLY at registration
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed: " + err.message });
  }
});

// Helper function to decrypt private key with password
function decryptPrivateKey(privkey_store, password) {
  const [saltHex, ivHex, encrypted] = privkey_store.split(':');
  
  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    if (!user.password) {
      return res.status(400).json({ error: "Invalid user account" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });

    // Decrypt private key with password (SOCP compliance)
    let privateKey;
    try {
      privateKey = decryptPrivateKey(user.privkey_store, password);
    } catch (err) {
      console.error('Failed to decrypt private key:', err);
      return res.status(500).json({ error: "Failed to decrypt credentials" });
    }

    const token = jwt.sign(
      { user_id: user.user_id, username: user.username },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "2h" }
    );

    res.json({
      user_id: user.user_id,
      username: user.username,
      token,
      publicKey: user.publicKey,
      fingerprint: user.fingerprint,
      privateKey,  // Now available on login!
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed: " + err.message });
  }
});

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // generate RSA key pair
    const { publicKey, privateKey } = await cryptoManager.generateRSAKeyPair();

    // fingerprint = hash of public key
    const fingerprint = cryptoManager.base64urlEncode(
      Buffer.from(publicKey).subarray(0, 32)
    );

    const newUser = new User({
      username,
      password: hashedPassword,
      publicKey,
      fingerprint,
    });

    await newUser.save();

    // sign JWT with user_id + username
    const token = jwt.sign(
      { user_id: newUser.user_id, username: newUser.username },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "2h" }
    );

    res.status(201).json({
      user_id: newUser.user_id,
      username: newUser.username,
      token,
      publicKey: newUser.publicKey,
      fingerprint: newUser.fingerprint,
      privateKey, // only send back once at registration
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed: " + err.message });
  }
});

// LOGIN
// router.post("/login", async (req, res) => {
//   try {
//     const { username, password } = req.body;

//     const user = await User.findOne({ username });
//     if (!user) return res.status(400).json({ error: "Invalid credentials" });

//     const valid = await bcrypt.compare(password, user.password);
//     if (!valid) return res.status(400).json({ error: "Invalid credentials" });

//     const token = jwt.sign(
//       { user_id: user.user_id, username: user.username },
//       process.env.JWT_SECRET || "your-secret-key",
//       { expiresIn: "2h" }
//     );

//     res.json({
//       user_id: user.user_id,
//       username: user.username,
//       token,
//       publicKey: user.publicKey,
//       fingerprint: user.fingerprint,
//     });
//   } catch (err) {
//     console.error("Login error:", err);
//     res.status(500).json({ error: "Login failed: " + err.message });
//   }
// });

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    // Validate password hash exists
    if (!user.password) {
      return res.status(400).json({ error: "Invalid user account" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { user_id: user.user_id, username: user.username },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "2h" }
    );

    res.json({
      user_id: user.user_id,
      username: user.username,
      token,
      publicKey: user.publicKey,
      fingerprint: user.fingerprint,
      privateKey,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed: " + err.message });
  }
});

module.exports = router;