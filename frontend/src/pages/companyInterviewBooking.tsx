import { useEffect, useState } from 'react';
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
  'Select Interviewer & Slot',
  'Interview Details',
  'Review & Pay',
  'Confirmed',
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="bk-steps">
      {STEPS.map((label, i) => {
        const num = i + 1;
        const done = num < current;
        const active = num === current;

        return (
          <div
            key={num}
            className={`bk-step ${done ? 'done' : ''} ${
              active ? 'active' : ''
            }`}
          >
            <div className="bk-step-circle">
              {done ? '✓' : num}
            </div>

            <span className="bk-step-label">{label}</span>

            {i < STEPS.length - 1 && (
              <div className="bk-step-line" />
            )}
          </div>
        );
      })}
    </div>
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
        theme: { color: '#6c4cff' },
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

  return (
    <div className="bk-page">

      {/* Navbar */}
      <nav className="bk-nav">
        <a href="/" className="bk-logo">
          Ahead<span>.</span>
        </a>

        <span className="bk-nav-tag">
          Company-Based Interview
        </span>
      </nav>

      <div className="bk-container">

        <StepIndicator current={step} />

        {/* Error */}
        {error && (
          <div className="bk-error">
            <span>⚠ {error}</span>

            <button onClick={() => setError('')}>
              ×
            </button>
          </div>
        )}

        {/* ===================================================
            STEP 1
        =================================================== */}

        {step === 1 && (
          <div className="bk-step-content">

            <h2 className="bk-section-title">
              Choose Your Interviewer
            </h2>

            <p className="bk-section-sub">
              Select an interviewer, then pick an available time slot.
            </p>

            {isLoadingData ? (
              <div className="bk-loading">
                Loading interviewers…
              </div>
            ) : interviewers.length === 0 ? (
              <p className="bk-empty">
                No interviewers are available right now. Please check
                back soon.
              </p>
            ) : (
              <div className="bk-interviewer-grid">

                {interviewers.map((interviewer) => (
                  <button
                    key={interviewer.uuid}
                    className={`bk-interviewer-card anim-up ${
                      selectedInterviewer?.uuid === interviewer.uuid
                        ? 'selected'
                        : ''
                    }`}
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
                      <h4>{interviewer.name}</h4>

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

                    {selectedInterviewer?.uuid ===
                      interviewer.uuid && (
                      <div className="bk-selected-badge">
                        Selected
                      </div>
                    )}
                  </button>
                ))}

              </div>
            )}

            {/* Slots */}

            {selectedInterviewer && (
              <div className="bk-slots-section">

                <h3 className="bk-slots-title">
                  Available Slots —{' '}
                  <span>
                    {selectedInterviewer.name}
                  </span>
                </h3>

                {slots.filter(
                  (slot) =>
                    slot.interviewer_uuid ===
                    selectedInterviewer.uuid
                ).length === 0 ? (
                  <p className="bk-empty">
                    No slots available for this interviewer right now.
                    Try another.
                  </p>
                ) : (
                  <div className="bk-slots-grid">

                    {slots.filter(
                      (slot) =>
                        slot.interviewer_uuid ===
                        selectedInterviewer.uuid
                    ).map((slot) => (
                      <button
                        key={slot.uuid}
                        className="bk-slot-card anim-up"
                        onClick={() =>
                          handleSelectSlot(slot)
                        }
                      >
                        <span className="bk-slot-date">
                          {formatSlotDate(
                            slot.start_time,
                            slot.timezone
                          )}
                        </span>

                        <span className="bk-slot-time">
                          {formatSlotTime(
                            slot.start_time,
                            slot.timezone
                          )}{' '}
                          –{' '}
                          {formatSlotTime(
                            slot.end_time,
                            slot.timezone
                          )}{' '}
                          IST
                        </span>

                        <span className="bk-slot-action">
                          Select →
                        </span>
                      </button>
                    ))}

                  </div>
                )}

              </div>
            )}

          </div>
        )}

        {/* ===================================================
            STEP 2
        =================================================== */}

        {step === 2 &&
          selectedInterviewer &&
          selectedSlot && (
            <div className="bk-step-content">

              <h2 className="bk-section-title">
                Interview Details
              </h2>

              <p className="bk-section-sub">
                Tell us about the interview. This helps your
                interviewer prepare for you.
              </p>

              <div className="bk-booking-summary-mini">
                <span>
                  📅{' '}
                  {formatSlotDate(
                    selectedSlot.start_time,
                    selectedSlot.timezone
                  )}
                </span>

                <span>
                  ⏰{' '}
                  {formatSlotTime(
                    selectedSlot.start_time,
                    selectedSlot.timezone
                  )}{' '}
                  IST
                </span>

                <span>
                  👤 {selectedInterviewer.name}
                </span>
              </div>

              <form
                className="bk-config-form"
                onSubmit={handleConfigSubmit}
              >

                {/* Target role */}

                <div className="bk-field">
                  <label>
                    Target Role <span className="req">*</span>
                  </label>

                  <input
                    type="text"
                    placeholder="e.g. Frontend Developer, SDE-1, Full Stack Intern..."
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

                <div className="bk-field">
                  <label>
                    Domain / Track{' '}
                    <span className="req">*</span>
                  </label>

                  <select
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

                <div className="bk-field">
                  <label>
                    Difficulty Level{' '}
                    <span className="req">*</span>
                  </label>

                  <div className="bk-difficulty-group">

                    {(
                      ['Easy', 'Medium', 'Hard'] as const
                    ).map((difficulty) => (
                      <button
                        key={difficulty}
                        type="button"
                        className={`bk-diff-btn ${
                          config.difficulty === difficulty
                            ? 'active'
                            : ''
                        } diff-${difficulty.toLowerCase()}`}
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

                <div className="bk-field">
                  <label>
                    Job Description{' '}
                    <span className="bk-optional">
                      (optional)
                    </span>
                  </label>

                  <textarea
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

                <div className="bk-field">
                  <label>
                    Upload Resume{' '}
                    <span className="bk-optional">
                      (optional · PDF or DOC, max 5 MB)
                    </span>
                  </label>

                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) =>
                      setResumeFile(
                        e.target.files?.[0] || null
                      )
                    }
                  />

                  {resumeFile && (
                    <span className="bk-file-name">
                      📎 {resumeFile.name}
                    </span>
                  )}
                </div>

                {/* Actions */}

                <div className="bk-form-actions">

                  <button
                    type="button"
                    className="bk-btn-outline"
                    onClick={() => setStep(1)}
                  >
                    ← Back
                  </button>

                  <button
                    type="submit"
                    className="bk-btn-primary"
                  >
                    Continue to Review →
                  </button>

                </div>

              </form>
            </div>
          )}

        {/* ===================================================
            STEP 3
        =================================================== */}

        {step === 3 &&
          selectedInterviewer &&
          selectedSlot && (
            <div className="bk-step-content bk-review">

              <h2 className="bk-section-title">
                Review & Pay
              </h2>

              <p className="bk-section-sub">
                Confirm your details below, then complete payment
                to lock your slot.
              </p>

              <div className="bk-review-card anim-up">

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

                <div className="bk-review-rows">

                  <div className="bk-review-row">
                    <span>Date</span>

                    <strong>
                      {formatSlotDate(
                        selectedSlot.start_time,
                        selectedSlot.timezone
                      )}
                    </strong>
                  </div>

                  <div className="bk-review-row">
                    <span>Time</span>

                    <strong>
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
                    </strong>
                  </div>

                  <div className="bk-review-row">
                    <span>Target Role</span>

                    <strong>
                      {config.targetRole}
                    </strong>
                  </div>

                  <div className="bk-review-row">
                    <span>Domain</span>

                    <strong>
                      {config.domain}
                    </strong>
                  </div>

                  <div className="bk-review-row">
                    <span>Difficulty</span>

                    <strong>
                      {config.difficulty}
                    </strong>
                  </div>

                  {resumeFile && (
                    <div className="bk-review-row">
                      <span>Resume</span>

                      <strong>
                        📎 {resumeFile.name}
                      </strong>
                    </div>
                  )}

                </div>

                <div className="bk-price-row">
                  <span>
                    Company-Based Interview · 1 session
                  </span>

                  <span className="bk-price">
                    ₹1,199
                  </span>
                </div>

                <p className="bk-payment-note">
                  Payment is processed securely. Your slot is
                  confirmed after successful payment.
                </p>

                <div className="bk-form-actions">

                  <button
                    className="bk-btn-outline"
                    onClick={() => setStep(2)}
                  >
                    ← Edit Details
                  </button>

                  <button
                    className="bk-btn-pay"
                    onClick={handlePayClick}
                    disabled={isProcessing}
                  >
                    {isProcessing
                      ? 'Processing…'
                      : hasFailedAttempt
                        ? 'Retry Payment ₹1,199'
                        : 'Pay ₹1,199 & Confirm'}
                  </button>

                </div>

              </div>
            </div>
          )}

        {/* ===================================================
            STEP 4
        =================================================== */}

        {step === 4 && confirmedBooking && (
          <div className="bk-step-content bk-confirmed">

            <h2>
              Interview Confirmed!
            </h2>

            <p className="bk-confirm-sub">
              A confirmation email will be sent to{' '}
              <strong>
                {confirmedBooking.userEmail}
              </strong>
              . Your interviewer will share the meeting link
              before the session.
            </p>

            <div className="bk-confirm-card anim-up">

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

              <div className="bk-review-rows">

                <div className="bk-review-row">
                  <span>Date</span>

                  <strong>
                    {formatSlotDate(
                      confirmedBooking.startTime,
                      confirmedBooking.timezone
                    )}
                  </strong>
                </div>

                <div className="bk-review-row">
                  <span>Time</span>

                  <strong>
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
                  </strong>
                </div>

                <div className="bk-review-row">
                  <span>Role</span>

                  <strong>
                    {confirmedBooking.targetRole}
                  </strong>
                </div>

                <div className="bk-review-row">
                  <span>Domain</span>

                  <strong>
                    {confirmedBooking.domain}
                  </strong>
                </div>

                <div className="bk-review-row">
                  <span>Booking ID</span>

                  <strong>
                    {confirmedBooking.bookingId}
                  </strong>
                </div>

              </div>

            </div>

            <div className="bk-confirm-actions">

              <button
                className="bk-btn-primary"
                onClick={() =>
                  navigate('/dashboard')
                }
              >
                Go to My Dashboard
              </button>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}