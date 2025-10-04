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

// Middleware to verify JWT token
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

// Get user profile
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('-password'); // Don't send password
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      username: user.username,
      bio: user.bio,
      fingerprint: user.fingerprint,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/', authenticateToken, async (req, res) => {
  try {
    const { bio } = req.body;
    
    const user = await User.findOne({ username: req.user.username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (bio !== undefined) {
      user.bio = bio;
    }
    
    await user.save();
    
    res.json({
      message: 'Profile updated successfully',
      bio: user.bio
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;