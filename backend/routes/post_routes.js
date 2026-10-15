const express = require('express');
const db = require('../db/connection');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signAuthToken, TOKEN_COOKIE_NAME, TOKEN_COOKIE_MAX_AGE_MS } = require('../utils/jwt');
const { generateLoginId } = require("../utils/randomId");

const router = express.Router();
const isProduction = process.env.NODE_ENV === 'production';

const AUTH_COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    maxAge: TOKEN_COOKIE_MAX_AGE_MS
};

const ALLOWED_ROLES = ['student', 'interviewer'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/signup-details', (req, res) => {
    const { name, email, password, role } = req.body;

    if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ message: 'Name is required.' });
    }
    if (typeof email !== 'string' || !EMAIL_PATTERN.test(email)) {
        return res.status(400).json({ message: 'A valid email is required.' });
    }
    if (typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }
    if (typeof role !== 'string' || !ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({ message: 'Role must be either student or interviewer.' });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const hashedPassword = hashPassword(password);
    const loginId = generateLoginId();

    const sql = 'INSERT INTO sign_up (login_id, name, email, password, role) VALUES (?,?, ?, ?, ?)';
    db.query(sql, [loginId, cleanName, cleanEmail, hashedPassword, role], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'An account with this email already exists.' });
            }
            console.error(err);
            return res.status(500).json({ message: 'Something went wrong while creating your account.' });
        }

        return res.status(201).json({
            id: result.insertId,
            login_id: loginId,
            name: cleanName,
            email: cleanEmail,
            role
        });
    });
});

router.post('/login-details', (req, res) => {
    const { email, password, role } = req.body;

    if (typeof email !== 'string' || !EMAIL_PATTERN.test(email)) {
        return res.status(400).json({ message: 'A valid email is required.' });
    }
    if (typeof password !== 'string' || !password) {
        return res.status(400).json({ message: 'Password is required.' });
    }
    if (typeof role !== 'string' || !ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({ message: 'Role must be either student or interviewer.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const sql = 'SELECT id, login_id, name, email, password, role, status FROM sign_up WHERE email = ? LIMIT 1';

    db.query(sql, [cleanEmail], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Something went wrong while logging you in.' });
        }

        const account = rows[0];
        const isPasswordValid = account ? verifyPassword(password, account.password) : false;

        if (!account || !isPasswordValid || account.role !== role) {
            return res.status(401).json({ message: 'Invalid email, password, or role.' });
        }

        if (account.status !== 'active') {
            return res.status(403).json({ message: 'This account is inactive. Please contact support.' });
        }

        const authUser = {
            id: account.id,
            loginId: account.login_id,
            name: account.name,
            email: account.email,
            role: account.role
        };

        const token = signAuthToken(authUser);
        res.cookie(TOKEN_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);

        return res.status(200).json(authUser);
    });
});

router.post('/logout', (req, res) => {
    res.clearCookie(TOKEN_COOKIE_NAME, AUTH_COOKIE_OPTIONS);
    return res.status(200).json({ message: 'Logged out.' });
});

router.post('/reset-password', (req, res) => {
    const { email, role, newPassword } = req.body;

    if (typeof email !== 'string' || !EMAIL_PATTERN.test(email)) {
        return res.status(400).json({ message: 'A valid email is required.' });
    }
    if (typeof role !== 'string' || !ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({ message: 'Role must be either student or interviewer.' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const findSql = 'SELECT id, status FROM sign_up WHERE email = ? AND role = ? LIMIT 1';

    db.query(findSql, [cleanEmail, role], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Something went wrong while resetting your password.' });
        }

        const account = rows[0];
        if (!account) {
            return res.status(404).json({ message: 'No account found with that email and role.' });
        }
        if (account.status !== 'active') {
            return res.status(403).json({ message: 'This account is inactive. Please contact support.' });
        }

        const hashedPassword = hashPassword(newPassword);
        const updateSql = 'UPDATE sign_up SET password = ? WHERE id = ?';

        db.query(updateSql, [hashedPassword, account.id], (updateErr) => {
            if (updateErr) {
                console.error(updateErr);
                return res.status(500).json({ message: 'Something went wrong while resetting your password.' });
            }

            return res.status(200).json({ message: 'Password updated successfully.' });
        });
    });
});

// AI interview and company interview bookings are created only after a successful payment —
// see routes/payment_routes.js (POST /payments/ai-interview/verify and /payments/company-interview/verify).
// There are intentionally no direct "create booking" routes here: creating one without going
// through payment verification would let someone reserve an interview slot for free.

module.exports = router;
