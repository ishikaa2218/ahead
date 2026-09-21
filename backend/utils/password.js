const crypto = require('crypto');

const SCRYPT_KEY_LENGTH = 64;

function hashPassword(plainPassword) {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(plainPassword, salt, SCRYPT_KEY_LENGTH);
    return `${salt}:${derivedKey.toString('hex')}`;
}

function verifyPassword(plainPassword, storedPassword) {
    const [salt, storedHash] = storedPassword.split(':');
    if (!salt || !storedHash) {
        return false;
    }

    const storedHashBuffer = Buffer.from(storedHash, 'hex');
    const derivedKey = crypto.scryptSync(plainPassword, salt, SCRYPT_KEY_LENGTH);

    if (storedHashBuffer.length !== derivedKey.length) {
        return false;
    }

    return crypto.timingSafeEqual(storedHashBuffer, derivedKey);
}

module.exports = { hashPassword, verifyPassword };
