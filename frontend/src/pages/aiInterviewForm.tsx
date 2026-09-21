import { useState } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import {
  createAIInterviewPaymentOrder,
  verifyAIInterviewPayment,
  reportAIInterviewPaymentFailure,
  type AIInterviewApplicationPayload,
} from "../axios/booking";
import { getApiErrorMessage } from "../axios/data";
import "../stylesheets/aiInterviewForm.css";

type Difficulty = "Easy" | "Medium" | "Hard";
type InterviewType = "Technical" | "Behavioral" | "Mixed";
type InterviewMode = "Text" | "Audio";

interface InterviewConfig {
  targetRole: string;
  domain: string;
  difficulty: Difficulty;
  interviewType: InterviewType;
  questionCount: number;
  interviewMode: InterviewMode;
  jobDescription: string;
  resume: File | null;
  scheduledAt: string;
}

const DOMAINS = [
  "Frontend Development",
  "Backend Development",
  "Full Stack",
  "DSA + Problem Solving",
  "System Design",
  "HR + Communication",
  "Mobile Development",
  "DevOps / Cloud",
  "Data Science / ML",
  "Product Management",
];

const INTERVIEW_TYPES = [
  {
    value: "Technical" as InterviewType,
    title: "Technical",
    description: "Coding, concepts, frameworks & problem solving",
    icon: "⌘",
  },
  {
    value: "Behavioral" as InterviewType,
    title: "Behavioral",
    description: "Leadership, teamwork & communication",
    icon: "◉",
  },
  {
    value: "Mixed" as InterviewType,
    title: "Mixed",
    description: "A combination of technical & behavioral",
    icon: "✦",
  },
];

const QUESTION_COUNTS = [5, 8, 10];

