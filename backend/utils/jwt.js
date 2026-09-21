const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_TTL = '7d';
const TOKEN_COOKIE_NAME = 'token';
const TOKEN_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not set. Add it to backend/.env before starting the server.');
}

function signAuthToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function verifyAuthToken(token) {
    return jwt.verify(token, JWT_SECRET);
}

module.exports = {
    signAuthToken,
    verifyAuthToken,
    TOKEN_COOKIE_NAME,
    TOKEN_COOKIE_MAX_AGE_MS
};
