const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",

    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

async function sendEmail({ to, subject, text, html }) {
    return transporter.sendMail({
        from: `"Ahead" <${process.env.GMAIL_USER}>`,
        to,
        subject,
        text,
        html,
    });
}

async function verifyEmailTransporter() {
    try {
        await transporter.verify();
        console.log("Email transporter is ready");
    } catch (error) {
        console.error("Email transporter failed:", error);
    }
}

module.exports = {
    sendEmail,
    verifyEmailTransporter,
};