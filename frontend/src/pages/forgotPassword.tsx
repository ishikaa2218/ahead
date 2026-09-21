import { useEffect, useState } from "react";
import type { SubmitEvent } from "react";
import { Link, useNavigate } from "react-router";
import {
  getApiErrorMessage,
  resetPassword,
  type ResetPasswordPayload,
} from "../axios/data";
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
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-card__brand">
          Ahead
        </Link>

        <h1 className="auth-card__title">Reset your password</h1>
        <p className="auth-card__subtitle">
          Confirm your account details and choose a new password.
        </p>

        <form className="auth-form" onSubmit={handleResetSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="reset-email">Email</label>
            <input
              id="reset-email"
              type="email"
              required
              autoComplete="email"
              value={resetForm.email}
              onChange={(event) =>
                updateResetForm("email", event.target.value)
              }
            />
          </div>

          <fieldset className="role-fieldset">
            <legend>Account type</legend>
            <div className="role-options">
              {ROLE_OPTIONS.map((option) => (
                <label key={option.value} className="role-option">
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

          <div className="form-group">
            <label htmlFor="reset-new-password">New password</label>
            <input
              id="reset-new-password"
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

          <div className="form-group">
            <label htmlFor="reset-confirm-password">
              Confirm new password
            </label>
            <input
              id="reset-confirm-password"
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

          {resetError && (
            <p className="form-error" role="alert">
              {resetError}
            </p>
          )}

          <button
            type="submit"
            className="btn btn--primary btn--block"
            disabled={isResetting}
          >
            {isResetting ? "Updating password..." : "Update Password"}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/login" className="auth-link">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
