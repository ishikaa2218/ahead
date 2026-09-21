const express = require('express');
const multer = require('multer');
const { promisify } = require('util');
const db = require('../db/connection');
const { requireAuth } = require('../middleware/auth');
const { getGroqChatCompletion, transcribeAudio } = require('../utils/groq');
const { sendEmail } = require('../utils/email');
const { aiInterviewFeedbackEmail } = require('../utils/emailTemplates');
const { isRazorpayEnabled } = require('../utils/razorpay');

const router = express.Router();
const query = promisify(db.query).bind(db);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RECOMMENDATIONS = ['strong', 'good', 'average', 'needs_improvement'];

async function getOwnedApplication(id, userId) {
    const rows = await query(
        `SELECT id, ai_interview_applications_id, target_role, domain, level, interview_type, question_count, interview_mode
         FROM ai_interview_applications
         WHERE ai_interview_applications_id = ? AND user_id = ?
         LIMIT 1`,
        [id, userId]
    );
    return rows[0] || null;
}

async function hasCapturedPayment(applicationId) {
    const rows = await query(
        `SELECT id FROM razorpay_transactions
         WHERE application_type = 'ai_interview' AND application_id = ?
           AND status IN ('authorized', 'captured')
         LIMIT 1`,
        [applicationId]
    );
    return Boolean(rows[0]);
}

async function getLatestSession(applicationId) {
    const rows = await query(
        `SELECT id, ai_interview_session_status_id, status, total_questions, questions_answered
         FROM ai_interview_session_status
         WHERE ai_interview_applications_id = ?
         ORDER BY id DESC
         LIMIT 1`,
        [applicationId]
    );
    return rows[0] || null;
}

async function getSessionById(id) {
    const rows = await query(
        `SELECT id, ai_interview_session_status_id, status, total_questions, questions_answered
         FROM ai_interview_session_status
         WHERE id = ?
         LIMIT 1`,
        [id]
    );
    return rows[0] || null;
}

async function getSessionHistory(sessionUuid) {
    return query(
        `SELECT q.question_text AS question, a.answer_text AS answer
         FROM ai_interview_questions q
         LEFT JOIN ai_interview_answers a ON a.ai_interview_question_id = q.ai_interview_question_id
         WHERE q.ai_interview_session_status_id = ?
         ORDER BY q.question_number ASC`,
        [sessionUuid]
    );
}

function buildChatMessages(history) {
    const messages = [];
    for (const entry of history) {
        messages.push({ role: 'assistant', content: entry.question });
        if (entry.answer !== null && entry.answer !== undefined) {
            messages.push({ role: 'user', content: entry.answer });
        }
    }
    return messages;
}

function buildInterviewerSystemPrompt(application, totalQuestions, questionNumber) {
    return `You are an experienced interviewer conducting a live mock interview.
Candidate's target role: ${application.target_role}
Domain: ${application.domain}
Difficulty: ${application.level}
Interview focus: ${application.interview_type}
This is question ${questionNumber} of ${totalQuestions}.

Ask exactly ONE interview question appropriate for this stage of the interview, building naturally on the candidate's previous answers when there are any. Keep it concise (1-3 sentences), conversational, and meant to be spoken aloud - no markdown, numbering, or preamble like "Question X:". Just ask the question directly.`;
}

function clampScore(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(100, number));
}

async function generateEvaluation(application, history) {
    const transcript = history
        .map((entry, index) => `Q${index + 1}: ${entry.question}\nA${index + 1}: ${entry.answer ?? '(no answer given)'}`)
        .join('\n\n');

    const systemPrompt = `You are an expert interview coach evaluating a completed mock interview.
Candidate's target role: ${application.target_role}
Domain: ${application.domain}
Difficulty: ${application.level}
Interview focus: ${application.interview_type}

Evaluate the transcript below and respond with ONLY a JSON object with these exact keys:
overallScore, technicalScore, communicationScore, problemSolvingScore, confidenceScore, relevanceScore (all numbers 0-100),
strengths (array of short strings), areasForImprovement (array of short strings),
detailedFeedback (a short paragraph), recommendation (one of "strong", "good", "average", "needs_improvement").`;

    const raw = await getGroqChatCompletion(
        [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: transcript }
        ],
        { jsonMode: true }
    );

    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch {
        parsed = {};
    }

    return {
        overallScore: clampScore(parsed.overallScore),
        technicalScore: clampScore(parsed.technicalScore),
        communicationScore: clampScore(parsed.communicationScore),
        problemSolvingScore: clampScore(parsed.problemSolvingScore),
        confidenceScore: clampScore(parsed.confidenceScore),
        relevanceScore: clampScore(parsed.relevanceScore),
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 10) : [],
        areasForImprovement: Array.isArray(parsed.areasForImprovement) ? parsed.areasForImprovement.slice(0, 10) : [],
        detailedFeedback: typeof parsed.detailedFeedback === 'string' ? parsed.detailedFeedback : '',
        recommendation: RECOMMENDATIONS.includes(parsed.recommendation) ? parsed.recommendation : 'average'
    };
}

