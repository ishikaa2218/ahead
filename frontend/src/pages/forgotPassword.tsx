import { useEffect, useState } from "react";
import type { SubmitEvent } from "react";
import { Link, useNavigate } from "react-router";
import {
  getApiErrorMessage,
  resetPassword,
  type ResetPasswordPayload,
} from "../axios/data";
import { AuthShell } from "../components/AuthShell";
import "../stylesheets/login.css";

type Role = "student" | "interviewer";

interface RoleOption {
  value: Role;
  label: string;
}

interface ResetFormState {
  email: string;
  role: Role;
  newPassword: string;
  confirmPassword: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  { value: "student", label: "Student" },
  { value: "interviewer", label: "Interviewer" },
];

const INITIAL_RESET_FORM: ResetFormState = {
  email: "",
  role: "student",
  newPassword: "",
  confirmPassword: "",
};

export function ForgotPassword() {
  const navigate = useNavigate();
  const [resetForm, setResetForm] = useState<ResetFormState>(INITIAL_RESET_FORM);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetPayload, setResetPayload] = useState<ResetPasswordPayload | null>(
    null,
  );
  const isResetting = resetPayload !== null;

  useEffect(() => {
    if (!resetPayload) {
      return;
    }

    let isActive = true;

    resetPassword(resetPayload)
      .then(() => {
        if (!isActive) return;
        navigate("/login");
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setResetError(getApiErrorMessage(error));
      })
      .finally(() => {
        if (!isActive) return;
        setResetPayload(null);
      });

    return () => {
      isActive = false;
    };
  }, [resetPayload, navigate]);

  function updateResetForm<K extends keyof ResetFormState>(
    key: K,
    value: ResetFormState[K],
  ) {
    setResetForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleResetSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setResetError(null);

    if (!resetForm.email.trim()) {
      setResetError("Please enter your email.");
      return;
    }

    if (resetForm.newPassword.length < 8) {
      setResetError("Password must be at least 8 characters long.");
      return;
    }

    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setResetError("Passwords do not match.");
      return;
    }

    setResetPayload({
      email: resetForm.email.trim().toLowerCase(),
      role: resetForm.role,
      newPassword: resetForm.newPassword,
    });
  }

  return (
    <AuthShell
      aside={{
        quote: (
          <>
            It happens. <em>Let's get you back in.</em>
          </>
        ),
        caption: "Your interviews and notes are right where you left them.",
      }}
    >
      <div className="auth__head">
        <p className="eyebrow">Reset password</p>
        <h1 className="auth__title serif">
          Choose a <em>new password.</em>
        </h1>
        <p className="auth__subtitle">
          Confirm your account details and choose a new password.
        </p>
      </div>

      <form className="auth-form" onSubmit={handleResetSubmit} noValidate>
        <fieldset className="auth-form__role">
          <legend className="field__label">Account type</legend>
          <div className="segmented">
            {ROLE_OPTIONS.map((option) => (
              <label key={option.value} className="segmented__option">
                <input
                  type="radio"
                  name="reset-role"
                  value={option.value}
                  checked={resetForm.role === option.value}
                  onChange={() => updateResetForm("role", option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label className="field__label" htmlFor="reset-email">Email</label>
          <input
            id="reset-email"
            className="input"
            type="email"
            required
            autoComplete="email"
            value={resetForm.email}
            onChange={(event) =>
              updateResetForm("email", event.target.value)
            }
          />
        </div>

        <div className="auth-form__pair">
          <div className="field">
            <label className="field__label" htmlFor="reset-new-password">New password</label>
            <input
              id="reset-new-password"
              className="input"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={resetForm.newPassword}
              onChange={(event) =>
                updateResetForm("newPassword", event.target.value)
              }
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="reset-confirm-password">
              Confirm new password
            </label>
            <input
              id="reset-confirm-password"
              className="input"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={resetForm.confirmPassword}
              onChange={(event) =>
                updateResetForm("confirmPassword", event.target.value)
              }
            />
          </div>
        </div>
        <p className="field__hint">At least 8 characters.</p>

        {resetError && (
          <p className="notice notice--error" role="alert">
            {resetError}
          </p>
        )}

        <button
          type="submit"
          className="btn btn--block"
          disabled={isResetting}
        >
          {isResetting ? (
            <>
              Updating your password
              <span className="breath" aria-hidden="true"><span /><span /><span /></span>
            </>
          ) : (
            "Update password"
          )}
        </button>
      </form>

      <div className="auth__switch">
        <Link to="/login" className="link-arrow">
          <span aria-hidden="true">←</span> Back to log in
        </Link>
      </div>
    </AuthShell>
  );
}
