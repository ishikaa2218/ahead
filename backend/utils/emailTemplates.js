const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const BRAND_COLOR = '#171717';
const ACCENT_COLOR = '#6c4cff';

const RECOMMENDATION_STYLE = {
    strong: { bg: '#e6f9ee', color: '#0a7d43', label: 'Strong Performance' },
    good: { bg: '#e5f0ff', color: '#1b53c4', label: 'Good Performance' },
    average: { bg: '#fff4e5', color: '#a15c00', label: 'Average Performance' },
    needs_improvement: { bg: '#fdeaea', color: '#b42318', label: 'Needs Improvement' }
};

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDateTime(dateLike) {
    const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
    if (Number.isNaN(date.getTime())) return 'To be confirmed';
    return date.toLocaleString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function layout({ heading, bodyHtml }) {
    return `
    <div style="background:#f4f4f8;padding:32px 16px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e5eb;">
        <tr>
          <td style="background:#11101a;padding:26px 32px;">
            <span style="font-size:21px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Ahead<span style="color:${ACCENT_COLOR};">.</span></span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px;">
            <h1 style="margin:0 0 16px;font-size:21px;color:#17171f;">${heading}</h1>
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:18px 32px;background:#fafafa;border-top:1px solid #eee;">
            <p style="margin:0;font-size:12px;color:#9a9aa5;line-height:1.5;">You're receiving this email because you have an account on Ahead. If this wasn't you, you can safely ignore this email.</p>
          </td>
        </tr>
      </table>
    </div>`;
}

function paragraph(html) {
    return `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#45453f;">${html}</p>`;
}

function detailsCard(rows) {
    const rowsHtml = rows
        .map(
            ([label, value]) => `
        <tr>
          <td style="padding:9px 0;font-size:13px;color:#777784;border-bottom:1px solid #eeeef2;">${escapeHtml(label)}</td>
          <td style="padding:9px 0;font-size:13px;color:#17171f;font-weight:700;text-align:right;border-bottom:1px solid #eeeef2;">${escapeHtml(value)}</td>
        </tr>`
        )
        .join('');

    return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f9;border-radius:12px;padding:2px 18px;margin:18px 0;">
      ${rowsHtml}
    </table>`;
}

function ctaButton(href, label) {
    return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 4px;">
      <tr>
        <td style="border-radius:9px;background:${BRAND_COLOR};">
          <a href="${href}" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a>
        </td>
      </tr>
    </table>`;
}

function aiInterviewConfirmationEmail({ name, targetRole, domain, level, interviewType, questionCount, interviewMode, scheduledAt }) {
    const when = formatDateTime(scheduledAt);
    const rows = [
        ['Role', targetRole],
        ['Domain', domain],
        ['Difficulty', level],
        ['Format', interviewType],
        ['Mode', interviewMode],
        ['Questions', String(questionCount)],
        ['Scheduled for', when]
    ];

    const bodyHtml = `
      ${paragraph(`Hi ${escapeHtml(name)}, your AI mock interview has been booked. Here's a quick summary:`)}
      ${detailsCard(rows)}
      ${paragraph(`We'll send you a reminder 15 minutes before it starts. If you picked the audio format, make sure your camera and microphone are ready to go.`)}
    `;

    return {
        subject: `Your AI interview for ${targetRole} is confirmed`,
        html: layout({ heading: `You're all set, ${escapeHtml(name)}! 🎯`, bodyHtml }),
        text: `Hi ${name},

Your AI mock interview has been booked.

Role: ${targetRole}
Domain: ${domain}
Difficulty: ${level}
Format: ${interviewType}
Mode: ${interviewMode}
Questions: ${questionCount}
Scheduled for: ${when}

We'll remind you 15 minutes before it starts.`
    };
}

