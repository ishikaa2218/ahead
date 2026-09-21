const axios = require('axios');
const crypto = require('crypto');

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';

function isRazorpayEnabled() {
    return process.env.RAZORPAY_ENABLED === 'true';
}

function authConfig() {
    return {
        auth: {
            username: process.env.RAZORPAY_KEY_ID,
            password: process.env.RAZORPAY_KEY_SECRET
        }
    };
}

async function createOrder({ amount, currency = 'INR', receipt, notes }) {
    const response = await axios.post(
        `${RAZORPAY_API_BASE}/orders`,
        { amount, currency, receipt, notes, payment_capture: 1 },
        authConfig()
    );
    return response.data;
}

async function fetchPayment(paymentId) {
    const response = await axios.get(`${RAZORPAY_API_BASE}/payments/${paymentId}`, authConfig());
    return response.data;
}

function verifyPaymentSignature({ orderId, paymentId, signature }) {
    if (!orderId || !paymentId || !signature) return false;

    const expected = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

    try {
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
        return false;
    }
}

module.exports = { isRazorpayEnabled, createOrder, fetchPayment, verifyPaymentSignature };