export function AIInterviewForm() {
  const navigate = useNavigate();

  const [showChat, setShowChat] = useState(false);

  const [config, setConfig] = useState<InterviewConfig>({
    targetRole: "",
    domain: "Frontend Development",
    difficulty: "Medium",
    interviewType: "Technical",
    questionCount: 5,
    interviewMode: "Text",
    jobDescription: "",
    resume: null,
    scheduledAt: "",
  });

  const [chatInput, setChatInput] = useState("");

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasFailedAttempt, setHasFailedAttempt] = useState(false);

  // The booking is only ever written to the database inside /payments/ai-interview/verify,
  // and only once the payment signature checks out. Nothing is created here beforehand — if
  // the gateway is closed, the payment fails, or verification fails, no application row and
  // no interview slot is ever touched.
  async function startPayment(payload: AIInterviewApplicationPayload) {
    setIsProcessing(true);
    setSubmitError(null);

    try {
      const order = await createAIInterviewPaymentOrder(payload);

      if (!window.Razorpay) {
        setSubmitError("Payment gateway failed to load. Please refresh and try again.");
        setIsProcessing(false);
        return;
      }

      const razorpay = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: order.name,
        description: order.description,
        order_id: order.orderId,
        prefill: order.prefill,
        theme: { color: "#6c4cff" },
        handler: (response) => {
          verifyAIInterviewPayment({
            ...payload,
            applicationId: order.applicationId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          })
            .then(() => {
              navigate("/dashboard?tab=ai");
            })
            .catch((error: unknown) => {
              setHasFailedAttempt(true);
              setSubmitError(getApiErrorMessage(error));
              setIsProcessing(false);
            });
        },
        modal: {
          ondismiss: () => {
            reportAIInterviewPaymentFailure({
              applicationId: order.applicationId,
              razorpay_order_id: order.orderId,
              errorCode: "modal_dismissed",
              errorDescription: "Payment popup closed before completion.",
            }).catch(() => {});
            setHasFailedAttempt(true);
            setSubmitError("Payment was cancelled — your interview has not been booked. You can try again below.");
            setIsProcessing(false);
          },
        },
      });

      razorpay.on("payment.failed", (response) => {
        reportAIInterviewPaymentFailure({
          applicationId: order.applicationId,
          razorpay_order_id: order.orderId,
          errorCode: response.error.code,
          errorDescription: response.error.description,
        }).catch(() => {});
        setHasFailedAttempt(true);
        setSubmitError(
          (response.error.description || "Payment failed.") + " Your interview has not been booked.",
        );
        setIsProcessing(false);
      });

      razorpay.open();
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        navigate(`/login?redirect=${encodeURIComponent("/ai-interview-form")}`);
        return;
      }
      setHasFailedAttempt(true);
      setSubmitError(getApiErrorMessage(error));
      setIsProcessing(false);
    }
  }

  const updateConfig = <K extends keyof InterviewConfig>(
    key: K,
    value: InterviewConfig[K],
  ) => {
    setConfig((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (!config.targetRole.trim()) {
      return;
    }

    if (!config.scheduledAt) {
      return;
    }

    await startPayment({
      targetRole: config.targetRole.trim(),
      domain: config.domain,
      level: config.difficulty,
      jobDescription: config.jobDescription,
      scheduledAt: config.scheduledAt,
      interviewType: config.interviewType,
      questionCount: config.questionCount,
      interviewMode: config.interviewMode,
    });
  }

  function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!chatInput.trim()) return;

    /*
      AI chat logic will be implemented by you later.
    */

    setChatInput("");
  }

  if (showChat) {
    return (
      <div className="ai-chat-page">
        <header className="ai-chat-navbar">
          <button
            className="ai-back-button"
            onClick={() => setShowChat(false)}
          >
            ←
          </button>

          <div className="ai-chat-brand">
            <div className="ai-avatar-small">AI</div>

            <div>
              <h2>Ahead AI Interviewer</h2>
              <span>Interview in progress</span>
            </div>
          </div>

          <div className="ai-chat-status">
            <span></span>
            Live
          </div>
        </header>

        <main className="ai-chat-container">
          <div className="ai-chat-header">
            <div className="ai-chat-avatar">AI</div>

            <div>
              <h1>Let's begin your interview.</h1>
              <p>
                I'll ask you questions based on your selected role and
                preferences.
              </p>
            </div>
          </div>

          <div className="ai-interview-info">
            <span>{config.targetRole}</span>
            <span>{config.domain}</span>
            <span>{config.difficulty}</span>
            <span>{config.interviewType}</span>
          </div>

          <div className="ai-chat-messages">
            <div className="ai-message-row">
              <div className="ai-message-avatar">AI</div>

              <div className="ai-message">
                <span className="ai-message-name">
                  Ahead AI
                </span>

                <p>
                  Hi! Welcome to your mock interview. Take your time,
                  think through your answers, and answer just like you
                  would in a real interview.
                </p>

                <p>
                  Are you ready to begin?
                </p>
              </div>
            </div>

            <div className="user-message-row">
              <div className="user-message">
                Yes, I'm ready.
              </div>
            </div>

            <div className="ai-message-row">
              <div className="ai-message-avatar">AI</div>

              <div className="ai-message">
                <span className="ai-message-name">
                  Ahead AI
                </span>

                <p>
                  Great. Let's start with your first question.
                </p>

                <div className="ai-question">
                  <span>Question 01</span>

                  <strong>
                    Tell me about yourself and your experience
                    relevant to this role.
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <form
            className="ai-chat-input-area"
            onSubmit={handleSendMessage}
          >
            <input
              type="text"
              placeholder="Type your answer..."
              value={chatInput}
              onChange={(event) =>
                setChatInput(event.target.value)
              }
            />

            <button type="submit">
              →
            </button>
          </form>

          <p className="ai-chat-note">
            Answer naturally. The AI interviewer will continue based
            on your responses.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="ai-page">
      <nav className="ai-navbar">
        <button
          className="ai-logo"
          onClick={() => navigate("/")}
        >
          Ahead<span>.</span>
        </button>

        <div className="ai-navbar-label">
          AI Interview
        </div>
      </nav>

      <main className="ai-container">
        <div className="ai-hero">
          <div className="ai-hero-badge">
            ✦ AI MOCK INTERVIEW
          </div>

          <h1>
            Practice like it's
            <br />
            <span>the real thing.</span>
          </h1>

          <p>
            Configure your interview and let AI challenge you
            with questions tailored to your role, experience,
            and goals.
          </p>
        </div>

        <form
          className="ai-form-card"
          onSubmit={handleSubmit}
        >
          <div className="ai-form-heading">
            <div>
              <h2>Set up your interview</h2>

              <p>
                Tell us what you want to practice.
              </p>
            </div>

            <div className="ai-step-badge">
              STEP 01
            </div>
          </div>

          <div className="ai-divider" />

          {/* Target Role */}

          <div className="ai-field">
            <label>
              Target Role
              <span>*</span>
            </label>

            <input
              type="text"
              placeholder="e.g. Frontend Developer, SDE-1, Full Stack Intern..."
              value={config.targetRole}
              onChange={(event) =>
                updateConfig(
                  "targetRole",
                  event.target.value,
                )
              }
              required
            />
          </div>

          {/* Domain */}

          <div className="ai-field">
            <label>
              Domain / Track
              <span>*</span>
            </label>

            <select
              value={config.domain}
              onChange={(event) =>
                updateConfig(
                  "domain",
                  event.target.value,
                )
              }
            >
              {DOMAINS.map((domain) => (
                <option key={domain} value={domain}>
                  {domain}
                </option>
              ))}
            </select>
          </div>

          {/* Interview Type */}

          <div className="ai-field">
            <label>
              Interview Type
              <span>*</span>
            </label>

            <div className="ai-choice-grid">
              {INTERVIEW_TYPES.map((type) => (
                <button
                  type="button"
                  key={type.value}
                  className={`ai-choice-card ${
                    config.interviewType === type.value
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    updateConfig(
                      "interviewType",
                      type.value,
                    )
                  }
                >
                  <div className="ai-choice-icon">
                    {type.icon}
                  </div>

                  <div className="ai-choice-content">
                    <strong>{type.title}</strong>

                    <span>{type.description}</span>
                  </div>

                  <div className="ai-radio">
                    {config.interviewType === type.value && (
                      <div />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}

          <div className="ai-field">
            <label>
              Difficulty Level
              <span>*</span>
            </label>

            <div className="ai-difficulty-grid">
              {(["Easy", "Medium", "Hard"] as Difficulty[]).map(
                (difficulty) => (
                  <button
                    type="button"
                    key={difficulty}
                    className={`ai-difficulty ${
                      config.difficulty === difficulty
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      updateConfig(
                        "difficulty",
                        difficulty,
                      )
                    }
                  >
                    <span className="ai-difficulty-dot" />

                    {difficulty}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Number of Questions */}

          <div className="ai-field">
            <label>
              Number of Questions
            </label>

            <div className="ai-question-count-grid">
              {QUESTION_COUNTS.map((count) => (
                <button
                  type="button"
                  key={count}
                  className={`ai-question-count ${
                    config.questionCount === count
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    updateConfig(
                      "questionCount",
                      count,
                    )
                  }
                >
                  <strong>{count}</strong>

                  <span>questions</span>

                  <small>
                    ~{count * 5} min
                  </small>
                </button>
              ))}
            </div>
          </div>

          {/* Interview Mode */}

          <div className="ai-field">
            <label>
              Interview Mode
              <span>*</span>
            </label>

            <div className="ai-mode-grid">
              <button
                type="button"
                className={`ai-mode-card ${
                  config.interviewMode === "Text"
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  updateConfig(
                    "interviewMode",
                    "Text",
                  )
                }
              >
                <div className="ai-mode-icon">
                  Aa
                </div>

                <div>
                  <strong>Text Interview</strong>

                  <span>
                    Type your answers in a chat
                    interface.
                  </span>

                  <small className="ai-mode-price">₹99</small>
                </div>
              </button>

              <button
                type="button"
                className={`ai-mode-card ${
                  config.interviewMode === "Audio"
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  updateConfig(
                    "interviewMode",
                    "Audio",
                  )
                }
              >
                <div className="ai-mode-icon">
                  ◉
                </div>

                <div>
                  <strong>Voice Interview</strong>

                  <span>
                    Speak your answers naturally.
                  </span>

                  <small className="ai-mode-price">₹199</small>
                </div>
              </button>
            </div>
          </div>

          {/* Schedule Interview */}

          <div className="ai-field">
            <label>
              Interview Date & Time
              <span>*</span>
            </label>

            <div className="ai-schedule-input">
              <div className="ai-schedule-icon">
                📅
              </div>

              <div className="ai-schedule-content">
                <span>Choose when you want to take your interview</span>

                <input
                  type="datetime-local"
                  value={config.scheduledAt}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={(event) =>
                    updateConfig("scheduledAt", event.target.value)
                  }
                  required
                />
              </div>
            </div>

            <p className="ai-field-hint">
              We'll send you a reminder 15 minutes before your scheduled interview.
            </p>
          </div>

          {/* Job Description */}

          <div className="ai-field">
            <label>
              Job Description
              <em>
                optional — helps AI tailor questions
              </em>
            </label>

            <textarea
              rows={5}
              placeholder="Paste the job description here. The AI will use it to make your interview more relevant..."
              value={config.jobDescription}
              onChange={(event) =>
                updateConfig(
                  "jobDescription",
                  event.target.value,
                )
              }
            />
          </div>

          {/* Resume */}

          <div className="ai-field">
            <label>
              Resume
              <em>
                optional
              </em>
            </label>

            <label className="ai-upload">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(event) =>
                  updateConfig(
                    "resume",
                    event.target.files?.[0] ?? null,
                  )
                }
              />

              <div className="ai-upload-icon">
                ↑
              </div>

              <div>
                <strong>
                  {config.resume
                    ? config.resume.name
                    : "Upload your resume"}
                </strong>

                <span>
                  PDF, DOC or DOCX · Max 5 MB
                </span>
              </div>
            </label>
          </div>

          {submitError && (
            <p className="ai-error" role="alert">
              {submitError}
            </p>
          )}

          <div className="ai-form-footer">
            <button
              type="button"
              className="ai-back-btn"
              onClick={() => navigate("/")}
            >
              ← Back
            </button>

            <button
              type="submit"
              className="ai-start-setup-btn"
              disabled={isProcessing}
            >
              {isProcessing
                ? "Processing…"
                : hasFailedAttempt
                  ? "Retry Payment"
                  : "Start AI Interview"}
              <span>→</span>
            </button>
          </div>
        </form>

        <div className="ai-trust-row">
          <span>✦</span>
          Your answers stay private
          <span>•</span>
          Practice without judgment
          <span>•</span>
          Get better with every attempt
        </div>
      </main>
    </div>
  );
}