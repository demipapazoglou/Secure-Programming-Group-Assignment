const express = require('express');
const jwt = require('jsonwebtoken');

module.exports = function(db) {
  const router = express.Router();

  // helper function: create a JWT and set it as a cookie on the response
  // this way we can track who the user is on WS + HTTP requests
  function setCookie(res, username) {
    const token = jwt.sign({ sub: username }, process.env.JWT_SECRET, {
      issuer: process.env.JWT_ISSUER || 'chat28',
      expiresIn: '7d'  // user stays logged in for a week (This is just an example - we can change)
    });
    res.cookie(process.env.JWT_COOKIE_NAME || 'chat28_token', token, {
      httpOnly: true,  // stop JS from messing with it
      sameSite: 'lax', // prevents most CSRF issues
      secure: false,   // should be true when we host on HTTPS
      maxAge: 7 * 24 * 3600 * 1000 // 1 week expiry
    });
  }

  // helper function: extract user from JWT cookie
  function extractUser(req) {
    try {
      const token = req.cookies[process.env.JWT_COOKIE_NAME || 'chat28_token'];
      if (token) {
        const payload = jwt.verify(token, process.env.JWT_SECRET, {
          issuer: process.env.JWT_ISSUER || 'chat28'
        });
        return payload.sub; // username
      }
    } catch (err) {
      return null;
    }
    return null;
  }

  // ---------- GET CURRENT USER ----------
  router.get('/me', (req, res) => {
    const username = extractUser(req);
    if (username) {
      res.json({ username, authenticated: true });
    } else {
      res.json({ authenticated: false });
    }
  });

  // ---------- SIGN UP ----------
  router.post('/signup', async (req, res) => {
    try {
    console.log('[API /signup] body:', req.body, 'content-type:', req.headers['content-type']);
      // grab the signup fields out of the request body
      const { username, email, password } = req.body || {};
      if (!username || !email || !password)
        return res.status(400).json({ message: 'Missing fields' });

      // create the user in Mongo
      const created = await db.addUser({ username, email, password });
      if (!created)
        return res.status(409).json({ message: 'Username or email already exists' });

      // user created, now auto-login them with a cookie
      setCookie(res, username);
      res.json({ message: 'Signup successful', username });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ---------- LOGIN ----------
  router.post('/login', async (req, res) => {
    try {
      // allow login with either username or email
      const { identifier, password } = req.body || {};
      if (!identifier || !password)
        return res.status(400).json({ message: 'Missing fields' });

      // check against Mongo + bcrypt
      const user = await db.validateUser(identifier, password);
      if (!user)
        return res.status(401).json({ message: 'Invalid credentials' });

      // credentials valid, set cookie with JWT
      setCookie(res, user.username);
      res.json({ message: 'Login successful', username: user.username });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ---------- LOGOUT ----------
  router.post('/logout', (req, res) => {
    // clear out the cookie so they're logged out
    res.clearCookie(process.env.JWT_COOKIE_NAME || 'chat28_token', {
      httpOnly: true, sameSite: 'lax', secure: false
    });
    res.json({ message: 'Logged out' });
  });

  return router;
};