function companyInterviewConfirmationEmail({ name, interviewerName, companyName, targetRole, domain, level, scheduledAt }) {
    const when = formatDateTime(scheduledAt);
    const rows = [
        ['Interviewer', interviewerName],
        ['Company', companyName || '—'],
        ['Role', targetRole],
        ['Domain', domain],
        ['Level', level],
        ['Scheduled for', when]
    ];

    const bodyHtml = `
      ${paragraph(`Hi ${escapeHtml(name)}, your company interview application has been submitted and your slot is reserved.`)}
      ${detailsCard(rows)}
      ${paragraph(`We'll email you a reminder 15 minutes before your interview starts. Keep an eye on your inbox for any additional instructions from your interviewer.`)}
      
    `;

    return {
        subject: `Your interview with ${interviewerName} is confirmed`,
        html: layout({ heading: `You're all set, ${escapeHtml(name)}!`, bodyHtml }),
        text: `Hi ${name},

Your company interview application has been submitted.

Interviewer: ${interviewerName}
Company: ${companyName || '-'}
Role: ${targetRole}
Domain: ${domain}
Level: ${level}
Scheduled for: ${when}

We'll remind you 15 minutes before it starts.`
    };
}

function aiInterviewReminderEmail({ id, name, target_role, domain, level, scheduled_at }) {
    const when = formatDateTime(scheduled_at);
    const rows = [
        ['Role', target_role],
        ['Domain', domain],
        ['Difficulty', level],
        ['Scheduled for', when]
    ];

    const bodyHtml = `
      ${paragraph(`Hi ${escapeHtml(name)}, your AI mock interview for <strong>${escapeHtml(target_role)}</strong> starts in about 15 minutes.`)}
      ${detailsCard(rows)}
      ${paragraph(`Find a quiet spot, and make sure your camera and microphone are ready if you're doing the audio format.`)}
    `;

    return {
        subject: `Starting in 15 minutes: your ${target_role} AI interview`,
        html: layout({ heading: 'Your interview starts soon ⏰', bodyHtml }),
        text: `Hi ${name},

Your AI mock interview for ${target_role} starts in about 15 minutes.

Domain: ${domain}
Difficulty: ${level}
Scheduled for: ${when}

Join here: ${FRONTEND_ORIGIN}/interview/ai/${id}/prejoin-check`
    };
}

function companyInterviewReminderEmail({ name, target_role, domain, interviewer_name, company_name, slot_date, start_time }) {
    const when = formatDateTime(`${slot_date}T${start_time}`);
    const rows = [
        ['Interviewer', interviewer_name],
        ['Company', company_name || '—'],
        ['Role', target_role],
        ['Domain', domain],
        ['Scheduled for', when]
    ];

    const bodyHtml = `
      ${paragraph(`Hi ${escapeHtml(name)}, your interview with <strong>${escapeHtml(interviewer_name)}</strong> starts in about 15 minutes.`)}
      ${detailsCard(rows)}
      ${paragraph(`Please check your inbox for any meeting link or instructions from your interviewer, and try to join a few minutes early.`)}

    `;

    return {
        subject: `Starting in 15 minutes: your interview with ${interviewer_name}`,
        html: layout({ heading: 'Your interview starts soon ⏰', bodyHtml }),
        text: `Hi ${name},

Your interview with ${interviewer_name} starts in about 15 minutes.

Company: ${company_name || '-'}
Role: ${target_role}
Domain: ${domain}
Scheduled for: ${when}

`
    };
}

function buildFeedbackText({ name, targetRole, evaluation, recLabel }) {
    const lines = [
        `Hi ${name},`,
        '',
        `We've finished reviewing your AI mock interview for ${targetRole}.`,
        '',
        `Overall Score: ${Math.round(evaluation.overallScore)}/100 (${recLabel})`,
        `Technical: ${Math.round(evaluation.technicalScore)}/100`,
        `Communication: ${Math.round(evaluation.communicationScore)}/100`,
        `Problem Solving: ${Math.round(evaluation.problemSolvingScore)}/100`,
        `Confidence: ${Math.round(evaluation.confidenceScore)}/100`,
        `Relevance: ${Math.round(evaluation.relevanceScore)}/100`,
        '',
        evaluation.detailedFeedback || ''
    ];

    if (evaluation.strengths.length) {
        lines.push('', 'Strengths:', ...evaluation.strengths.map((s) => `- ${s}`));
    }
    if (evaluation.areasForImprovement.length) {
        lines.push('', 'Areas to Improve:', ...evaluation.areasForImprovement.map((s) => `- ${s}`));
    }

    return lines.join('\n');
}

