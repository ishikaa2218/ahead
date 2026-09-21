import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  getMyInterviews,
  getAIInterviewFeedback,
  AI_RECOMMENDATION_LABEL,
  type DashboardAIInterview,
  type DashboardCompanyInterview,
  type AIInterviewEvaluation,
} from "../axios/booking";
import { getApiErrorMessage } from "../axios/data";
import { useAuth } from "../context/useAuth";
import "../stylesheets/studentDashboard.css";

type DashboardTab = "ai" | "company";

interface StatusStyle {
  label: string;
  className: string;
}

const STATUS_STYLES: Record<string, StatusStyle> = {
  pending: { label: "Pending", className: "status-pending" },
  in_progress: { label: "In Progress", className: "status-progress" },
  confirmed: { label: "Confirmed", className: "status-confirmed" },
  completed: { label: "Completed", className: "status-completed" },
  cancelled: { label: "Cancelled", className: "status-cancelled" },
};

function getStatusStyle(status: string): StatusStyle {
  return (
    STATUS_STYLES[status] ?? { label: status, className: "status-default" }
  );
}

function getInitialTab(raw: string | null): DashboardTab {
  return raw === "company" ? "company" : "ai";
}

function formatDate(value: string | null) {
  if (!value) return "Not set yet";
  const normalized = value.includes("T") ? value : `${value}T00:00:00`;
  return new Date(normalized).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSlotTime(time: string | null) {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const reference = new Date();
  reference.setHours(Number(hours), Number(minutes), 0, 0);
  return reference.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isInterviewReady(scheduledAt: string | null) {
  if (!scheduledAt) return false;

  const scheduledTime = new Date(
    scheduledAt.includes("T")
      ? scheduledAt
      : scheduledAt.replace(" ", "T"),
  ).getTime();

  return Date.now() >= scheduledTime;
}

function isCompanyInterviewReady(
  slotDate: string | null,
  startTime: string | null,
  endTime: string | null,
  now: number,
) {
  if (!slotDate || !startTime) return false;

  const dateOnly = slotDate.split("T")[0];

  const start = new Date(
    `${dateOnly}T${startTime}`,
  );

  const end = endTime
    ? new Date(`${dateOnly}T${endTime}`)
    : null;

  if (Number.isNaN(start.getTime())) {
    return false;
  }

  // Interview hasn't started yet
  if (now < start.getTime()) {
    return false;
  }

  // Interview has ended
  if (end && !Number.isNaN(end.getTime())) {
    return now <= end.getTime();
  }

  return true;
}

export function StudentDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<DashboardTab>(() =>
    getInitialTab(searchParams.get("tab")),
  );
  const [aiInterviews, setAiInterviews] = useState<DashboardAIInterview[]>([]);
  const [companyInterviews, setCompanyInterviews] = useState<
    DashboardCompanyInterview[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const [feedbackModalId, setFeedbackModalId] = useState<string | null>(null);
  const [feedbackData, setFeedbackData] = useState<AIInterviewEvaluation | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    getMyInterviews()
      .then((data) => {
        if (!isActive) return;
        setAiInterviews(data.aiInterviews);
        setCompanyInterviews(data.companyInterviews);
      })
      .catch((err: unknown) => {
        if (!isActive) return;
        setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  async function handleLogout() {
    navigate("/", { replace: true });

    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  function openFeedback(id: string) {
    setFeedbackModalId(id);
    setFeedbackData(null);
    setFeedbackError(null);
    setFeedbackLoading(true);

    getAIInterviewFeedback(id)
      .then(setFeedbackData)
      .catch((err: unknown) => setFeedbackError(getApiErrorMessage(err)))
      .finally(() => setFeedbackLoading(false));
  }

  function closeFeedback() {
    setFeedbackModalId(null);
  }

  return (
    <div className="dashboard">
      <header className="dashboard-navbar">
        <div className="dashboard-navbar__inner">
          <Link to="/" className="dashboard-navbar__brand">
            Ahead<span>.</span>
          </Link>

          <div className="dashboard-navbar__right">
            {user && (
              <span className="dashboard-navbar__greeting">
                Good to see you, {user.name.split(" ")[0]}
              </span>
            )}
            <button
              type="button"
              className="dashboard-navbar__logout"
              onClick={handleLogout}
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-header">
          <h1>Your interviews</h1>
          <p>
            Everything you've lined up, and everything you've already been
            through — it's all here.
          </p>
        </div>

        <div className="dashboard-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "ai"}
            className={`dashboard-tab ${activeTab === "ai" ? "active" : ""}`}
            onClick={() => setActiveTab("ai")}
          >
            AI practice
            <span className="dashboard-tab__count">{aiInterviews.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "company"}
            className={`dashboard-tab ${activeTab === "company" ? "active" : ""}`}
            onClick={() => setActiveTab("company")}
          >
            Company interviews
            <span className="dashboard-tab__count">
              {companyInterviews.length}
            </span>
          </button>
        </div>

        {error && (
          <p className="dashboard-error" role="alert">
            {error}
          </p>
        )}

        {isLoading ? (
          <div className="dashboard-loading">
            One moment — pulling these up…
          </div>
        ) : activeTab === "ai" ? (
          aiInterviews.length === 0 ? (
            <div className="dashboard-empty">
              <p>
                No practice runs yet. Whenever you're ready, we'll set one up
                together.
              </p>
              <Link to="/ai-interview-form" className="btn-primary">
                Set up a practice run
              </Link>
            </div>
          ) : (
            <div className="dashboard-list">
              {aiInterviews.map((interview) => {
                const status = getStatusStyle(interview.status);
                const canStart = isInterviewReady(interview.scheduled_at);

                return (
                  <div key={interview.id} className="dashboard-card">
                    <div className="dashboard-card__main">
                      <h3>{interview.target_role}</h3>

                      <p className="dashboard-card__domain">
                        {interview.domain} · {interview.level}
                      </p>

                      <p className="dashboard-card__meta">
                        {interview.scheduled_at
                          ? `You're on for ${formatDate(interview.scheduled_at)} at ${formatTime(interview.scheduled_at)}`
                          : "Time not set yet"}
                      </p>

                      <p className="dashboard-card__applied">
                        You applied {formatDate(interview.created_at)}
                      </p>
                    </div>

                    <div className="dashboard-card__actions">
                      <span
                        className={`dashboard-status ${status.className}`}
                      >
                        {status.label}
                      </span>

                      {canStart && interview.status !== "completed" && (
                        <button
                          type="button"
                          className="dashboard-start-btn"
                          onClick={() =>
                            navigate(
                              `/interview/ai/${interview.id}/prejoin-check`,
                            )
                          }
                        >
                          Go ahead, you're ready
                          <span>→</span>
                        </button>
                      )}

                      {interview.status === "completed" &&
                        interview.has_feedback && (
                          <button
                            type="button"
                            className="dashboard-feedback-btn"
                            onClick={() => openFeedback(interview.id)}
                          >
                            See how it went
                          </button>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : companyInterviews.length === 0 ? (
          <div className="dashboard-empty">
            <p>
              No company interviews yet. When you find one worth booking, it'll
              show up here.
            </p>
            <Link to="/company-interview-booking" className="btn-primary">
              Book a company interview
            </Link>
          </div>
        ) : (
          <div className="dashboard-list">
            {companyInterviews.map((interview) => {
              const status = getStatusStyle(interview.status);

              const canShowLinkMessage = isCompanyInterviewReady(
                interview.slot_date,
                interview.start_time,
                interview.end_time,
                currentTime,
              );

              const interviewFinished =
                interview.status === "completed" ||
                interview.status === "cancelled";

              return (
                <div key={interview.id} className="dashboard-card">
                  <div className="dashboard-card__main">
                    <h3>{interview.target_role}</h3>

                    <p className="dashboard-card__domain">
                      {interview.domain} · {interview.level}
                    </p>

                    {interview.interviewer_name && (
                      <p className="dashboard-card__interviewer">
                        With {interview.interviewer_name}
                        {interview.interviewer_company
                          ? ` · ${interview.interviewer_company}`
                          : ""}
                      </p>
                    )}

                    <p className="dashboard-card__meta">
                      {interview.slot_date
                        ? `${formatDate(interview.slot_date)} · ${formatSlotTime(interview.start_time)} – ${formatSlotTime(interview.end_time)}`
                        : "Time not set yet"}
                    </p>

                    <p className="dashboard-card__applied">
                      You applied {formatDate(interview.created_at)}
                    </p>
                  </div>

                  <div className="dashboard-card__actions">
                    <span
                      className={`dashboard-status ${status.className}`}
                    >
                      {status.label}
                    </span>

                    {canShowLinkMessage && !interviewFinished && (
                      <div className="dashboard-company-link-message">
                        <span className="dashboard-company-link-message__icon">
                          ✓
                        </span>

                        <span>
                          <strong>It's time — your interview is starting.</strong>
                          <br />
                          The link's in your email. Take a breath, then go
                          ahead.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {feedbackModalId && (
        <div className="feedback-modal-overlay" onClick={closeFeedback}>
          <div
            className="feedback-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="feedback-modal__close"
              aria-label="Close"
              onClick={closeFeedback}
            >
              ×
            </button>

            {feedbackLoading ? (
              <div className="feedback-modal__loading">
                One moment — going through your notes…
              </div>
            ) : feedbackError ? (
              <p className="feedback-modal__error">{feedbackError}</p>
            ) : feedbackData ? (
              <>
                <h2 className="feedback-modal__title">How it went</h2>

                <div className="feedback-modal__score-row">
                  <span className="feedback-modal__score">
                    {Math.round(feedbackData.overallScore)}
                    <span className="feedback-modal__score-max">/100</span>
                  </span>

                  <span
                    className={`feedback-modal__badge feedback-rec-${feedbackData.recommendation}`}
                  >
                    {AI_RECOMMENDATION_LABEL[feedbackData.recommendation]}
                  </span>
                </div>

                <div className="feedback-modal__metrics">
                  {(
                    [
                      ["Technical", feedbackData.technicalScore],
                      ["Communication", feedbackData.communicationScore],
                      ["Problem Solving", feedbackData.problemSolvingScore],
                      ["Confidence", feedbackData.confidenceScore],
                      ["Relevance", feedbackData.relevanceScore],
                    ] as [string, number][]
                  ).map(([label, score]) => (
                    <div className="feedback-modal__metric" key={label}>
                      <div className="feedback-modal__metric-bar">
                        <div
                          className="feedback-modal__metric-fill"
                          style={{ width: `${score}%` }}
                        />
                      </div>
                      <div className="feedback-modal__metric-label">
                        <span>{label}</span>
                        <span>{Math.round(score)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="feedback-modal__summary">
                  {feedbackData.detailedFeedback}
                </p>

                {feedbackData.strengths.length > 0 && (
                  <div className="feedback-modal__section">
                    <div className="feedback-modal__section-title">
                      What you did well
                    </div>
                    {feedbackData.strengths.map((s, i) => (
                      <div
                        key={i}
                        className="feedback-modal__item feedback-modal__item--positive"
                      >
                        ✓ {s}
                      </div>
                    ))}
                  </div>
                )}

                {feedbackData.areasForImprovement.length > 0 && (
                  <div className="feedback-modal__section">
                    <div className="feedback-modal__section-title">
                      Where to focus next
                    </div>
                    {feedbackData.areasForImprovement.map((w, i) => (
                      <div
                        key={i}
                        className="feedback-modal__item feedback-modal__item--warn"
                      >
                        • {w}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
