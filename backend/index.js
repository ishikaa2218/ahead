const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('./db/connection');
const port = process.env.PORT || 3000;
const app = express();
const postRoutes = require('./routes/post_routes')
const getRoutes = require('./routes/get_routes')
const aiInterviewSessionRoutes = require('./routes/ai_interview_session_routes')
const paymentRoutes = require('./routes/payment_routes')
const { verifyEmailTransporter } = require('./utils/email')
const { startInterviewReminderPoller } = require('./utils/interviewReminders')

app.use(cors({
    origin: process.env.FRONTEND_ORIGIN,
    credentials: true
}))
app.use(express.json())
app.use(cookieParser())

app.use('/post', postRoutes)
app.use('/get', getRoutes)
app.use('/ai-interviews', aiInterviewSessionRoutes)
app.use('/payments', paymentRoutes)

app.listen(port,()=>{
    console.log("working");
    console.log(`Server running on port ${port}`);
    verifyEmailTransporter();
    startInterviewReminderPoller();
})
