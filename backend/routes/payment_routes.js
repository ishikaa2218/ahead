const express = require('express');
const crypto = require('crypto');
const { promisify } = require('util');
const db = require('../db/connection');
const { requireAuth } = require('../middleware/auth');
const { isRazorpayEnabled, createOrder, fetchPayment, verifyPaymentSignature } = require('../utils/razorpay');
const { sendEmail } = require('../utils/email');
const { aiInterviewConfirmationEmail, companyInterviewConfirmationEmail } = require('../utils/emailTemplates');
const { generateLoginId } = require('../utils/randomId');

const router = express.Router();
const query = promisify(db.query).bind(db);
const beginTransaction = promisify(db.beginTransaction).bind(db);
const commitTransaction = promisify(db.commit).bind(db);
const rollbackTransaction = promisify(db.rollback).bind(db);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEVELS = ['Easy', 'Medium', 'Hard'];
const SCHEDULED_AT_PATTERN = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/;
const INTERVIEW_TYPES = ['Technical', 'Behavioral', 'Mixed'];
const INTERVIEW_MODES = ['Text', 'Audio'];
const QUESTION_COUNTS = [5, 8, 10];

// AI interview pricing, in INR — Audio costs more since it also runs speech-to-text.
const AI_INTERVIEW_PRICE_INR = { Text: 99, Audio: 199 };
// Company interview pricing, in INR — flat fee, matches the price shown on the booking page.
const COMPANY_INTERVIEW_PRICE_INR = 1199;

function getAIInterviewAmountPaise(interviewMode) {
    const rupees = AI_INTERVIEW_PRICE_INR[interviewMode] ?? AI_INTERVIEW_PRICE_INR.Text;
    return rupees * 100;
}

// Both routes below validate the exact same fields the old /post/ai-interview-applications and
// /post/company-interview-applications endpoints used to validate — the booking is no longer
// created up front, so this payload is re-sent (and re-validated) at order time AND at verify
// time, since the row is only ever written once payment is confirmed.

function validateAIBookingPayload(body) {
    const { targetRole, domain, level, jobDescription, scheduledAt, interviewType, questionCount, interviewMode } = body;

    if (typeof targetRole !== 'string' || !targetRole.trim()) {
        return { error: 'Target role is required.' };
    }
    if (typeof domain !== 'string' || !domain.trim()) {
        return { error: 'Domain is required.' };
    }
    if (typeof level !== 'string' || !LEVELS.includes(level)) {
        return { error: 'Level must be Easy, Medium, or Hard.' };
    }
    if (typeof scheduledAt !== 'string' || !SCHEDULED_AT_PATTERN.test(scheduledAt)) {
        return { error: 'A valid interview date and time is required.' };
    }
    if (typeof interviewType !== 'string' || !INTERVIEW_TYPES.includes(interviewType)) {
        return { error: 'Interview type must be Technical, Behavioral, or Mixed.' };
    }
    if (!QUESTION_COUNTS.includes(Number(questionCount))) {
        return { error: 'Question count must be 5, 8, or 10.' };
    }
    if (typeof interviewMode !== 'string' || !INTERVIEW_MODES.includes(interviewMode)) {
        return { error: 'Interview mode must be Text or Audio.' };
    }

    let normalizedScheduledAt = scheduledAt.replace('T', ' ');
    if (normalizedScheduledAt.length === 16) {
        normalizedScheduledAt += ':00';
    }
    if (new Date(normalizedScheduledAt) < new Date()) {
        return { error: 'Interview date and time must be in the future.' };
    }

    const cleanJobDescription = typeof jobDescription === 'string' && jobDescription.trim()
        ? jobDescription.trim()
        : null;

    return {
        value: {
            targetRole: targetRole.trim(),
            domain: domain.trim(),
            level,
            interviewType,
            questionCount: Number(questionCount),
            interviewMode,
            jobDescription: cleanJobDescription,
            scheduledAt: normalizedScheduledAt
        }
    };
}

