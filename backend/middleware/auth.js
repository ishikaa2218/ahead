const { verifyAuthToken, TOKEN_COOKIE_NAME } = require('../utils/jwt');

function requireAuth(req, res, next) {
    const token = req.cookies[TOKEN_COOKIE_NAME];

    if (!token) {
        return res.status(401).json({ message: 'Please log in to continue.' });
    }

    try {
        req.user = verifyAuthToken(token);
        return next();
    } catch {
        return res.status(401).json({ message: 'Your session has expired. Please log in again.' });
    }
}

module.exports = { requireAuth };
