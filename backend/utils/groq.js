const OpenAI = require("openai");
const { toFile } = require("openai");

const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
});

const CHAT_MODEL = "openai/gpt-oss-120b";
const TRANSCRIPTION_MODEL = "whisper-large-v3-turbo";

async function getGroqChatCompletion(messages, { jsonMode = false } = {}) {
    const completion = await groq.chat.completions.create({
        model: CHAT_MODEL,
        messages,
        temperature: 0.7,
        reasoning_effort: "low",
        max_tokens: 400,
        ...(jsonMode
            ? {
                  response_format: {
                      type: "json_object",
                  },
              }
            : {}),
    });

    return completion.choices[0].message.content;
}

async function transcribeAudio(buffer, filename, mimetype) {
    const audioFile = await toFile(buffer, filename, {
        type: mimetype,
    });

    const transcription = await groq.audio.transcriptions.create({
        file: audioFile,
        model: TRANSCRIPTION_MODEL,
        language: "en",
    });

    return transcription.text || "";
}

module.exports = {
    getGroqChatCompletion,
    transcribeAudio,
};