function validateCompanyBookingPayload(body) {
    const { interviewerId, slotId, intervieweeJobRole, domain, level, jobDescription } = body;

    if (typeof interviewerId !== 'string' || !UUID_PATTERN.test(interviewerId)) {
        return { error: 'A valid interviewer is required.' };
    }
    if (typeof slotId !== 'string' || !UUID_PATTERN.test(slotId)) {
        return { error: 'A valid slot is required.' };
    }
    if (typeof intervieweeJobRole !== 'string' || !intervieweeJobRole.trim()) {
        return { error: 'Target role is required.' };
    }
    if (typeof domain !== 'string' || !domain.trim()) {
        return { error: 'Domain is required.' };
    }
    if (typeof level !== 'string' || !LEVELS.includes(level)) {
        return { error: 'Level must be Easy, Medium, or Hard.' };
    }
    if (typeof jobDescription !== 'string' || !jobDescription.trim()) {
        return { error: 'Job description is required.' };
    }

    return {
        value: {
            interviewerId,
            slotId,
            intervieweeJobRole: intervieweeJobRole.trim(),
            domain: domain.trim(),
            level,
            jobDescription: jobDescription.trim()
        }
    };
}

async function markTransactionFailed(transactionId, paymentId, signature, description) {
    await query(
        `UPDATE razorpay_transactions
         SET razorpay_payment_id = ?, razorpay_signature = ?, status = 'failed', error_description = ?
         WHERE id = ?`,
        [paymentId ?? null, signature ?? null, description, transactionId]
    );
}

