/**
 * Chat28
 * Group: UG 28
 * Students: Samira Hazara | Demi Papazoglou | Caitlin Joyce Martyr | Amber Yaa Wen Chew | Grace Baek 
 * Course: COMP SCI 3307
 * Assignment: Advanced Secure Protocol Design, Implementation and Review
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const { User } = require('../database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT token (expects "Authorization: Bearer <token>")
function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}


/* return data for the logged-in user */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const username = req.user && req.user.username;
    if (!username) return res.status(401).json({ error: 'Authentication required' });

    const user = await User.findOne({ username }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const data = {
      user_id: user.user_id,
      username: user.username,
      bio: user.bio,
      publicKey: user.publicKey,
      fingerprint: user.fingerprint,
      createdAt: user.createdAt
    };

    console.log('Returning /profile/me data:', data);

    return res.json(data);
  } catch (err) {
    console.error('Error in /profile/me:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/* PUBLIC: lookup by username (non-authenticated read, limited exposure) */
router.get('/:username', async (req, res) => {
  try {
    const username = req.params.username;
    const user = await User.findOne({ username }).select('-password -publicKey -fingerprint');
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Return only public, non-sensitive fields for username lookup
    return res.json({
      username: user.username,
      bio: user.bio,
      createdAt: user.createdAt
    });
  } catch (err) {
    console.error('Error fetching profile by username:', err);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

module.exports = router;
