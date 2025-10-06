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

/*
 * INTENTIONAL SECURITY FLAW (IDOR / Broken Access Control)
 * Demonstrates insecure direct object reference by allowing access to any user's profile data
 * using their user_id without proper authorization checks.
 * Controlled by VULN_MODE environment flag 
 * When VULN_MODE is false or unset, this endpoint returns 403 Forbidden.
 */

// INSECURE IDOR ENDPOINT (gated)
router.get('/view', async (req, res) => {
  try {
    const targetId = req.query.id;
    if (!targetId) {
      return res.status(400).json({ error: 'Missing user_id parameter' });
    }

    const vuln = req.app && req.app.locals && req.app.locals.VULN_MODE === true;

    if (!vuln) {
      // secure default behaviour to not reveal other users' profiles
      return res.status(403).json({ error: 'Forbidden: IDOR endpoint disabled' });
    }

    // INTENTIONAL VULN
    // Purpose: demonstrate Broken Access Control / IDOR.
    // In VULN_MODE=true we intentionally return another user's profile by user_id without auth.
    const user = await User.findOne({ user_id: targetId }).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      user_id: user.user_id,
      username: user.username,
      bio: user.bio,
      publicKey: user.publicKey,
      fingerprint: user.fingerprint,
      createdAt: user.createdAt,
      note: 'INTENTIONAL VULN — This endpoint demonstrates an IDOR / Broken Access Control issue.'
    });
  } catch (err) {
    console.error('IDOR /profile/view error:', err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
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
