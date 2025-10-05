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
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed: " + err.message });
  }
});

module.exports = router;