// Locks the slot and creates the booking atomically — only ever called after payment is verified.
// Throws an error with code 'SLOT_TAKEN' if the interviewer/slot is no longer available.
async function createCompanyBookingAfterPayment(applicationId, userId, value) {
    await beginTransaction();
    try {
        const interviewerRows = await query(
            'SELECT id, name, company_name FROM interviewers WHERE interviwers_id = ? AND status = ? LIMIT 1',
            [value.interviewerId, 'active']
        );
        const interviewer = interviewerRows[0];
        if (!interviewer) {
            const err = new Error('Interviewer no longer available');
            err.code = 'SLOT_TAKEN';
            throw err;
        }

        const slotRows = await query(
            `SELECT id, status, DATE_FORMAT(slot_date, '%Y-%m-%d') AS slot_date, start_time, end_time
             FROM interview_slots WHERE interview_slots_id = ? AND interviewer_id = ? FOR UPDATE`,
            [value.slotId, value.interviewerId]
        );
        const slot = slotRows[0];
        if (!slot || slot.status !== 'available') {
            const err = new Error('Slot no longer available');
            err.code = 'SLOT_TAKEN';
            throw err;
        }

        await query(
            `INSERT INTO company_interview_applications
                (company_interview_applications_id, user_id, interviewer_id, slot_id,
                 interviewee_job_role, domain, level, job_description, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
            [applicationId, userId, value.interviewerId, value.slotId, value.intervieweeJobRole, value.domain, value.level, value.jobDescription]
        );

        await query('UPDATE interview_slots SET status = ? WHERE id = ?', ['booked', slot.id]);

        await commitTransaction();

        return {
            interviewerName: interviewer.name,
            companyName: interviewer.company_name,
            slotDate: slot.slot_date,
            startTime: slot.start_time
        };
    } catch (err) {
        await rollbackTransaction().catch(() => {});
        throw err;
    }
}

router.post('/ai-interview/order', requireAuth, async (req, res) => {
    if (!isRazorpayEnabled()) {
        return res.status(400).json({ message: 'Online payments are currently unavailable.' });
    }

    const { error, value } = validateAIBookingPayload(req.body);
    if (error) {
        return res.status(400).json({ message: error });
    }

    try {
        const applicationId = generateLoginId();
        const amount = getAIInterviewAmountPaise(value.interviewMode);
        const transactionId = generateLoginId();

        const order = await createOrder({
            amount,
            currency: 'INR',
            receipt: applicationId,
            notes: { application_type: 'ai_interview', application_id: applicationId }
        });

        await query(
            `INSERT INTO razorpay_transactions
                (razorpay_transaction_id, user_id, application_type, application_id, razorpay_order_id, amount, currency, status)
             VALUES (?, ?, 'ai_interview', ?, ?, ?, ?, 'created')`,
            [transactionId, req.user.loginId, applicationId, order.id, amount, order.currency]
        );

        return res.status(201).json({
            applicationId,
            orderId: order.id,
            amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
            name: 'Ahead',
            description: `AI Interview - ${value.targetRole}`,
            prefill: { name: req.user.name, email: req.user.email }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Something went wrong while starting your payment.' });
    }
});

router.post('/company-interview/order', requireAuth, async (req, res) => {
    if (!isRazorpayEnabled()) {
        return res.status(400).json({ message: 'Online payments are currently unavailable.' });
    }

    const { error, value } = validateCompanyBookingPayload(req.body);
    if (error) {
        return res.status(400).json({ message: error });
    }

    try {
        const interviewerRows = await query(
            'SELECT id FROM interviewers WHERE interviwers_id = ? AND status = ? LIMIT 1',
            [value.interviewerId, 'active']
        );
        if (!interviewerRows[0]) {
            return res.status(404).json({ message: 'This interviewer is no longer available.' });
        }

        const slotRows = await query(
            'SELECT id, status FROM interview_slots WHERE interview_slots_id = ? AND interviewer_id = ? LIMIT 1',
            [value.slotId, value.interviewerId]
        );
        const slot = slotRows[0];
        if (!slot) {
            return res.status(404).json({ message: 'This slot could not be found.' });
        }
        if (slot.status !== 'available') {
            return res.status(409).json({ message: 'This slot has just been booked by someone else. Please pick another.' });
        }

        const applicationId = generateLoginId();
        const amount = COMPANY_INTERVIEW_PRICE_INR * 100;
        const transactionId = generateLoginId();

        const order = await createOrder({
            amount,
            currency: 'INR',
            receipt: applicationId,
            notes: { application_type: 'company_interview', application_id: applicationId }
        });

        await query(
            `INSERT INTO razorpay_transactions
                (razorpay_transaction_id, user_id, application_type, application_id, razorpay_order_id, amount, currency, status)
             VALUES (?, ?, 'company_interview', ?, ?, ?, ?, 'created')`,
            [transactionId, req.user.loginId, applicationId, order.id, amount, order.currency]
        );

        return res.status(201).json({
            applicationId,
            orderId: order.id,
            amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
            name: 'Ahead',
            description: `Company Interview - ${value.intervieweeJobRole}`,
            prefill: { name: req.user.name, email: req.user.email }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Something went wrong while starting your payment.' });
    }
});

router.post('/ai-interview/verify', requireAuth, async (req, res) => {
    const { applicationId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (
        typeof applicationId !== 'string' || !UUID_PATTERN.test(applicationId) ||
        typeof razorpay_order_id !== 'string' || !razorpay_order_id ||
        typeof razorpay_payment_id !== 'string' || !razorpay_payment_id ||
        typeof razorpay_signature !== 'string' || !razorpay_signature
    ) {
        return res.status(400).json({ message: 'Incomplete payment details.' });
    }

    const { error, value } = validateAIBookingPayload(req.body);
    if (error) {
        return res.status(400).json({ message: error });
    }

    try {
        const transactionRows = await query(
            `SELECT id, status FROM razorpay_transactions
             WHERE razorpay_order_id = ? AND application_id = ? AND user_id = ? AND application_type = 'ai_interview'
             LIMIT 1`,
            [razorpay_order_id, applicationId, req.user.loginId]
        );
        const transaction = transactionRows[0];
        if (!transaction) {
            return res.status(404).json({ message: 'Payment record not found.' });
        }

        // Idempotent: if this payment was already verified, the booking already exists — don't redo it.
        if (['authorized', 'captured'].includes(transaction.status)) {
            return res.status(200).json({ success: true, status: transaction.status, applicationId });
        }

        const isValid = verifyPaymentSignature({
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            signature: razorpay_signature
        });

        if (!isValid) {
            await markTransactionFailed(transaction.id, razorpay_payment_id, razorpay_signature, 'Signature verification failed');
            return res.status(400).json({ message: 'Payment verification failed.' });
        }

        let payment = null;
        try {
            payment = await fetchPayment(razorpay_payment_id);
        } catch (fetchErr) {
            console.error('Failed to fetch Razorpay payment details:', fetchErr);
        }

        const status = payment?.status && ['authorized', 'captured'].includes(payment.status)
            ? payment.status
            : 'captured';

        try {
            await query(
                `INSERT INTO ai_interview_applications
                    (ai_interview_applications_id, user_id, target_role, domain, level, interview_type,
                     question_count, interview_mode, job_description, scheduled_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    applicationId, req.user.loginId, value.targetRole, value.domain, value.level,
                    value.interviewType, value.questionCount, value.interviewMode, value.jobDescription, value.scheduledAt
                ]
            );
        } catch (insertErr) {
            if (insertErr.code !== 'ER_DUP_ENTRY') throw insertErr;
            // Already created by a concurrent/duplicate verify call — proceed as success.
        }

        await query(
            `UPDATE razorpay_transactions
             SET razorpay_payment_id = ?, razorpay_signature = ?, status = ?,
                 payment_method = ?, bank = ?, wallet = ?, vpa = ?
             WHERE id = ?`,
            [
                razorpay_payment_id, razorpay_signature, status,
                payment?.method ?? null, payment?.bank ?? null, payment?.wallet ?? null, payment?.vpa ?? null,
                transaction.id
            ]
        );

        const { subject, html, text } = aiInterviewConfirmationEmail({
            name: req.user.name,
            targetRole: value.targetRole,
            domain: value.domain,
            level: value.level,
            interviewType: value.interviewType,
            questionCount: value.questionCount,
            interviewMode: value.interviewMode,
            scheduledAt: value.scheduledAt.replace(' ', 'T')
        });
        sendEmail({ to: req.user.email, subject, html, text })
            .catch((emailErr) => console.error('Failed to send AI interview confirmation email:', emailErr));

        return res.status(200).json({ success: true, status, applicationId });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Something went wrong while verifying your payment.' });
    }
});

