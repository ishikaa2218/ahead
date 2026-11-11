import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  createCompanyInterviewPaymentOrder,
  verifyCompanyInterviewPayment,
  reportCompanyInterviewPaymentFailure,
  getInterviewSlots,
  getInterviewers,
  type ApiInterviewSlot,
  type ApiInterviewer,
  type CompanyInterviewApplicationPayload,
} from '../axios/booking';
import { getApiErrorMessage } from '../axios/data';
import { useAuth } from '../context/useAuth';
import { AmbientLight } from '../components/ambient/AmbientLight';
import { AppHeader } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import '../stylesheets/companyInterviewBooking.css';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface Interviewer {
  uuid: string;
  name: string;
  company: string;
  expertise: string;
  bio: string;
  avatar_url: string | null;
}

interface Slot {
  uuid: string;
  interviewer_uuid: string;
  start_time: string;
  end_time: string;
  timezone: string;
}

interface InterviewConfig {
  targetRole: string;
  domain: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  jobDescription: string;
}

interface ConfirmedBooking {
  bookingId: string;
  userEmail: string;
  interviewerName: string;
  interviewerCompany: string;
  interviewerAvatar: string | null;
  startTime: string;
  endTime: string;
  timezone: string;
  targetRole: string;
  domain: string;
}

// ─────────────────────────────────────────────────────────────
// Mapping API data onto the shapes this page renders
// ─────────────────────────────────────────────────────────────

function mapInterviewer(api: ApiInterviewer): Interviewer {
  return {
    uuid: api.interviewers_id,
    name: api.name,
    company: api.company_name,
    expertise: api.interview_title,
    bio: api.description ?? 'No additional details provided yet.',
    avatar_url: api.profile_image_url,
  };
}

function mapSlot(api: ApiInterviewSlot): Slot {
  return {
    uuid: api.interview_slots_id,
    interviewer_uuid: api.interviewer_id,
    start_time: `${api.slot_date}T${api.start_time}`,
    end_time: `${api.slot_date}T${api.end_time}`,
    timezone: 'Asia/Kolkata',
  };
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function Avatar({
  src,
  name,
  className,
}: {
  src: string | null;
  name: string;
  className: string;
}) {
  if (src) {
    return <img src={src} alt={name} className={className} />;
  }

  return (
    <div className={`${className} bk-avatar-fallback`} aria-hidden="true">
      {getInitials(name)}
    </div>
  );
}

function formatSlotDate(iso: string, tz: string) {
  const d = new Date(iso);

  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: tz,
  });
}

function formatSlotTime(iso: string, tz: string) {
  const d = new Date(iso);

  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  });
}

// ─────────────────────────────────────────────────────────────
// Step Indicator
// ─────────────────────────────────────────────────────────────

const STEPS = [
  'Interviewer & time',
  'Interview details',
  'Review & pay',
  'Confirmed',
];