function aiInterviewFeedbackEmail({ name, targetRole, evaluation }) {
    if (!evaluation) {
        const bodyHtml = `
          ${paragraph(`Hi ${escapeHtml(name)}, your AI mock interview for <strong>${escapeHtml(targetRole)}</strong> has ended. We weren't able to generate a detailed score for this session, but your responses have been saved.`)}
      
        `;
        return {
            subject: `Your ${targetRole} interview has ended`,
            html: layout({ heading: `Nice work, ${escapeHtml(name)}!`, bodyHtml }),
            text: `Hi ${name},

Your AI mock interview for ${targetRole} has ended. We couldn't generate a detailed score this time, but your responses have been saved.
`
        };
    }

    const recStyle = RECOMMENDATION_STYLE[evaluation.recommendation] || { bg: '#f7f7f9', color: '#45453f', label: 'Reviewed' };

    const scoreRows = [
        ['Technical', `${Math.round(evaluation.technicalScore)}/100`],
        ['Communication', `${Math.round(evaluation.communicationScore)}/100`],
        ['Problem Solving', `${Math.round(evaluation.problemSolvingScore)}/100`],
        ['Confidence', `${Math.round(evaluation.confidenceScore)}/100`],
        ['Relevance', `${Math.round(evaluation.relevanceScore)}/100`]
    ];

    const strengthsHtml = evaluation.strengths.length
        ? `<div style="margin:20px 0 8px;font-size:11px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:#9a9aa5;">Strengths</div>` +
          evaluation.strengths.map((s) => `<p style="margin:0 0 6px;font-size:13px;color:#0a7d43;">✓ ${escapeHtml(s)}</p>`).join('')
        : '';

    const improvementsHtml = evaluation.areasForImprovement.length
        ? `<div style="margin:20px 0 8px;font-size:11px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:#9a9aa5;">Areas to Improve</div>` +
          evaluation.areasForImprovement.map((s) => `<p style="margin:0 0 6px;font-size:13px;color:#a15c00;">• ${escapeHtml(s)}</p>`).join('')
        : '';

    const bodyHtml = `
      ${paragraph(`Hi ${escapeHtml(name)}, we've finished reviewing your AI mock interview for <strong>${escapeHtml(targetRole)}</strong>. Here's your report:`)}

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;">
        <tr>
          <td style="font-size:38px;font-weight:800;color:#17171f;padding-right:14px;vertical-align:middle;">
            ${Math.round(evaluation.overallScore)}<span style="font-size:16px;color:#9a9aa5;font-weight:600;">/100</span>
          </td>
          <td style="vertical-align:middle;">
            <span style="display:inline-block;padding:6px 12px;border-radius:999px;background:${recStyle.bg};color:${recStyle.color};font-size:12px;font-weight:700;">${recStyle.label}</span>
          </td>
        </tr>
      </table>

      ${detailsCard(scoreRows)}

      ${paragraph(`<em>${escapeHtml(evaluation.detailedFeedback)}</em>`)}

      ${strengthsHtml}
      ${improvementsHtml}

    
    `;

    return {
        subject: `Your feedback is ready — ${targetRole} interview`,
        html: layout({ heading: `Great effort, ${escapeHtml(name)}! 🎉`, bodyHtml }),
        text: buildFeedbackText({ name, targetRole, evaluation, recLabel: recStyle.label })
    };
}

module.exports = {
    aiInterviewConfirmationEmail,
    companyInterviewConfirmationEmail,
    aiInterviewReminderEmail,
    companyInterviewReminderEmail,
    aiInterviewFeedbackEmail
};
