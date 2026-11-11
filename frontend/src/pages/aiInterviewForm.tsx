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
import { AmbientLight } from "../components/ambient/AmbientLight";
import { AppHeader } from "../components/AppHeader";
import { Icon } from "../components/Icon";
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

// Shown on the page only; the amount charged is always set by the server.
const MODE_PRICE_LABEL: Record<InterviewMode, string> = {
  Text: "₹99",
  Audio: "₹199",
};

function formatScheduled(value: string) {
  if (!value) return "Not chosen yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
        theme: { color: "#4a3b57" },
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

  const price = MODE_PRICE_LABEL[config.interviewMode];

  return (
    <div className="ai-page open-room page">
      <AmbientLight scene="app" />
      <AppHeader crumb="The Open Room" onBrandClick={() => navigate("/")}>
        <span className="ai-header-note">
          <Icon name="lock" size={16} /> Your answers stay private
        </span>
      </AppHeader>

      <main id="main" className="wrap ai-container">
        <header className="ai-hero">
          <p className="eyebrow">The Open Room · AI interview</p>
          <h1 className="ai-hero__title serif">
            Set the room up <em>the way you need it.</em>
          </h1>
          <p className="ai-hero__lede">
            Tell us what you're practising for. Maya, your AI interviewer, will
            shape the questions around your role, your track and the level you
            expect.
          </p>
        </header>

        <div className="ai-layout">
          <form className="ai-form" onSubmit={handleSubmit}>
            {/* Target Role */}
            <section className="ai-step">
              <span className="ai-step__num" aria-hidden="true">01</span>
              <div className="ai-step__body">
                <div className="field">
                  <label className="field__label" htmlFor="ai-target-role">
                    What role are you going for?
                  </label>
                  <input
                    id="ai-target-role"
                    className="input input--lg"
                    type="text"
                    placeholder="e.g. Frontend Developer, SDE-1, Full Stack Intern…"
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
              </div>
            </section>

            {/* Domain */}
            <section className="ai-step">
              <span className="ai-step__num" aria-hidden="true">02</span>
              <div className="ai-step__body">
                <div className="field">
                  <label className="field__label" htmlFor="ai-domain">
                    Domain or track
                  </label>
                  <select
                    id="ai-domain"
                    className="select"
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
              </div>
            </section>

            {/* Interview Type */}
            <section className="ai-step" aria-labelledby="ai-type-label">
              <span className="ai-step__num" aria-hidden="true">03</span>
              <div className="ai-step__body">
                <p id="ai-type-label" className="field__label">
                  What kind of interview?
                </p>
                <div className="ai-grid ai-grid--3">
                  {INTERVIEW_TYPES.map((type) => (
                    <button
                      type="button"
                      key={type.value}
                      className="choice"
                      aria-pressed={config.interviewType === type.value}
                      onClick={() =>
                        updateConfig(
                          "interviewType",
                          type.value,
                        )
                      }
                    >
                      <span className="choice__tick" aria-hidden="true" />
                      <span className="choice__title">{type.title}</span>
                      <span className="choice__desc">{type.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Difficulty */}
            <section className="ai-step" aria-labelledby="ai-difficulty-label">
              <span className="ai-step__num" aria-hidden="true">04</span>
              <div className="ai-step__body">
                <p id="ai-difficulty-label" className="field__label">
                  How hard should it be?
                </p>
                <div className="segmented segmented--buttons">
                  {(["Easy", "Medium", "Hard"] as Difficulty[]).map(
                    (difficulty) => (
                      <button
                        type="button"
                        key={difficulty}
                        className="segmented__option"
                        aria-pressed={config.difficulty === difficulty}
                        onClick={() =>
                          updateConfig(
                            "difficulty",
                            difficulty,
                          )
                        }
                      >
                        {difficulty}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </section>

            {/* Number of Questions */}
            <section className="ai-step" aria-labelledby="ai-count-label">
              <span className="ai-step__num" aria-hidden="true">05</span>
              <div className="ai-step__body">
                <p id="ai-count-label" className="field__label">
                  How many questions?
                </p>
                <div className="ai-grid ai-grid--3">
                  {QUESTION_COUNTS.map((count) => (
                    <button
                      type="button"
                      key={count}
                      className="choice choice--count"
                      aria-pressed={config.questionCount === count}
                      onClick={() =>
                        updateConfig(
                          "questionCount",
                          count,
                        )
                      }
                    >
                      <span className="choice__tick" aria-hidden="true" />
                      <span className="choice__big serif">{count}</span>
                      <span className="choice__desc">
                        questions · ~{count * 5} min
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Interview Mode */}
            <section className="ai-step" aria-labelledby="ai-mode-label">
              <span className="ai-step__num" aria-hidden="true">06</span>
              <div className="ai-step__body">
                <p id="ai-mode-label" className="field__label">
                  Speak or type?
                </p>
                <div className="ai-grid ai-grid--2">
                  <button
                    type="button"
                    className="choice choice--mode"
                    aria-pressed={config.interviewMode === "Text"}
                    onClick={() =>
                      updateConfig(
                        "interviewMode",
                        "Text",
                      )
                    }
                  >
                    <span className="choice__tick" aria-hidden="true" />
                    <span className="choice__icon serif" aria-hidden="true">Aa</span>
                    <span className="choice__title">Text interview</span>
                    <span className="choice__desc">
                      Type your answers in a chat interface.
                    </span>
                    <span className="choice__price">₹99</span>
                  </button>

                  <button
                    type="button"
                    className="choice choice--mode"
                    aria-pressed={config.interviewMode === "Audio"}
                    onClick={() =>
                      updateConfig(
                        "interviewMode",
                        "Audio",
                      )
                    }
                  >
                    <span className="choice__tick" aria-hidden="true" />
                    <span className="choice__icon" aria-hidden="true">
                      <Icon name="mic" size={22} />
                    </span>
                    <span className="choice__title">Voice interview</span>
                    <span className="choice__desc">
                      Speak your answers naturally — the closest thing to the day.
                    </span>
                    <span className="choice__price">₹199</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Schedule Interview */}
            <section className="ai-step">
              <span className="ai-step__num" aria-hidden="true">07</span>
              <div className="ai-step__body">
                <div className="field">
                  <label className="field__label" htmlFor="ai-scheduled-at">
                    When do you want to take it?
                  </label>
                  <div className="ai-datetime">
                    <Icon name="calendar" size={20} />
                    <input
                      id="ai-scheduled-at"
                      className="input"
                      type="datetime-local"
                      value={config.scheduledAt}
                      min={new Date().toISOString().slice(0, 16)}
                      onChange={(event) =>
                        updateConfig("scheduledAt", event.target.value)
                      }
                      required
                    />
                  </div>
                  <p className="field__hint">
                    We'll send you a reminder 15 minutes before your scheduled interview.
                  </p>
                </div>
              </div>
            </section>

            {/* Job Description + Resume */}
            <section className="ai-step">
              <span className="ai-step__num" aria-hidden="true">08</span>
              <div className="ai-step__body ai-step__body--stack">
                <div className="field">
                  <label className="field__label" htmlFor="ai-jd">
                    Job description
                    <span className="field__optional">optional — helps tailor the questions</span>
                  </label>
                  <textarea
                    id="ai-jd"
                    className="textarea"
                    rows={5}
                    placeholder="Paste the job description here. The AI will use it to make your interview more relevant…"
                    value={config.jobDescription}
                    onChange={(event) =>
                      updateConfig(
                        "jobDescription",
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div className="field">
                  <span className="field__label">
                    Resume
                    <span className="field__optional">optional</span>
                  </span>
                  <label className="upload">
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
                    <span className="upload__icon" aria-hidden="true">
                      <Icon name="upload" size={20} />
                    </span>
                    <span className="upload__text">
                      <strong>
                        {config.resume
                          ? config.resume.name
                          : "Upload your resume"}
                      </strong>
                      <span>PDF, DOC or DOCX · Max 5 MB</span>
                    </span>
                  </label>
                </div>
              </div>
            </section>

            {submitError && (
              <p className="notice notice--error" role="alert">
                <Icon name="alert" className="notice__icon" />
                <span className="notice__body">{submitError}</span>
              </p>
            )}

            <div className="ai-form__footer">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => navigate("/")}
              >
                <Icon name="arrow-left" size={18} /> Back
              </button>

              <button
                type="submit"
                className="btn btn--amber"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    Opening secure payment
                    <span className="breath" aria-hidden="true"><span /><span /><span /></span>
                  </>
                ) : hasFailedAttempt ? (
                  <>Try payment again · {price}</>
                ) : (
                  <>
                    Continue to payment · {price}
                    <span className="btn__arrow" aria-hidden="true">→</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <aside className="ai-summary" aria-label="Your Open Room">
            <div className="ai-summary__card" data-spotlight>
              <div className="ai-summary__glow" aria-hidden="true" />
              <p className="ai-summary__label">Your room</p>
              <p className="ai-summary__role serif">
                {config.targetRole.trim() || "Your target role"}
              </p>
              <dl className="ai-summary__list">
                <div>
                  <dt>Track</dt>
                  <dd>{config.domain}</dd>
                </div>
                <div>
                  <dt>Kind</dt>
                  <dd>{config.interviewType}</dd>
                </div>
                <div>
                  <dt>Level</dt>
                  <dd>{config.difficulty}</dd>
                </div>
                <div>
                  <dt>Length</dt>
                  <dd>
                    {config.questionCount} questions · ~{config.questionCount * 5} min
                  </dd>
                </div>
                <div>
                  <dt>Mode</dt>
                  <dd>{config.interviewMode === "Audio" ? "Voice" : "Text"}</dd>
                </div>
                <div>
                  <dt>When</dt>
                  <dd>{formatScheduled(config.scheduledAt)}</dd>
                </div>
              </dl>
              <div className="ai-summary__total">
                <span>Total</span>
                <span className="serif">{price}</span>
              </div>
              <p className="ai-summary__note">
                You'll pay securely through Razorpay. Your interview is booked
                only once payment goes through.
              </p>
            </div>
            <p className="ai-summary__aside serif">
              “Stumble once here, where it doesn't cost anything.”
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}