function mapFeedbackRow(row) {
    const parseList = (value) => {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    };

    return {
        overallScore: row.overall_score !== null ? Number(row.overall_score) : null,
        technicalScore: row.technical_score !== null ? Number(row.technical_score) : null,
        communicationScore: row.communication_score !== null ? Number(row.communication_score) : null,
        problemSolvingScore: row.problem_solving_score !== null ? Number(row.problem_solving_score) : null,
        confidenceScore: row.confidence_score !== null ? Number(row.confidence_score) : null,
        relevanceScore: row.relevance_score !== null ? Number(row.relevance_score) : null,
        strengths: parseList(row.strengths),
        areasForImprovement: parseList(row.areas_for_improvement),
        detailedFeedback: row.detailed_feedback,
        recommendation: row.recommendation
    };
}

router.post('/:id/start', requireAuth, async (req, res) => {
    const { id } = req.params;
    if (!UUID_PATTERN.test(id)) {
        return res.status(400).json({ message: 'A valid interview id is required.' });
    }

    try {
        const application = await getOwnedApplication(id, req.user.loginId);
        if (!application) {
            return res.status(404).json({ message: 'Interview not found.' });
        }

        if (isRazorpayEnabled() && !(await hasCapturedPayment(id))) {
            return res.status(402).json({ message: 'Payment is required before starting this interview.' });
        }

        let session = await getLatestSession(id);

        if (!session) {
            const insertResult = await query(
                `INSERT INTO ai_interview_session_status
                    (ai_interview_applications_id, status, total_questions, started_at)
                 VALUES (?, 'in_progress', ?, NOW())`,
                [id, application.question_count]
            );
            session = await getSessionById(insertResult.insertId);
            await query(`UPDATE ai_interview_applications SET status = 'in_progress' WHERE id = ?`, [application.id]);
        } else if (session.status === 'completed' || session.status === 'cancelled') {
            return res.status(409).json({ message: `This interview has already been ${session.status}.` });
        } else if (session.status === 'scheduled') {
            await query(
                `UPDATE ai_interview_session_status SET status = 'in_progress', started_at = NOW() WHERE id = ?`,
                [session.id]
            );
            session = await getSessionById(session.id);
            await query(`UPDATE ai_interview_applications SET status = 'in_progress' WHERE id = ?`, [application.id]);
        }

        const rawHistory = await getSessionHistory(session.ai_interview_session_status_id);
        const lastEntry = rawHistory[rawHistory.length - 1];
        const pendingQuestion = lastEntry && (lastEntry.answer === null || lastEntry.answer === undefined)
            ? lastEntry.question
            : null;
        const completedHistory = pendingQuestion ? rawHistory.slice(0, -1) : rawHistory;
        const readyToComplete = !pendingQuestion
            && session.total_questions > 0
            && session.questions_answered >= session.total_questions;

        return res.status(200).json({
            sessionId: session.ai_interview_session_status_id,
            interview: {
                targetRole: application.target_role,
                domain: application.domain,
                difficulty: application.level,
                interviewType: application.interview_type,
                questionCount: session.total_questions,
                interviewMode: application.interview_mode
            },
            history: buildChatMessages(completedHistory),
            pendingQuestion,
            readyToComplete
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Something went wrong while starting your interview.' });
    }
});

router.post('/:id/chat', requireAuth, async (req, res) => {
    const { id } = req.params;
    if (!UUID_PATTERN.test(id)) {
        return res.status(400).json({ message: 'A valid interview id is required.' });
    }

    const { answer } = req.body;

    try {
        const application = await getOwnedApplication(id, req.user.loginId);
        if (!application) {
            return res.status(404).json({ message: 'Interview not found.' });
        }

        const session = await getLatestSession(id);
        if (!session || session.status !== 'in_progress') {
            return res.status(409).json({ message: 'This interview session is not active.' });
        }

        let questionsAnswered = session.questions_answered;

        if (typeof answer === 'string' && answer.trim()) {
            const pending = await query(
                `SELECT ai_interview_question_id FROM ai_interview_questions
                 WHERE ai_interview_session_status_id = ? AND question_number = ? LIMIT 1`,
                [session.ai_interview_session_status_id, questionsAnswered + 1]
            );
            if (!pending[0]) {
                return res.status(409).json({ message: 'No question is currently awaiting an answer.' });
            }

            await query(
                `INSERT INTO ai_interview_answers (ai_interview_question_id, answer_text, answered_at) VALUES (?, ?, NOW())`,
                [pending[0].ai_interview_question_id, answer.trim()]
            );

            questionsAnswered += 1;
            await query(
                `UPDATE ai_interview_session_status SET questions_answered = ? WHERE id = ?`,
                [questionsAnswered, session.id]
            );
        }

        if (questionsAnswered >= session.total_questions) {
            return res.status(200).json({
                message: "That wraps up all the questions - thank you for your thoughtful answers! I'm putting together your feedback now.",
                done: true
            });
        }

        const nextQuestionNumber = questionsAnswered + 1;

        const alreadyAsked = await query(
            `SELECT question_text FROM ai_interview_questions
             WHERE ai_interview_session_status_id = ? AND question_number = ? LIMIT 1`,
            [session.ai_interview_session_status_id, nextQuestionNumber]
        );
        if (alreadyAsked[0]) {
            return res.status(200).json({ message: alreadyAsked[0].question_text, done: false });
        }

        const history = await getSessionHistory(session.ai_interview_session_status_id);
        const systemPrompt = buildInterviewerSystemPrompt(application, session.total_questions, nextQuestionNumber);
        const messages = [{ role: 'system', content: systemPrompt }, ...buildChatMessages(history)];
        if (messages.length === 1) {
            messages.push({ role: 'user', content: "Let's begin the interview." });
        }

        const questionText = await getGroqChatCompletion(messages);

        const questionType = application.interview_type === 'Technical' ? 'technical'
            : application.interview_type === 'Behavioral' ? 'behavioral'
            : null;
        const difficulty = typeof application.level === 'string' ? application.level.toLowerCase() : null;

        if (questionType) {
            await query(
                `INSERT INTO ai_interview_questions
                    (ai_interview_session_status_id, question_number, question_text, question_type, difficulty, asked_at)
                 VALUES (?, ?, ?, ?, ?, NOW())`,
                [session.ai_interview_session_status_id, nextQuestionNumber, questionText, questionType, difficulty]
            );
        } else {
            await query(
                `INSERT INTO ai_interview_questions
                    (ai_interview_session_status_id, question_number, question_text, difficulty, asked_at)
                 VALUES (?, ?, ?, ?, NOW())`,
                [session.ai_interview_session_status_id, nextQuestionNumber, questionText, difficulty]
            );
        }

        return res.status(200).json({ message: questionText, done: false });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Something went wrong while fetching the next question.' });
    }
});

router.post('/:id/stt', requireAuth, upload.single('audio'), async (req, res) => {
    const { id } = req.params;
    if (!UUID_PATTERN.test(id)) {
        return res.status(400).json({ message: 'A valid interview id is required.' });
    }
    if (!req.file) {
        return res.status(400).json({ message: 'An audio file is required.' });
    }

    try {
        const application = await getOwnedApplication(id, req.user.loginId);
        if (!application) {
            return res.status(404).json({ message: 'Interview not found.' });
        }

        const session = await getLatestSession(id);
        if (!session || session.status !== 'in_progress') {
            return res.status(409).json({ message: 'This interview session is not active.' });
        }

        const transcript = await transcribeAudio(
            req.file.buffer,
            req.file.originalname || 'answer.webm',
            req.file.mimetype
        );

        return res.status(200).json({ transcript: transcript.trim() });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Something went wrong while transcribing your answer.' });
    }
});

router.post('/:id/complete', requireAuth, async (req, res) => {
    const { id } = req.params;
    if (!UUID_PATTERN.test(id)) {
        return res.status(400).json({ message: 'A valid interview id is required.' });
    }

    try {
        const application = await getOwnedApplication(id, req.user.loginId);
        if (!application) {
            return res.status(404).json({ message: 'Interview not found.' });
        }

        const session = await getLatestSession(id);
        if (!session) {
            return res.status(404).json({ message: 'This interview has not been started yet.' });
        }

        if (session.status === 'completed') {
            const existing = await query(
                `SELECT overall_score, technical_score, communication_score, problem_solving_score,
                        confidence_score, relevance_score, strengths, areas_for_improvement,
                        detailed_feedback, recommendation
                 FROM ai_interview_feedback
                 WHERE ai_interview_session_status_id = ?
                 LIMIT 1`,
                [session.ai_interview_session_status_id]
            );
            return res.status(200).json({ evaluation: existing[0] ? mapFeedbackRow(existing[0]) : null });
        }

        await query(
            `UPDATE ai_interview_session_status SET status = 'completed', completed_at = NOW() WHERE id = ?`,
            [session.id]
        );
        await query(`UPDATE ai_interview_applications SET status = 'completed' WHERE id = ?`, [application.id]);

        if (session.questions_answered === 0) {
            const { subject, html, text } = aiInterviewFeedbackEmail({
                name: req.user.name,
                targetRole: application.target_role,
                evaluation: null
            });
            sendEmail({ to: req.user.email, subject, html, text })
                .catch((emailErr) => console.error('Failed to send AI interview feedback email:', emailErr));

            return res.status(200).json({ evaluation: null });
        }

        const history = await getSessionHistory(session.ai_interview_session_status_id);
        const evaluation = await generateEvaluation(application, history);

        await query(
            `INSERT INTO ai_interview_feedback
                (ai_interview_session_status_id, overall_score, technical_score, communication_score,
                 problem_solving_score, confidence_score, relevance_score, strengths,
                 areas_for_improvement, detailed_feedback, recommendation)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                session.ai_interview_session_status_id,
                evaluation.overallScore,
                evaluation.technicalScore,
                evaluation.communicationScore,
                evaluation.problemSolvingScore,
                evaluation.confidenceScore,
                evaluation.relevanceScore,
                JSON.stringify(evaluation.strengths),
                JSON.stringify(evaluation.areasForImprovement),
                evaluation.detailedFeedback,
                evaluation.recommendation
            ]
        );

        const { subject, html, text } = aiInterviewFeedbackEmail({
            name: req.user.name,
            targetRole: application.target_role,
            evaluation
        });
        sendEmail({ to: req.user.email, subject, html, text })
            .catch((emailErr) => console.error('Failed to send AI interview feedback email:', emailErr));

        return res.status(200).json({ evaluation });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Something went wrong while completing your interview.' });
    }
});

router.get('/:id/feedback', requireAuth, async (req, res) => {
    const { id } = req.params;
    if (!UUID_PATTERN.test(id)) {
        return res.status(400).json({ message: 'A valid interview id is required.' });
    }

    try {
        const application = await getOwnedApplication(id, req.user.loginId);
        if (!application) {
            return res.status(404).json({ message: 'Interview not found.' });
        }

        const session = await getLatestSession(id);
        if (!session) {
            return res.status(404).json({ message: 'No feedback is available for this interview yet.' });
        }

        const rows = await query(
            `SELECT overall_score, technical_score, communication_score, problem_solving_score,
                    confidence_score, relevance_score, strengths, areas_for_improvement,
                    detailed_feedback, recommendation
             FROM ai_interview_feedback
             WHERE ai_interview_session_status_id = ?
             LIMIT 1`,
            [session.ai_interview_session_status_id]
        );

        if (!rows[0]) {
            return res.status(404).json({ message: 'No feedback is available for this interview yet.' });
        }

        return res.status(200).json({ evaluation: mapFeedbackRow(rows[0]) });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Something went wrong while fetching your feedback.' });
    }
});

module.exports = router;
