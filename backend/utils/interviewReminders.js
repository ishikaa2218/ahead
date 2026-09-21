const { promisify } = require('util');
const db = require('../db/connection');
const { sendEmail } = require('./email');
const { aiInterviewReminderEmail, companyInterviewReminderEmail } = require('./emailTemplates');

const query = promisify(db.query).bind(db);

const POLL_INTERVAL_MS = 60 * 1000;
const REMINDER_WINDOW_MINUTES = 15;

async function sendAIReminders() {
    const rows = await query(
        `SELECT aia.ai_interview_applications_id AS id, aia.target_role, aia.domain, aia.level,
                DATE_FORMAT(aia.scheduled_at, '%Y-%m-%dT%H:%i:%s') AS scheduled_at,
                su.email, su.name
         FROM ai_interview_applications aia
         JOIN sign_up su ON su.login_id = aia.user_id
         WHERE aia.scheduled_at > NOW()
           AND aia.scheduled_at <= NOW() + INTERVAL ? MINUTE
           AND aia.status NOT IN ('completed', 'cancelled')
           AND NOT EXISTS (
               SELECT 1 FROM interview_reminder_log irl
               WHERE irl.interview_type = 'ai' AND irl.application_id = aia.ai_interview_applications_id
           )`,
        [REMINDER_WINDOW_MINUTES]
    );

    for (const row of rows) {
        try {
            const { subject, html, text } = aiInterviewReminderEmail(row);
            await sendEmail({ to: row.email, subject, html, text });
            await query(
                `INSERT INTO interview_reminder_log (interview_type, application_id) VALUES ('ai', ?)`,
                [row.id]
            );
        } catch (err) {
            console.error(`Failed to send AI interview reminder for ${row.id}:`, err);
        }
    }
}

async function sendCompanyReminders() {
    const rows = await query(
        `SELECT cia.company_interview_applications_id AS id, cia.interviewee_job_role AS target_role,
                cia.domain, cia.level,
                iv.name AS interviewer_name, iv.company_name,
                DATE_FORMAT(islot.slot_date, '%Y-%m-%d') AS slot_date, islot.start_time, islot.end_time,
                su.email, su.name
         FROM company_interview_applications cia
         JOIN interview_slots islot ON islot.interview_slots_id = cia.slot_id
         JOIN interviewers iv ON iv.interviwers_id = cia.interviewer_id
         JOIN sign_up su ON su.login_id = cia.user_id
         WHERE TIMESTAMP(islot.slot_date, islot.start_time) > NOW()
           AND TIMESTAMP(islot.slot_date, islot.start_time) <= NOW() + INTERVAL ? MINUTE
           AND cia.status NOT IN ('completed', 'cancelled')
           AND NOT EXISTS (
               SELECT 1 FROM interview_reminder_log irl
               WHERE irl.interview_type = 'company' AND irl.application_id = cia.company_interview_applications_id
           )`,
        [REMINDER_WINDOW_MINUTES]
    );

    for (const row of rows) {
        try {
            const { subject, html, text } = companyInterviewReminderEmail(row);
            await sendEmail({ to: row.email, subject, html, text });
            await query(
                `INSERT INTO interview_reminder_log (interview_type, application_id) VALUES ('company', ?)`,
                [row.id]
            );
        } catch (err) {
            console.error(`Failed to send company interview reminder for ${row.id}:`, err);
        }
    }
}

async function completeFinishedCompanyInterviews() {
    const result = await query(
        `UPDATE company_interview_applications cia
         JOIN interview_slots islot ON islot.interview_slots_id = cia.slot_id
         SET cia.status = 'completed'
         WHERE cia.status NOT IN ('completed', 'cancelled')
           AND islot.end_time IS NOT NULL
           AND TIMESTAMP(islot.slot_date, islot.end_time) < NOW()`
    );

    if (result && result.affectedRows > 0) {
        console.log(`Auto-completed ${result.affectedRows} company interview(s).`);
    }
}

async function pollReminders() {
    try {
        await sendAIReminders();
    } catch (err) {
        console.error('AI interview reminder poll failed:', err);
    }

    try {
        await sendCompanyReminders();
    } catch (err) {
        console.error('Company interview reminder poll failed:', err);
    }

    try {
        await completeFinishedCompanyInterviews();
    } catch (err) {
        console.error('Company interview auto-complete poll failed:', err);
    }
}

function startInterviewReminderPoller() {
    pollReminders();
    setInterval(pollReminders, POLL_INTERVAL_MS);
}

module.exports = { startInterviewReminderPoller };