function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="bk-steps" aria-label="Booking progress">
      {STEPS.map((label, i) => {
        const num = i + 1;
        const done = num < current;
        const active = num === current;

        return (
          <li
            key={num}
            className={`bk-step ${done ? 'done' : ''} ${
              active ? 'active' : ''
            }`}
            aria-current={active ? 'step' : undefined}
          >
            <span className="bk-step-circle" aria-hidden="true">
              {done ? <Icon name="check" size={14} /> : num}
            </span>

            <span className="bk-step-label">
              <span className="sr-only">Step {num}: </span>
              {label}
              {done && <span className="sr-only"> (done)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export function CompanyInterviewBooking() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState(1);

  const [selectedInterviewer, setSelectedInterviewer] =
    useState<Interviewer | null>(null);

  const [selectedSlot, setSelectedSlot] =
    useState<Slot | null>(null);

  const [confirmedBooking, setConfirmedBooking] =
    useState<ConfirmedBooking | null>(null);

  const [config, setConfig] = useState<InterviewConfig>({
    targetRole: '',
    domain: 'Frontend Development',
    difficulty: 'Medium',
    jobDescription: '',
  });

  const [resumeFile, setResumeFile] =
    useState<File | null>(null);

  const [error, setError] = useState('');

  const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [hasFailedAttempt, setHasFailedAttempt] = useState(false);

  // Bring any new message into view, wherever on the page the user is.
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) {
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  // ─────────────────────────────────────────────────────────
  // Load interviewers & slots
  // ─────────────────────────────────────────────────────────

  useEffect(() => {
    let isActive = true;

    Promise.all([getInterviewers(), getInterviewSlots()])
      .then(([apiInterviewers, apiSlots]) => {
        if (!isActive) return;
        setInterviewers(apiInterviewers.map(mapInterviewer));
        setSlots(apiSlots.map(mapSlot));
      })
      .catch((err: unknown) => {
        if (!isActive) return;
        setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoadingData(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  // ─────────────────────────────────────────────────────────
  // Select interviewer
  // ─────────────────────────────────────────────────────────

  const handleSelectInterviewer = (interviewer: Interviewer) => {
    setSelectedInterviewer(interviewer);
    setSelectedSlot(null);
    setError('');
  };

  // ─────────────────────────────────────────────────────────
  // Select slot
  // ─────────────────────────────────────────────────────────

  const handleSelectSlot = (slot: Slot) => {
    setSelectedSlot(slot);
    setError('');
    setStep(2);
  };

  // ─────────────────────────────────────────────────────────
  // Interview details
  // ─────────────────────────────────────────────────────────

  const handleConfigSubmit = (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!config.targetRole.trim()) {
      setError('Target role is required');
      return;
    }

    if (!selectedInterviewer || !selectedSlot) {
      setError('Please select an interviewer and slot');
      return;
    }

    setError('');
    setStep(3);
  };

  // ─────────────────────────────────────────────────────────
  // Payment — the booking is only ever written to the database inside
  // /payments/company-interview/verify, and only once the payment signature
  // checks out. Nothing is created (and the slot is never locked) beforehand —
  // if the gateway is closed, the payment fails, or verification fails, no
  // application row and no slot lock is ever touched.
  // ─────────────────────────────────────────────────────────

  async function handlePayment(payload: CompanyInterviewApplicationPayload) {
    setIsProcessing(true);
    setError('');

    try {
      const order = await createCompanyInterviewPaymentOrder(payload);

      if (!window.Razorpay) {
        setError('Payment gateway failed to load. Please refresh and try again.');
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
        theme: { color: '#4a3b57' },
        handler: (response) => {
          verifyCompanyInterviewPayment({
            ...payload,
            applicationId: order.applicationId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          })
            .then(() => {
              if (!selectedInterviewer || !selectedSlot) {
                navigate('/dashboard?tab=company');
                return;
              }

              setConfirmedBooking({
                bookingId: `AHEAD-${order.applicationId}`,
                userEmail: user?.email ?? '',
                interviewerName: selectedInterviewer.name,
                interviewerCompany: selectedInterviewer.company,
                interviewerAvatar: selectedInterviewer.avatar_url,
                startTime: selectedSlot.start_time,
                endTime: selectedSlot.end_time,
                timezone: selectedSlot.timezone,
                targetRole: config.targetRole,
                domain: config.domain,
              });
              navigate('/dashboard?tab=company');
            })
            .catch((verifyErr: unknown) => {
              setHasFailedAttempt(true);

              if (axios.isAxiosError(verifyErr) && verifyErr.response?.status === 409) {
                // Payment succeeded but the slot was taken in the meantime — refresh slots.
                setSelectedSlot(null);
                setStep(1);
                getInterviewSlots()
                  .then((apiSlots) => setSlots(apiSlots.map(mapSlot)))
                  .catch(() => {});
              }

              setError(getApiErrorMessage(verifyErr));
              setIsProcessing(false);
            });
        },
        modal: {
          ondismiss: () => {
            reportCompanyInterviewPaymentFailure({
              applicationId: order.applicationId,
              razorpay_order_id: order.orderId,
              errorCode: 'modal_dismissed',
              errorDescription: 'Payment popup closed before completion.',
            }).catch(() => {});
            setHasFailedAttempt(true);
            setError('Payment was cancelled — your interview has not been booked. You can try again below.');
            setIsProcessing(false);
          },
        },
      });

      razorpay.on('payment.failed', (response) => {
        reportCompanyInterviewPaymentFailure({
          applicationId: order.applicationId,
          razorpay_order_id: order.orderId,
          errorCode: response.error.code,
          errorDescription: response.error.description,
        }).catch(() => {});
        setHasFailedAttempt(true);
        setError((response.error.description || 'Payment failed.') + ' Your interview has not been booked.');
        setIsProcessing(false);
      });

      razorpay.open();
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        navigate(`/login?redirect=${encodeURIComponent('/company-interview-booking')}`);
        return;
      }

      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setError(getApiErrorMessage(err));
        setSelectedSlot(null);
        setStep(1);
        setIsProcessing(false);
        getInterviewSlots()
          .then((apiSlots) => setSlots(apiSlots.map(mapSlot)))
          .catch(() => {});
        return;
      }

      setHasFailedAttempt(true);
      setError(getApiErrorMessage(err));
      setIsProcessing(false);
    }
  }

  function handlePayClick() {
    if (!selectedInterviewer || !selectedSlot) {
      return;
    }

    void handlePayment({
      interviewerId: selectedInterviewer.uuid,
      slotId: selectedSlot.uuid,
      intervieweeJobRole: config.targetRole,
      domain: config.domain,
      level: config.difficulty,
      jobDescription: config.jobDescription,
    });
  }

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────

  const interviewerSlots = selectedInterviewer
    ? slots.filter(
        (slot) => slot.interviewer_uuid === selectedInterviewer.uuid,
      )
    : [];

  // Group the selected interviewer's slots by day, for display only.
  const slotsByDay = interviewerSlots.reduce<{ day: string; items: Slot[] }[]>(
    (groups, slot) => {
      const day = formatSlotDate(slot.start_time, slot.timezone);
      const group = groups.find((g) => g.day === day);
      if (group) group.items.push(slot);
      else groups.push({ day, items: [slot] });
      return groups;
    },
    [],
  );

  return (
    <div className="bk-page real-room page">
      <AmbientLight scene="app" />
      <AppHeader tone="dusk" crumb="The Real Room · Company-based interview" />

      <section className="bk-hero" data-surface="dark" data-spotlight>
        <div className="wrap wrap--wide">
          <p className="eyebrow bk-hero__eyebrow">The Real Room</p>
          <h1 className="bk-hero__title serif">
            A person, a company, <em>a time.</em>
          </h1>
          <p className="bk-hero__lede">
            Choose someone who does this for real, pick a slot they've opened,
            and tell them what you're walking into. They'll prepare for it.
          </p>
          <StepIndicator current={step} />
        </div>
      </section>

      <main id="main" className="wrap wrap--wide bk-container">

        {/* Error */}
        {error && (
          <div className="notice notice--error bk-error" role="alert" ref={errorRef}>
            <Icon name="alert" className="notice__icon" />
            <span className="notice__body">{error}</span>

            <button
              type="button"
              className="notice__close"
              aria-label="Dismiss"
              onClick={() => setError('')}
            >
              ×
            </button>
          </div>
        )}

        {/* ===================================================
            STEP 1
        =================================================== */}

        {step === 1 && (
          <div className="bk-step-content" key="step-1">

            <div className="bk-step-head">
              <h2 className="bk-section-title serif">
                Who would you like in the room?
              </h2>

              <p className="bk-section-sub">
                Select an interviewer, then pick an available time slot.
              </p>
            </div>

            {isLoadingData ? (
              <div className="bk-interviewer-grid" aria-busy="true" aria-label="Loading interviewers">
                {[0, 1, 2].map((n) => (
                  <div key={n} className="skeleton bk-skeleton" />
                ))}
              </div>
            ) : interviewers.length === 0 ? (
              <div className="bk-empty">
                <p className="serif bk-empty__title">No one's free right now.</p>
                <p>
                  No interviewers are available right now. Please check back
                  soon.
                </p>
              </div>
            ) : (
              <div className="bk-interviewer-grid">

                {interviewers.map((interviewer, index) => (
                  <button
                    type="button"
                    key={interviewer.uuid}
                    className={`bk-interviewer-card ${
                      selectedInterviewer?.uuid === interviewer.uuid
                        ? 'selected'
                        : ''
                    }`}
                    aria-pressed={selectedInterviewer?.uuid === interviewer.uuid}
                    style={{ ['--i' as string]: Math.min(index, 6) }}
                    onClick={() =>
                      handleSelectInterviewer(interviewer)
                    }
                  >
                    <Avatar
                      src={interviewer.avatar_url}
                      name={interviewer.name}
                      className="bk-avatar"
                    />

                    <div className="bk-interviewer-info">
                      <h3>{interviewer.name}</h3>

                      <span className="bk-company">
                        {interviewer.company}
                      </span>

                      <p className="bk-expertise">
                        {interviewer.expertise}
                      </p>

                      <p className="bk-bio">
                        {interviewer.bio}
                      </p>
                    </div>

                    <span className="bk-selected-badge" aria-hidden="true">
                      {selectedInterviewer?.uuid === interviewer.uuid ? (
                        <>
                          <Icon name="check" size={14} /> Selected
                        </>
                      ) : (
                        'Select'
                      )}
                    </span>
                  </button>
                ))}

              </div>
            )}

            {/* Slots */}

            {selectedInterviewer && (
              <section className="bk-slots-section" aria-labelledby="bk-slots-title">

                <h3 id="bk-slots-title" className="bk-slots-title">
                  Times with{' '}
                  <span>
                    {selectedInterviewer.name}
                  </span>
                  <span className="bk-slots-tz">All times IST</span>
                </h3>

                {interviewerSlots.length === 0 ? (
                  <p className="bk-empty bk-empty--inline">
                    No slots available for this interviewer right now.
                    Try another.
                  </p>
                ) : (
                  <div className="bk-slot-days">
                    {slotsByDay.map((group) => (
                      <div key={group.day} className="bk-slot-day">
                        <p className="bk-slot-date">{group.day}</p>
                        <div className="bk-slots-grid">
                          {group.items.map((slot) => (
                            <button
                              type="button"
                              key={slot.uuid}
                              className="bk-slot-card"
                              onClick={() =>
                                handleSelectSlot(slot)
                              }
                            >
                              <span className="bk-slot-time">
                                {formatSlotTime(
                                  slot.start_time,
                                  slot.timezone
                                )}{' '}
                                –{' '}
                                {formatSlotTime(
                                  slot.end_time,
                                  slot.timezone
                                )}
                              </span>

                              <span className="bk-slot-action" aria-hidden="true">
                                <Icon name="arrow-right" size={16} />
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </section>
            )}

          </div>
        )}

        {/* ===================================================
            STEP 2
        =================================================== */}

        {step === 2 &&
          selectedInterviewer &&
          selectedSlot && (
            <div className="bk-step-content bk-two-col" key="step-2">

              <div>
                <div className="bk-step-head">
                  <h2 className="bk-section-title serif">
                    Tell them what you're walking into.
                  </h2>

                  <p className="bk-section-sub">
                    Tell us about the interview. This helps your
                    interviewer prepare for you.
                  </p>
                </div>

                <form
                  className="bk-config-form"
                  onSubmit={handleConfigSubmit}
                >

                  {/* Target role */}

                  <div className="field">
                    <label className="field__label" htmlFor="bk-role">
                      Target role
                    </label>

                    <input
                      id="bk-role"
                      className="input"
                      type="text"
                      placeholder="e.g. Frontend Developer, SDE-1, Full Stack Intern…"
                      value={config.targetRole}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          targetRole: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  {/* Domain */}

                  <div className="field">
                    <label className="field__label" htmlFor="bk-domain">
                      Domain or track
                    </label>

                    <select
                      id="bk-domain"
                      className="select"
                      value={config.domain}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          domain: e.target.value,
                        })
                      }
                    >
                      <option>
                        Frontend Development
                      </option>

                      <option>
                        Backend Development
                      </option>

                      <option>
                        Full Stack
                      </option>

                      <option>
                        DSA + Problem Solving
                      </option>

                      <option>
                        System Design
                      </option>

                      <option>
                        HR + Communication
                      </option>

                      <option>
                        Mobile Development
                      </option>

                      <option>
                        DevOps / Cloud
                      </option>
                    </select>
                  </div>

                  {/* Difficulty */}

                  <div className="field">
                    <p className="field__label" id="bk-difficulty-label">
                      Difficulty level
                    </p>

                    <div className="segmented segmented--buttons" role="group" aria-labelledby="bk-difficulty-label">

                      {(
                        ['Easy', 'Medium', 'Hard'] as const
                      ).map((difficulty) => (
                        <button
                          key={difficulty}
                          type="button"
                          className="segmented__option"
                          aria-pressed={config.difficulty === difficulty}
                          onClick={() =>
                            setConfig({
                              ...config,
                              difficulty,
                            })
                          }
                        >
                          {difficulty}
                        </button>
                      ))}

                    </div>
                  </div>

                  {/* Job description */}

                  <div className="field">
                    <label className="field__label" htmlFor="bk-jd">
                      Job description
                      <span className="field__optional">optional</span>
                    </label>

                    <textarea
                      id="bk-jd"
                      className="textarea"
                      rows={5}
                      placeholder="Paste the job description here. Your interviewer will tailor questions to this role."
                      value={config.jobDescription}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          jobDescription: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Resume */}

                  <div className="field">
                    <span className="field__label">
                      Resume
                      <span className="field__optional">optional · PDF or DOC, max 5 MB</span>
                    </span>

                    <label className="upload">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) =>
                          setResumeFile(
                            e.target.files?.[0] || null
                          )
                        }
                      />
                      <span className="upload__icon" aria-hidden="true">
                        <Icon name="upload" size={20} />
                      </span>
                      <span className="upload__text">
                        <strong>
                          {resumeFile ? resumeFile.name : 'Upload your resume'}
                        </strong>
                        <span>PDF, DOC or DOCX</span>
                      </span>
                    </label>
                  </div>

                  {/* Actions */}

                  <div className="bk-form-actions">

                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => setStep(1)}
                    >
                      <Icon name="arrow-left" size={18} /> Back
                    </button>

                    <button
                      type="submit"
                      className="btn btn--dusk"
                    >
                      Continue to review
                      <span className="btn__arrow" aria-hidden="true">→</span>
                    </button>

                  </div>

                </form>
              </div>

              <aside className="bk-ticket bk-ticket--mini" aria-label="Your slot">
                <p className="bk-ticket__label">Your slot</p>
                <div className="bk-review-header">
                  <Avatar
                    src={selectedInterviewer.avatar_url}
                    name={selectedInterviewer.name}
                    className="bk-avatar-sm"
                  />
                  <div>
                    <h4>{selectedInterviewer.name}</h4>
                    <span>{selectedInterviewer.company}</span>
                  </div>
                </div>
                <p className="bk-ticket__when">
                  <Icon name="calendar" size={18} />
                  {formatSlotDate(
                    selectedSlot.start_time,
                    selectedSlot.timezone
                  )}
                </p>
                <p className="bk-ticket__when">
                  <Icon name="clock" size={18} />
                  {formatSlotTime(
                    selectedSlot.start_time,
                    selectedSlot.timezone
                  )}{' '}
                  IST
                </p>
                <button type="button" className="text-button bk-ticket__change" onClick={() => setStep(1)}>
                  Change time
                </button>
              </aside>
            </div>
          )}

        {/* ===================================================
            STEP 3
        =================================================== */}

        {step === 3 &&
          selectedInterviewer &&
          selectedSlot && (
            <div className="bk-step-content bk-review" key="step-3">

              <div className="bk-step-head bk-step-head--center">
                <h2 className="bk-section-title serif">
                  One look before you book.
                </h2>

                <p className="bk-section-sub">
                  Confirm your details below, then complete payment
                  to lock your slot.
                </p>
              </div>

              <div className="bk-ticket">

                <div className="bk-review-header">

                  <Avatar
                    src={selectedInterviewer.avatar_url}
                    name={selectedInterviewer.name}
                    className="bk-avatar-sm"
                  />

                  <div>
                    <h4>
                      {selectedInterviewer.name}
                    </h4>

                    <span>
                      {selectedInterviewer.company}
                    </span>
                  </div>

                </div>

                <dl className="bk-review-rows">

                  <div className="bk-review-row">
                    <dt>Date</dt>

                    <dd>
                      {formatSlotDate(
                        selectedSlot.start_time,
                        selectedSlot.timezone
                      )}
                    </dd>
                  </div>

                  <div className="bk-review-row">
                    <dt>Time</dt>

                    <dd>
                      {formatSlotTime(
                        selectedSlot.start_time,
                        selectedSlot.timezone
                      )}{' '}
                      –{' '}
                      {formatSlotTime(
                        selectedSlot.end_time,
                        selectedSlot.timezone
                      )}{' '}
                      IST
                    </dd>
                  </div>

                  <div className="bk-review-row">
                    <dt>Target role</dt>

                    <dd>
                      {config.targetRole}
                    </dd>
                  </div>

                  <div className="bk-review-row">
                    <dt>Domain</dt>

                    <dd>
                      {config.domain}
                    </dd>
                  </div>

                  <div className="bk-review-row">
                    <dt>Difficulty</dt>

                    <dd>
                      {config.difficulty}
                    </dd>
                  </div>

                  {resumeFile && (
                    <div className="bk-review-row">
                      <dt>Resume</dt>

                      <dd>
                        {resumeFile.name}
                      </dd>
                    </div>
                  )}

                </dl>

                <div className="bk-price-row">
                  <span>
                    Company-based interview · 1 session
                  </span>

                  <span className="bk-price serif">
                    ₹1,199
                  </span>
                </div>

                <p className="bk-payment-note">
                  <Icon name="lock" size={14} /> Payment is processed securely.
                  Your slot is confirmed after successful payment.
                </p>

                <div className="bk-form-actions">

                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setStep(2)}
                  >
                    <Icon name="arrow-left" size={18} /> Edit details
                  </button>

                  <button
                    type="button"
                    className="btn btn--amber"
                    onClick={handlePayClick}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        Opening secure payment
                        <span className="breath" aria-hidden="true"><span /><span /><span /></span>
                      </>
                    ) : hasFailedAttempt
                      ? 'Try payment again · ₹1,199'
                      : 'Pay ₹1,199 & confirm'}
                  </button>

                </div>

              </div>
            </div>
          )}

        {/* ===================================================
            STEP 4
        =================================================== */}

        {step === 4 && confirmedBooking && (
          <div className="bk-step-content bk-confirmed" key="step-4">

            <h2 className="bk-section-title serif">
              You're on. <em>Someone's preparing for it now.</em>
            </h2>

            <p className="bk-confirm-sub">
              A confirmation email will be sent to{' '}
              <strong>
                {confirmedBooking.userEmail}
              </strong>
              . Your interviewer will share the meeting link
              before the session.
            </p>

            <div className="bk-ticket">

              <div className="bk-review-header">

                <Avatar
                  src={confirmedBooking.interviewerAvatar}
                  name={confirmedBooking.interviewerName}
                  className="bk-avatar-sm"
                />

                <div>
                  <h4>
                    {confirmedBooking.interviewerName}
                  </h4>

                  <span>
                    {confirmedBooking.interviewerCompany}
                  </span>
                </div>

              </div>

              <dl className="bk-review-rows">

                <div className="bk-review-row">
                  <dt>Date</dt>

                  <dd>
                    {formatSlotDate(
                      confirmedBooking.startTime,
                      confirmedBooking.timezone
                    )}
                  </dd>
                </div>

                <div className="bk-review-row">
                  <dt>Time</dt>

                  <dd>
                    {formatSlotTime(
                      confirmedBooking.startTime,
                      confirmedBooking.timezone
                    )}{' '}
                    –{' '}
                    {formatSlotTime(
                      confirmedBooking.endTime,
                      confirmedBooking.timezone
                    )}{' '}
                    IST
                  </dd>
                </div>

                <div className="bk-review-row">
                  <dt>Role</dt>

                  <dd>
                    {confirmedBooking.targetRole}
                  </dd>
                </div>

                <div className="bk-review-row">
                  <dt>Domain</dt>

                  <dd>
                    {confirmedBooking.domain}
                  </dd>
                </div>

                <div className="bk-review-row">
                  <dt>Booking ID</dt>

                  <dd>
                    {confirmedBooking.bookingId}
                  </dd>
                </div>

              </dl>

            </div>

            <div className="bk-confirm-actions">

              <button
                type="button"
                className="btn btn--dusk"
                onClick={() =>
                  navigate('/dashboard')
                }
              >
                Go to my dashboard
                <span className="btn__arrow" aria-hidden="true">→</span>
              </button>

            </div>

          </div>
        )}

      </main>
    </div>
  );
}