router.post('/company-interview/verify', requireAuth, async (req, res) => {
    const { applicationId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (
        typeof applicationId !== 'string' || !UUID_PATTERN.test(applicationId) ||
        typeof razorpay_order_id !== 'string' || !razorpay_order_id ||
        typeof razorpay_payment_id !== 'string' || !razorpay_payment_id ||
        typeof razorpay_signature !== 'string' || !razorpay_signature
    ) {
        return res.status(400).json({ message: 'Incomplete payment details.' });
    }

    const { error, value } = validateCompanyBookingPayload(req.body);
    if (error) {
        return res.status(400).json({ message: error });
    }

    try {
        const transactionRows = await query(
            `SELECT id, status FROM razorpay_transactions
             WHERE razorpay_order_id = ? AND application_id = ? AND user_id = ? AND application_type = 'company_interview'
             LIMIT 1`,
            [razorpay_order_id, applicationId, req.user.loginId]
        );
        const transaction = transactionRows[0];
        if (!transaction) {
            return res.status(404).json({ message: 'Payment record not found.' });
        }

        if (['authorized', 'captured'].includes(transaction.status)) {
            return res.status(200).json({ success: true, status: transaction.status, applicationId });
        }

        const isValid = verifyPaymentSignature({
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            signature: razorpay_signature
        });

        if (!isValid) {
            await markTransactionFailed(transaction.id, razorpay_payment_id, razorpay_signature, 'Signature verification failed');
            return res.status(400).json({ message: 'Payment verification failed.' });
        }

        let payment = null;
        try {
            payment = await fetchPayment(razorpay_payment_id);
        } catch (fetchErr) {
            console.error('Failed to fetch Razorpay payment details:', fetchErr);
        }

        const status = payment?.status && ['authorized', 'captured'].includes(payment.status)
            ? payment.status
            : 'captured';

        let bookingResult;
        try {
            bookingResult = await createCompanyBookingAfterPayment(applicationId, req.user.loginId, value);
        } catch (bookingErr) {
            if (bookingErr.code === 'SLOT_TAKEN') {
                await query(
                    `UPDATE razorpay_transactions
                     SET razorpay_payment_id = ?, razorpay_signature = ?, status = ?, error_description = ?
                     WHERE id = ?`,
                    [
                        razorpay_payment_id, razorpay_signature, status,
                        'Payment captured but the slot became unavailable before the booking could be confirmed — needs manual refund.',
                        transaction.id
                    ]
                );
                return res.status(409).json({
                    message: 'Your payment succeeded, but this slot was just booked by someone else. Please contact support for a refund.'
                });
            }
            throw bookingErr;
        }

        await query(
            `UPDATE razorpay_transactions
             SET razorpay_payment_id = ?, razorpay_signature = ?, status = ?,
                 payment_method = ?, bank = ?, wallet = ?, vpa = ?
             WHERE id = ?`,
            [
                razorpay_payment_id, razorpay_signature, status,
                payment?.method ?? null, payment?.bank ?? null, payment?.wallet ?? null, payment?.vpa ?? null,
                transaction.id
            ]
        );

        const { subject, html, text } = companyInterviewConfirmationEmail({
            name: req.user.name,
            interviewerName: bookingResult.interviewerName,
            companyName: bookingResult.companyName,
            targetRole: value.intervieweeJobRole,
            domain: value.domain,
            level: value.level,
            scheduledAt: `${bookingResult.slotDate}T${bookingResult.startTime}`
        });
        sendEmail({ to: req.user.email, subject, html, text })
            .catch((emailErr) => console.error('Failed to send company interview confirmation email:', emailErr));

        return res.status(200).json({ success: true, status, applicationId });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Something went wrong while verifying your payment.' });
    }
});

async function reportPaymentFailureHandler(req, res) {
    const { applicationId, razorpay_order_id, errorCode, errorDescription } = req.body;

    if (
        typeof applicationId !== 'string' || !UUID_PATTERN.test(applicationId) ||
        typeof razorpay_order_id !== 'string' || !razorpay_order_id
    ) {
        return res.status(400).json({ message: 'Incomplete payment details.' });
    }

    try {
        await query(
            `UPDATE razorpay_transactions
             SET status = 'failed', error_code = ?, error_description = ?
             WHERE razorpay_order_id = ? AND application_id = ? AND user_id = ? AND status = 'created'`,
            [
                typeof errorCode === 'string' ? errorCode.slice(0, 100) : null,
                typeof errorDescription === 'string' ? errorDescription.slice(0, 2000) : null,
                razorpay_order_id,
                applicationId,
                req.user.loginId
            ]
        );
        return res.status(200).json({ message: 'Recorded.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Something went wrong while recording your payment attempt.' });
    }
}

// A failed/cancelled payment only ever touches razorpay_transactions — no booking row is created
// for either interview type unless payment is verified successfully (see /verify above).
router.post('/ai-interview/failed', requireAuth, reportPaymentFailureHandler);
router.post('/company-interview/failed', requireAuth, reportPaymentFailureHandler);

module.exports = router;
