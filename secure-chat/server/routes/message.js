const express = require('express');
const router = express.Router();

// helper function to extract username from JWT cookie (from auth.js)
function extractUser(req) {
    const jwt = require('jsonwebtoken');
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

// GET /messages/:userId
// If VULN_MODE=true => return messages for any :userId (IDOR)
// If VULN_MODE=false => only return messages if requester === :userId
router.get('/:userId', async (req, res, next) => {
    try {
        const targetUser = req.params.userId;
        const vuln = req.app && req.app.locals && req.app.locals.VULN_MODE;

        const dbManager = req.app.locals.db;

        if (vuln) {
            // INTENTIONAL VULNERABILITY
            // Returns messages for any username without checking JWT
            const messages = await dbManager.getMessagesForUser(targetUser);
            return res.json({ ok: true, messages });
        }

        // Secure behaviour: check JWT username
        const requester = extractUser(req);
        if (!requester || requester !== targetUser) {
            return res.status(403).json({ ok: false, error: 'Forbidden' });
        }

        const messages = await dbManager.getMessagesForUser(targetUser);
        return res.json({ ok: true, messages });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
