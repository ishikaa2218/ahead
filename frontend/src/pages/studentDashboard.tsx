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
import { AppHeader } from "../components/AppHeader";
import { Icon } from "../components/Icon";
import { useReveal } from "../components/useReveal";
import "../stylesheets/studentDashboard.css";

type DashboardTab = "ai" | "company";

interface StatusStyle {
  label: string;
  className: string;
}

const STATUS_STYLES: Record<string, StatusStyle> = {
  pending: { label: "Pending", className: "status--pending" },
  in_progress: { label: "In Progress", className: "status--progress" },
  confirmed: { label: "Confirmed", className: "status--confirmed" },
  completed: { label: "Completed", className: "status--completed" },
  cancelled: { label: "Cancelled", className: "status--cancelled" },
};

function getStatusStyle(status: string): StatusStyle {
  return (
    STATUS_STYLES[status] ?? { label: status, className: "status--default" }
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


// ── Presentation helpers (derived only from the data above) ─────────────────

function parseAIStart(scheduledAt: string | null): Date | null {
  if (!scheduledAt) return null;
  const date = new Date(
    scheduledAt.includes("T") ? scheduledAt : scheduledAt.replace(" ", "T"),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseCompanyStart(slotDate: string | null, startTime: string | null): Date | null {
  if (!slotDate || !startTime) return null;
  const date = new Date(`${slotDate.split("T")[0]}T${startTime}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayParts(date: Date | null) {
  if (!date) return { day: "—", month: "" };
  return {
    day: date.toLocaleDateString("en-IN", { day: "numeric" }),
    month: date.toLocaleDateString("en-IN", { month: "short" }),
  };
}

function greetingFor(hour: number) {
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface NextUp {
  kind: "ai" | "company";
  id: string;
  role: string;
  detail: string;
  start: Date;
  readyNow: boolean;
}

const FINISHED = new Set(["completed", "cancelled"]);

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

  useReveal([isLoading, activeTab]);

  // Close the feedback dialog with Escape.
  useEffect(() => {
    if (!feedbackModalId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFeedbackModalId(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [feedbackModalId]);

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

  // ── What comes next, from the user's real interviews ─────────────────────
  const now = new Date(currentTime);
  const upcoming: NextUp[] = [
    ...aiInterviews
      .filter((interview) => !FINISHED.has(interview.status))
      .map((interview) => ({
        kind: "ai" as const,
        id: interview.id,
        role: interview.target_role,
        detail: `Open Room · ${interview.domain} · ${interview.level}`,
        start: parseAIStart(interview.scheduled_at),
        readyNow: isInterviewReady(interview.scheduled_at),
      })),
    ...companyInterviews
      .filter((interview) => !FINISHED.has(interview.status))
      .map((interview) => ({
        kind: "company" as const,
        id: interview.id,
        role: interview.target_role,
        detail: `Real Room${interview.interviewer_name ? ` · with ${interview.interviewer_name}` : ""}${interview.interviewer_company ? `, ${interview.interviewer_company}` : ""}`,
        start: parseCompanyStart(interview.slot_date, interview.start_time),
        readyNow: isCompanyInterviewReady(
          interview.slot_date,
          interview.start_time,
          interview.end_time,
          currentTime,
        ),
      })),
  ]
    .filter((item): item is NextUp => item.start !== null)
    .filter((item) => item.readyNow || item.start.getTime() > currentTime)
    .sort((a, b) => {
      if (a.readyNow !== b.readyNow) return a.readyNow ? -1 : 1;
      return a.start.getTime() - b.start.getTime();
    });

  const nextUp = upcoming[0] ?? null;

  function nextUpLine(item: NextUp) {
    if (item.readyNow) {
      return item.kind === "ai"
        ? "It's time. You've done the work. Go ahead."
        : "It's time — your interview is starting. The link's in your email.";
    }
    const minutesAway = (item.start.getTime() - currentTime) / 60000;
    if (minutesAway <= 75) {
      return "Not long now. Somewhere quiet, headphones if you have them.";
    }
    if (isSameDay(item.start, now)) {
      return "It's today. You've done this. Go ahead.";
    }
    return `You're on for ${formatDate(item.start.toISOString())} at ${item.start.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}.`;
  }

  const firstName = user ? user.name.split(" ")[0] : "";

  return (
    <div className="dashboard page">
      <AppHeader crumb="Your interviews">
        {user && (
          <span className="app-header__greeting muted">
            Signed in as {user.name.split(" ")[0]}
          </span>
        )}
        <button
          type="button"
          className="btn btn--sm btn--ghost"
          onClick={handleLogout}
        >
          Log out
        </button>
      </AppHeader>

      <main id="main" className="dashboard-main wrap wrap--wide">
        <section className="dash-hero" aria-labelledby="dash-title">
          <div className="dash-hero__copy">
            <p className="eyebrow">{now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
            <h1 id="dash-title" className="dash-hero__title serif">
              {greetingFor(now.getHours())}
              {firstName ? <>, <em>{firstName}.</em></> : "."}
            </h1>
            <p className="dash-hero__lede muted">
              Everything you've lined up, and everything you've already been
              through — it's all here.
            </p>
          </div>

          <div
            className={`next-up ${nextUp ? `next-up--${nextUp.kind}` : "next-up--empty"}${nextUp?.readyNow ? " next-up--now" : ""}`}
            aria-live="polite"
          >
            {isLoading ? (
              <div className="next-up__loading">
                <div className="skeleton" style={{ height: 14, width: "40%" }} />
                <div className="skeleton" style={{ height: 32, width: "80%" }} />
                <div className="skeleton" style={{ height: 14, width: "60%" }} />
              </div>
            ) : nextUp ? (
              <>
                <p className="next-up__label">
                  {nextUp.readyNow ? "Now" : "Next up"}
                </p>
                <h2 className="next-up__role">{nextUp.role}</h2>
                <p className="next-up__detail">{nextUp.detail}</p>
                <p className="next-up__line serif">{nextUpLine(nextUp)}</p>
                {nextUp.readyNow && nextUp.kind === "ai" && (
                  <button
                    type="button"
                    className="btn btn--amber"
                    onClick={() =>
                      navigate(`/interview/ai/${nextUp.id}/prejoin-check`)
                    }
                  >
                    Go ahead, you're ready
                    <span className="btn__arrow" aria-hidden="true">→</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="next-up__label">Nothing scheduled</p>
                <h2 className="next-up__role serif">
                  The Open Room's ready <em>when you are.</em>
                </h2>
                <p className="next-up__detail">
                  Set up a practice run for any role, at a time that suits you.
                </p>
                <div className="next-up__actions">
                  <Link to="/ai-interview-form" className="btn btn--amber">
                    Set up a practice run
                    <span className="btn__arrow" aria-hidden="true">→</span>
                  </Link>
                  <Link to="/company-interview-booking" className="link-arrow">
                    Book the Real Room <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>

        <div className="dashboard-tabs" role="tablist" aria-label="Your interviews">
          <button
            type="button"
            role="tab"
            id="tab-ai"
            aria-selected={activeTab === "ai"}
            aria-controls="panel-interviews"
            className={`dashboard-tab ${activeTab === "ai" ? "active" : ""}`}
            onClick={() => setActiveTab("ai")}
          >
            <span className="dashboard-tab__room">Open Room</span>
            <span className="dashboard-tab__name">AI practice</span>
            <span className="dashboard-tab__count">{aiInterviews.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            id="tab-company"
            aria-selected={activeTab === "company"}
            aria-controls="panel-interviews"
            className={`dashboard-tab dashboard-tab--real ${activeTab === "company" ? "active" : ""}`}
            onClick={() => setActiveTab("company")}
          >
            <span className="dashboard-tab__room">Real Room</span>
            <span className="dashboard-tab__name">Company interviews</span>
            <span className="dashboard-tab__count">
              {companyInterviews.length}
            </span>
          </button>
        </div>

        {error && (
          <p className="notice notice--error dashboard-error" role="alert">
            {error}
          </p>
        )}

        <section
          id="panel-interviews"
          role="tabpanel"
          aria-labelledby={activeTab === "ai" ? "tab-ai" : "tab-company"}
          className="dashboard-panel"
          key={activeTab}
        >
        {isLoading ? (
          <div className="waiting">
            <span className="breath" aria-hidden="true"><span /><span /><span /></span>
            <p>One moment — pulling these up…</p>
          </div>
        ) : activeTab === "ai" ? (
          aiInterviews.length === 0 ? (
            <div className="dashboard-empty">
              <p className="serif dashboard-empty__title">No practice runs yet.</p>
              <p className="muted">
                Whenever you're ready, we'll set one up together.
              </p>
              <Link to="/ai-interview-form" className="btn">
                Set up a practice run
                <span className="btn__arrow" aria-hidden="true">→</span>
              </Link>
            </div>
          ) : (
            <ul className="dashboard-list">
              {aiInterviews.map((interview, index) => {
                const status = getStatusStyle(interview.status);
                const canStart = isInterviewReady(interview.scheduled_at);
                const when = dayParts(parseAIStart(interview.scheduled_at));

                return (
                  <li
                    key={interview.id}
                    className={`dashboard-row${canStart && interview.status !== "completed" ? " dashboard-row--ready" : ""}`}
                    data-reveal
                    style={{ ["--i" as string]: Math.min(index, 6) }}
                  >
                    <div className="dashboard-row__date" aria-hidden="true">
                      <span className="dashboard-row__day">{when.day}</span>
                      <span className="dashboard-row__month">{when.month}</span>
                    </div>

                    <div className="dashboard-row__main">
                      <h3>{interview.target_role}</h3>

                      <p className="dashboard-row__domain">
                        {interview.domain} · {interview.level}
                      </p>

                      <p className="dashboard-row__meta">
                        {interview.scheduled_at
                          ? `You're on for ${formatDate(interview.scheduled_at)} at ${formatTime(interview.scheduled_at)}`
                          : "Time not set yet"}
                      </p>

                      <p className="dashboard-row__applied">
                        You applied {formatDate(interview.created_at)}
                      </p>
                    </div>

                    <div className="dashboard-row__actions">
                      <span
                        className={`status ${status.className}`}
                      >
                        {status.label}
                      </span>

                      {canStart && interview.status !== "completed" && (
                        <button
                          type="button"
                          className="btn btn--amber btn--sm"
                          onClick={() =>
                            navigate(
                              `/interview/ai/${interview.id}/prejoin-check`,
                            )
                          }
                        >
                          Go ahead, you're ready
                          <span className="btn__arrow" aria-hidden="true">→</span>
                        </button>
                      )}

                      {interview.status === "completed" &&
                        interview.has_feedback && (
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() => openFeedback(interview.id)}
                          >
                            See how it went
                          </button>
                        )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        ) : companyInterviews.length === 0 ? (
          <div className="dashboard-empty dashboard-empty--real">
            <p className="serif dashboard-empty__title">No company interviews yet.</p>
            <p className="muted">
              When you find one worth booking, it'll show up here.
            </p>
            <Link to="/company-interview-booking" className="btn btn--dusk">
              Book a company interview
              <span className="btn__arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        ) : (
          <ul className="dashboard-list">
            {companyInterviews.map((interview, index) => {
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

              const when = dayParts(parseCompanyStart(interview.slot_date, interview.start_time));

              return (
                <li
                  key={interview.id}
                  className="dashboard-row dashboard-row--real"
                  data-reveal
                  style={{ ["--i" as string]: Math.min(index, 6) }}
                >
                  <div className="dashboard-row__date" aria-hidden="true">
                    <span className="dashboard-row__day">{when.day}</span>
                    <span className="dashboard-row__month">{when.month}</span>
                  </div>

                  <div className="dashboard-row__main">
                    <h3>{interview.target_role}</h3>

                    <p className="dashboard-row__domain">
                      {interview.domain} · {interview.level}
                    </p>

                    {interview.interviewer_name && (
                      <p className="dashboard-row__interviewer">
                        With {interview.interviewer_name}
                        {interview.interviewer_company
                          ? ` · ${interview.interviewer_company}`
                          : ""}
                      </p>
                    )}

                    <p className="dashboard-row__meta">
                      {interview.slot_date
                        ? `${formatDate(interview.slot_date)} · ${formatSlotTime(interview.start_time)} – ${formatSlotTime(interview.end_time)}`
                        : "Time not set yet"}
                    </p>

                    <p className="dashboard-row__applied">
                      You applied {formatDate(interview.created_at)}
                    </p>
                  </div>

                  <div className="dashboard-row__actions">
                    <span
                      className={`status ${status.className}`}
                    >
                      {status.label}
                    </span>

                    {canShowLinkMessage && !interviewFinished && (
                      <div className="dashboard-company-link-message" role="status">
                        <Icon name="check" size={18} />
                        <span>
                          <strong>It's time — your interview is starting.</strong>
                          <br />
                          The link's in your email. Take a breath, then go
                          ahead.
                        </span>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        </section>
      </main>

      {feedbackModalId && (
        <div className="overlay" onClick={closeFeedback}>
          <div
            className="dialog feedback"
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="dialog__close"
              aria-label="Close"
              onClick={closeFeedback}
              autoFocus
            >
              <Icon name="close" size={18} />
            </button>

            {feedbackLoading ? (
              <div className="waiting">
                <span className="breath" aria-hidden="true"><span /><span /><span /></span>
                <p>One moment — going through your notes…</p>
              </div>
            ) : feedbackError ? (
              <p className="notice notice--error" role="alert">{feedbackError}</p>
            ) : feedbackData ? (
              <>
                <p className="eyebrow">Your notes</p>
                <h2 id="feedback-title" className="feedback__title serif">
                  How did it <em>actually go?</em>
                </h2>

                <div className="feedback__score-row">
                  <div
                    className="feedback__dial"
                    style={{ ["--score" as string]: Math.round(feedbackData.overallScore) }}
                  >
                    <span className="feedback__score">
                      {Math.round(feedbackData.overallScore)}
                    </span>
                    <span className="feedback__score-max">of 100</span>
                  </div>

                  <div className="feedback__verdict">
                    <span
                      className={`feedback__badge feedback-rec-${feedbackData.recommendation}`}
                    >
                      {AI_RECOMMENDATION_LABEL[feedbackData.recommendation]}
                    </span>
                    <p className="feedback__summary">
                      {feedbackData.detailedFeedback}
                    </p>
                  </div>
                </div>

                <div className="feedback__metrics">
                  {(
                    [
                      ["Technical", feedbackData.technicalScore],
                      ["Communication", feedbackData.communicationScore],
                      ["Problem Solving", feedbackData.problemSolvingScore],
                      ["Confidence", feedbackData.confidenceScore],
                      ["Relevance", feedbackData.relevanceScore],
                    ] as [string, number][]
                  ).map(([label, score], index) => (
                    <div className="feedback__metric" key={label}>
                      <div className="feedback__metric-label">
                        <span>{label}</span>
                        <span>{Math.round(score)}</span>
                      </div>
                      <div className="feedback__metric-bar">
                        <div
                          className="feedback__metric-fill"
                          style={{ width: `${score}%`, ["--i" as string]: index }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="feedback__lists">
                {feedbackData.strengths.length > 0 && (
                  <div className="feedback__section">
                    <h3 className="feedback__section-title">
                      What you did well
                    </h3>
                    <ul>
                    {feedbackData.strengths.map((s, i) => (
                      <li
                        key={i}
                        className="feedback__item feedback__item--positive"
                      >
                        {s}
                      </li>
                    ))}
                    </ul>
                  </div>
                )}

                {feedbackData.areasForImprovement.length > 0 && (
                  <div className="feedback__section">
                    <h3 className="feedback__section-title">
                      Where to focus next
                    </h3>
                    <ul>
                    {feedbackData.areasForImprovement.map((w, i) => (
                      <li
                        key={i}
                        className="feedback__item feedback__item--next"
                      >
                        {w}
                      </li>
                    ))}
                    </ul>
                  </div>
                )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
