const express = require('express');
const db = require('../db/connection');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/me', requireAuth, (req, res) => {
    return res.status(200).json(req.user);
});

router.get('/interviewers', (req, res) => {
    const sql = `
        SELECT interviwers_id AS interviewers_id, name, company_name, job_title, interview_title,
               description, experience_years, profile_image_url
        FROM interviewers
        WHERE status = ?
        ORDER BY name ASC
    `;

    db.query(sql, ['active'], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Something went wrong while fetching interviewers.' });
        }

        return res.status(200).json(rows);
    });
});

router.get('/interview-slots', (req, res) => {
    const sql = `
        SELECT interview_slots_id, interviewer_id, DATE_FORMAT(slot_date, '%Y-%m-%d') AS slot_date, start_time, end_time
        FROM interview_slots
        WHERE status = ?
        ORDER BY slot_date ASC, start_time ASC
    `;

    db.query(sql, ['available'], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Something went wrong while fetching interview slots.' });
        }

        return res.status(200).json(rows);
    });
});

router.get('/my-interviews', requireAuth, (req, res) => {
    const userId = req.user.loginId;

    const aiSql = `
        SELECT
            aia.ai_interview_applications_id AS id,
            aia.target_role,
            aia.domain,
            aia.level,
            COALESCE(ss.status, aia.status) AS status,
            DATE_FORMAT(aia.scheduled_at, '%Y-%m-%dT%H:%i:%s') AS scheduled_at,
            DATE_FORMAT(aia.created_at, '%Y-%m-%dT%H:%i:%s') AS created_at,
            (fb.id IS NOT NULL) AS has_feedback
        FROM ai_interview_applications aia
        LEFT JOIN ai_interview_session_status ss
            ON ss.id = (
                SELECT s2.id FROM ai_interview_session_status s2
                WHERE s2.ai_interview_applications_id = aia.ai_interview_applications_id
                ORDER BY s2.id DESC LIMIT 1
            )
        LEFT JOIN ai_interview_feedback fb ON fb.ai_interview_session_status_id = ss.ai_interview_session_status_id
        WHERE aia.user_id = ?
        ORDER BY aia.created_at DESC
    `;

    const companySql = `
        SELECT
            cia.company_interview_applications_id AS id,
            cia.interviewee_job_role AS target_role,
            cia.domain,
            cia.level,
            cia.status,
            DATE_FORMAT(cia.created_at, '%Y-%m-%dT%H:%i:%s') AS created_at,
            iv.name AS interviewer_name,
            iv.company_name AS interviewer_company,
            DATE_FORMAT(islot.slot_date, '%Y-%m-%d') AS slot_date,
            islot.start_time,
            islot.end_time
        FROM company_interview_applications cia
        LEFT JOIN interviewers iv ON iv.interviwers_id = cia.interviewer_id
        LEFT JOIN interview_slots islot ON islot.interview_slots_id = cia.slot_id
        WHERE cia.user_id = ?
        ORDER BY cia.created_at DESC
    `;

    db.query(aiSql, [userId], (aiErr, aiRows) => {
        if (aiErr) {
            console.error(aiErr);
            return res.status(500).json({ message: 'Something went wrong while fetching your dashboard.' });
        }

        db.query(companySql, [userId], (companyErr, companyRows) => {
            if (companyErr) {
                console.error(companyErr);
                return res.status(500).json({ message: 'Something went wrong while fetching your dashboard.' });
            }

            return res.status(200).json({
                aiInterviews: aiRows.map((row) => ({ ...row, has_feedback: Boolean(row.has_feedback) })),
                companyInterviews: companyRows
            });
        });
    });
});

module.exports = router;
