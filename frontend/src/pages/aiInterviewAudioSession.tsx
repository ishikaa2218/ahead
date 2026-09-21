import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  startAISession,
  sendAIInterviewAnswer,
  transcribeAIAnswer,
  completeAISession,
  type AISessionInterviewConfig,
} from "../axios/booking";
import { getApiErrorMessage } from "../axios/data";
import "../stylesheets/aiInterviewAudioSession.css";

const AI_INTERVIEWER_NAME = "Maya";

function InterviewerAvatar() {
  return (
    <svg
      className="ais-avatar"
      viewBox="0 0 96 96"
      role="img"
      aria-label={`${AI_INTERVIEWER_NAME}, your interviewer`}
    >
      <defs>
        <clipPath id="ais-avatar-clip">
          <circle cx="48" cy="48" r="48" />
        </clipPath>
        <linearGradient id="ais-avatar-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ebe2d3" />
          <stop offset="1" stopColor="#dccfb8" />
        </linearGradient>
      </defs>
      <g clipPath="url(#ais-avatar-clip)">
        <rect width="96" height="96" fill="url(#ais-avatar-bg)" />
        <circle cx="48" cy="96" r="30" fill="#5c6a48" />
        <rect x="30" y="70" width="36" height="22" rx="11" fill="#5c6a48" />
        <circle cx="48" cy="42" r="19" fill="#c4764e" />
        <path
          d="M27 44c0-16 9-25 21-25s21 9 21 25c0-6-3-9-6-10 1-8-6-13-15-13s-16 6-15 14c-3 1-6 3-6 9z"
          fill="#14170f"
        />
        <circle cx="41" cy="43" r="2.1" fill="#14170f" />
        <circle cx="55" cy="43" r="2.1" fill="#14170f" />
        <path
          d="M43 50c3 2.6 7 2.6 10 0"
          stroke="#14170f"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

type TurnState =
  | "loading"
  | "ai-speaking"
  | "idle"
  | "recording"
  | "transcribing"
  | "ai-thinking"
  | "session-ended"
  | "evaluating"
  | "done";

export function AIInterviewAudioSession() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [interview, setInterview] = useState<AISessionInterviewConfig | null>(null);
  const [startError, setStartError] = useState("");
  const [streamError, setStreamError] = useState("");
  const [turnState, setTurnState] = useState<TurnState>("loading");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOn, setIsCamOn] = useState(true);
  const [showCaptions, setShowCaptions] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
const userVideoRef = useRef<HTMLVideoElement | null>(null);

const setVideoRef = (element: HTMLVideoElement | null) => {
  userVideoRef.current = element;

  if (element && streamRef.current) {
    element.srcObject = streamRef.current;

    element.play().catch((err) => {
      console.error("Camera playback failed:", err);
    });
  }
};
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const sessionEndedRef = useRef(false);
  const evaluationStartedRef = useRef(false);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
        .toString()
        .padStart(2, "0");

    const secs = (seconds % 60)
        .toString()
        .padStart(2, "0");

    return `${minutes}:${secs}`;
  };

  useEffect(() => {
    if (!id) return;
    let mounted = true;

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        
        // if (userVideoRef.current) userVideoRef.current.srcObject = stream;
      } catch {
        if (mounted) setStreamError("Can't reach your camera or mic — check your browser permissions.");
      }

      try {
        const data = await startAISession(id!);
        if (!mounted) return;

        setInterview(data.interview);
        setTimeLeft((data.interview.questionCount || 5) * 5 * 60);

        if (data.readyToComplete) {
          sessionEndedRef.current = true;
          setTurnState("session-ended");
          return;
        }

        if (data.pendingQuestion) {
          setCurrentQuestion(data.pendingQuestion);
          speakText(data.pendingQuestion, () => setTurnState("idle"));
        } else {
          await fetchNextQuestion();
        }
      } catch (err: unknown) {
        if (!mounted) return;
        setStartError(getApiErrorMessage(err));
        setTurnState("done");
      }
    }

    init();

    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      window.speechSynthesis.cancel();
    };

  }, [id]);

  useEffect(() => {
    if (!interview || timeLeft === 0) return;

    timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
            if (prev <= 1) {
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                }

                if (!sessionEndedRef.current) {
                    sessionEndedRef.current = true;
                    window.speechSynthesis.cancel();
                    setTurnState("session-ended");
                }

                return 0;
            }

            return prev - 1;
        });
    }, 1000);

    return () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
    };
  }, [interview]);

  useEffect(() => {
    if (turnState === "session-ended" && !evaluationStartedRef.current) {
      evaluationStartedRef.current = true;
      setTurnState("evaluating");
      triggerCompletion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnState]);

  const fetchNextQuestion = async (answer?: string) => {
    if (!id) return;
    setTurnState("ai-thinking");
    try {
      const res = await sendAIInterviewAnswer(id, answer);

      if (answer) setCurrentTranscript(answer);
      setCurrentQuestion(res.message);

      if (res.done) {
        speakText(res.message, () => {
          if (!sessionEndedRef.current) {
            sessionEndedRef.current = true;
            setTurnState("session-ended");
          }
        });
      } else {
        setCurrentTranscript("");
        speakText(res.message, () => setTurnState("idle"));
      }
    } catch {
      setTurnState("idle");
    }
  };

  const speakText = (text: string, onEnd?: () => void) => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.92;
    utter.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((v) => v.name.includes("Google") && v.lang === "en-US") ||
      voices.find((v) => v.lang === "en-US") ||
      voices[0];
    if (preferred) utter.voice = preferred;

    utter.onstart = () => { setIsSpeaking(true); setTurnState("ai-speaking"); };
    utter.onend = () => { setIsSpeaking(false); onEnd?.(); };
    utter.onerror = () => { setIsSpeaking(false); onEnd?.(); };

    window.speechSynthesis.speak(utter);
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    audioChunksRef.current = [];

    const audioStream = new MediaStream(streamRef.current.getAudioTracks());
    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
      : MediaRecorder.isTypeSupported("audio/ogg") ? "audio/ogg"
      : "audio/mp4";

    const recorder = new MediaRecorder(audioStream, { mimeType });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
    recorder.start(250);
    mediaRecorderRef.current = recorder;
    setTurnState("recording");
  };

  const stopAndTranscribe = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive" || !id) return;

    recorder.onstop = async () => {
      const mime = recorder.mimeType || "audio/webm";
      const ext = mime.includes("ogg") ? "ogg" : mime.includes("mp4") ? "mp4" : "webm";
      const blob = new Blob(audioChunksRef.current, { type: mime });

      setTurnState("transcribing");
      try {
        const transcript = await transcribeAIAnswer(id, blob, `answer.${ext}`);
        if (transcript.trim()) {
          await fetchNextQuestion(transcript.trim());
        } else {
          setTurnState("idle");
        }
      } catch {
        setTurnState("idle");
      }
    };

    recorder.stop();
  };

  const handleEndSession = () => {
      if (sessionEndedRef.current) return;

      sessionEndedRef.current = true; 
      window.speechSynthesis.cancel();

      if (timerRef.current) {
          clearInterval(timerRef.current);
      }

      setTimeLeft(0);

      if (mediaRecorderRef.current?.state !== "inactive") {
          mediaRecorderRef.current?.stop();
      }

      setTurnState("session-ended");
  };

  const triggerCompletion = async () => {
    if (!id) { setTurnState("done"); return; }
    try {
      await completeAISession(id);
      await new Promise((r) => setTimeout(r, 1200));
    } catch {
      // still show the done screen even if evaluation fails
    } finally {
      setTurnState("done");
    }
  };

  const toggleMute = () => {
    streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsMuted((m) => !m);
  };

  const toggleCamera = () => {
    streamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsCamOn((c) => !c);
  };

  if (startError) {
    return (
      <div className="ais-page ais-centered">
        <div className="ais-error-box">
          <div className="ais-error-icon">!</div>
          <h3>We couldn't start the interview</h3>
          <p>{startError}</p>
          <button className="ais-primary-btn" onClick={() => navigate("/dashboard")}>
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  if (turnState === "loading") {
    return (
      <div className="ais-page ais-centered">
        <div className="ais-loading-dots"><span /><span /><span /></div>
        <p className="ais-loading-label">
          {AI_INTERVIEWER_NAME} is getting the room ready…
        </p>
      </div>
    );
  }

  if (turnState === "evaluating" || turnState === "done") {
    return (
      <div className="ais-page ais-centered">
        {turnState === "evaluating" ? (
          <>
            <div className="ais-loading-dots"><span /><span /><span /></div>
            <p className="ais-loading-label">
              {AI_INTERVIEWER_NAME} is going over how it went…
            </p>
          </>
        ) : (
          <div className="ais-done-card">
            <div className="ais-done-title">That's a wrap</div>
            <p className="ais-done-message">
              Nicely done. Your notes are on your dashboard whenever you want to
              look them over.
            </p>
            <button className="ais-primary-btn" onClick={() => navigate("/dashboard")}>
              Back to dashboard
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="ais-page">
      <div className="ais-header">
        <div className="ais-header-left">
            <button
                type="button"
                className="ais-brand"
                onClick={() => navigate("/dashboard")}
            >
                Ahead<span>.</span>
            </button>

            <span className="ais-header-divider" />

            <span className="ais-live-badge">● LIVE</span>

            <span className="ais-role-name">
                {interview?.targetRole}
            </span>

            <span className="ais-role-meta">
                {interview?.difficulty} · {interview?.interviewType}
            </span>
        </div>

        <div className="ais-header-right">
            <div
                className={`ais-timer ${
                    timeLeft <= 300 && !sessionEndedRef.current
                        ? "ais-timer-warn"
                        : ""
                }`}
            >
                {formatTime(timeLeft)}
            </div>
        </div>
      </div>

      <div className="ais-main">
        <div className="ais-tiles">
          <div className={`ais-tile ais-ai-tile ${isSpeaking ? "ais-speaking" : ""}`}>
            <div className="ais-avatar-ring">
              <InterviewerAvatar />
            </div>
            {isSpeaking && (
              <div className="ais-waveform">
                {[1, 2, 3, 4, 5].map((n) => <div key={n} className={`ais-wave-bar ais-wave-bar-${n}`} />)}
              </div>
            )}
            <div className="ais-tile-label">{AI_INTERVIEWER_NAME}</div>
            {turnState === "ai-thinking" && (
              <div className="ais-tile-status">Thinking it over…</div>
            )}
          </div>

          <div className="ais-tile ais-user-tile">
            {streamError ? (
              <div className="ais-cam-placeholder">
                <span className="ais-cam-icon">📷</span>
                <p>{streamError}</p>
              </div>
            ) : (
              <>
                <video
                  ref={setVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`ais-user-video ${!isCamOn ? "ais-hidden" : ""}`}
                />
                {!isCamOn && (
                  <div className="ais-cam-placeholder">
                    <span className="ais-cam-icon">📷</span>
                    <p>Camera's off</p>
                  </div>
                )}
              </>
            )}
            {turnState === "recording" && <div className="ais-recording-badge">● REC</div>}
            <div className="ais-tile-label">You</div>
          </div>
        </div>

        {showCaptions && (
          <div className="ais-captions-panel">
            <div className="ais-captions-header">Captions</div>
            {currentQuestion && (
              <div className="ais-caption-block">
                <div className="ais-caption-speaker">{AI_INTERVIEWER_NAME}</div>
                <p className="ais-caption-text">{currentQuestion}</p>
              </div>
            )}
            {turnState === "recording" && (
              <div className="ais-caption-block">
                <div className="ais-caption-speaker">You</div>
                <p className="ais-caption-text ais-caption-recording">Listening…</p>
              </div>
            )}
            {turnState === "transcribing" && (
              <div className="ais-caption-block">
                <div className="ais-caption-speaker">You</div>
                <p className="ais-caption-text ais-caption-muted">Writing that down…</p>
              </div>
            )}
            {currentTranscript && turnState !== "recording" && turnState !== "transcribing" && (
              <div className="ais-caption-block">
                <div className="ais-caption-speaker">You</div>
                <p className="ais-caption-text">{currentTranscript}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="ais-controls">
        <button
          className={`ais-ctrl-btn ${isMuted ? "ais-ctrl-active" : ""}`}
          onClick={toggleMute}
          title={isMuted ? "Unmute" : "Mute"}
        >
          <span className="ais-ctrl-icon">{isMuted ? "🔇" : "🎤"}</span>
          <span className="ais-ctrl-label">{isMuted ? "Unmute" : "Mute"}</span>
        </button>

        <button
          className={`ais-ctrl-btn ${!isCamOn ? "ais-ctrl-active" : ""}`}
          onClick={toggleCamera}
          title={isCamOn ? "Turn camera off" : "Turn camera on"}
        >
          <span className="ais-ctrl-icon">{isCamOn ? "📷" : "🚫"}</span>
          <span className="ais-ctrl-label">{isCamOn ? "Camera" : "Cam Off"}</span>
        </button>

        {turnState === "idle" && (
          <button className="ais-ctrl-btn ais-ctrl-record" onClick={startRecording}>
            <span className="ais-ctrl-icon">◉</span>
            <span className="ais-ctrl-label">Answer</span>
          </button>
        )}
        {turnState === "recording" && (
          <button className="ais-ctrl-btn ais-ctrl-submit ais-pulse" onClick={stopAndTranscribe}>
            <span className="ais-ctrl-icon">✓</span>
            <span className="ais-ctrl-label">I'm done</span>
          </button>
        )}
        {(turnState === "transcribing" || turnState === "ai-thinking" || turnState === "ai-speaking") && (
          <button className="ais-ctrl-btn" disabled>
            <span className="ais-ctrl-icon">
              {turnState === "ai-speaking" ? "🔊" : "⌛"}
            </span>
            <span className="ais-ctrl-label">
              {turnState === "ai-speaking"
                ? "Speaking"
                : turnState === "transcribing"
                  ? "One moment"
                  : "Thinking"}
            </span>
          </button>
        )}

        <button
          className={`ais-ctrl-btn ${showCaptions ? "ais-ctrl-active" : ""}`}
          onClick={() => setShowCaptions((s) => !s)}
          title="Toggle captions"
        >
          <span className="ais-ctrl-icon ais-ctrl-cc">CC</span>
          <span className="ais-ctrl-label">Captions</span>
        </button>

        <button className="ais-ctrl-btn ais-ctrl-end-btn" onClick={handleEndSession}>
          <span className="ais-ctrl-icon">✕</span>
          <span className="ais-ctrl-label">End</span>
        </button>
      </div>
    </div>
  );
}
