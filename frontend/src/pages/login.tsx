import { useEffect, useState } from "react";
import type { SubmitEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  getApiErrorMessage,
  loginUser,
  signupUser,
  type LoginPayload,
  type SignupPayload,
} from "../axios/data";
import { useAuth } from "../context/useAuth";
import { AuthShell } from "../components/AuthShell";
import "../stylesheets/login.css";

function getSafeRedirectTarget(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("://")) {
    return null;
  }
  return raw;
}

function getDefaultDestination(role: Role): string {
  return role === "student" ? "/dashboard" : "/";
}

type Role = "student" | "interviewer";
type AuthMode = "login" | "signup";

interface RoleOption {
  value: Role;
  label: string;
}

interface LoginFormState {
  email: string;
  password: string;
  role: Role;
}

interface SignupFormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: Role;
}

const ROLE_OPTIONS: RoleOption[] = [
  { value: "student", label: "Student" },
  { value: "interviewer", label: "Interviewer" },
];

const INITIAL_LOGIN_FORM: LoginFormState = {
  email: "",
  password: "",
  role: "student",
};

const INITIAL_SIGNUP_FORM: SignupFormState = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "student",
};

export function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refresh } = useAuth();
  const redirectTarget = getSafeRedirectTarget(searchParams.get("redirect"));
  const [mode, setMode] = useState<AuthMode>(() =>
    searchParams.get("mode") === "signup" ? "signup" : "login",
  );
  const [loginForm, setLoginForm] = useState<LoginFormState>(INITIAL_LOGIN_FORM);
  const [signupForm, setSignupForm] = useState<SignupFormState>(() => ({
    ...INITIAL_SIGNUP_FORM,
    role: searchParams.get("role") === "interviewer" ? "interviewer" : "student",
  }));
  const [loginError, setLoginError] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null);
  const [signupPayload, setSignupPayload] = useState<SignupPayload | null>(null);
  const [loginPayload, setLoginPayload] = useState<LoginPayload | null>(null);
  const isSigningUp = signupPayload !== null;
  const isLoggingIn = loginPayload !== null;

  useEffect(() => {
    if (!signupPayload) {
      return;
    }

    let isActive = true;

    signupUser(signupPayload)
      .then(() => {
        if (!isActive) return;
        setSignupForm(INITIAL_SIGNUP_FORM);
        setSignupSuccess("You're all set. Go ahead and log in.");
        setMode("login");
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setSignupError(getApiErrorMessage(error));
      })
      .finally(() => {
        if (!isActive) return;
        setSignupPayload(null);
      });

    return () => {
      isActive = false;
    };
  }, [signupPayload]);

  useEffect(() => {
    if (!loginPayload) {
      return;
    }

    let isActive = true;

    loginUser(loginPayload)
      .then(async (result) => {
        if (!isActive) return;
        setLoginForm(INITIAL_LOGIN_FORM);
        await refresh();
        if (!isActive) return;
        navigate(redirectTarget ?? getDefaultDestination(result.role));
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setLoginError(getApiErrorMessage(error));
      })
      .finally(() => {
        if (!isActive) return;
        setLoginPayload(null);
      });

    return () => {
      isActive = false;
    };
  }, [loginPayload, navigate, redirectTarget, refresh]);

  function updateLoginForm<K extends keyof LoginFormState>(
    key: K,
    value: LoginFormState[K],
  ) {
    setLoginForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateSignupForm<K extends keyof SignupFormState>(
    key: K,
    value: SignupFormState[K],
  ) {
    setSignupForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleMode() {
    setLoginError(null);
    setSignupError(null);
    setSignupSuccess(null);
    setMode((prev) => (prev === "login" ? "signup" : "login"));
  }

  function handleLoginSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError(null);

    if (!loginForm.email.trim() || !loginForm.password) {
      setLoginError("We'll need both your email and password to get you in.");
      return;
    }

    setLoginPayload({
      email: loginForm.email.trim().toLowerCase(),
      password: loginForm.password,
      role: loginForm.role,
    });
  }

  function handleSignupSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setSignupError(null);

    if (!signupForm.name.trim() || !signupForm.email.trim()) {
      setSignupError("Just your name and email to start.");
      return;
    }

    if (signupForm.password.length < 8) {
      setSignupError("Passwords need to be at least 8 characters.");
      return;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      setSignupError("Those two passwords don't match yet.");
      return;
    }

    setSignupPayload({
      name: signupForm.name.trim(),
      email: signupForm.email.trim().toLowerCase(),
      password: signupForm.password,
      role: signupForm.role,
    });
  }

  return (
    <AuthShell
      aside={{
        quote: (
          <>
            Take a moment. <em>There's no rush.</em>
          </>
        ),
        caption: "The room before the room that matters.",
      }}
    >
      <div className="auth__head" key={`head-${mode}`}>
        <p className="eyebrow">{mode === "login" ? "Log in" : "Create an account"}</p>
        <h1 className="auth__title serif">
          {mode === "login" ? (
            <>
              Welcome <em>back.</em>
            </>
          ) : (
            <>
              Let's get you <em>set up.</em>
            </>
          )}
        </h1>
        <p className="auth__subtitle">
          {mode === "login"
            ? "Log back in and pick up right where you left off."
            : "A few details and you're in. We'll take it one step at a time from there."}
        </p>
      </div>

      {mode === "login" ? (
        <form
          className="auth-form"
          onSubmit={handleLoginSubmit}
          noValidate
          key="login"
        >
          <fieldset className="auth-form__role">
            <legend className="field__label">Log in as</legend>
            <div className="segmented">
              {ROLE_OPTIONS.map((option) => (
                <label key={option.value} className="segmented__option">
                  <input
                    type="radio"
                    name="login-role"
                    value={option.value}
                    checked={loginForm.role === option.value}
                    onChange={() => updateLoginForm("role", option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="field">
            <label className="field__label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              className="input"
              type="email"
              required
              autoComplete="email"
              value={loginForm.email}
              onChange={(event) =>
                updateLoginForm("email", event.target.value)
              }
            />
          </div>

          <div className="field">
            <div className="field__label">
              <label htmlFor="login-password">Password</label>
              <Link to="/forgot-password" className="auth__inline-link">
                Forgot your password?
              </Link>
            </div>
            <input
              id="login-password"
              className="input"
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
              value={loginForm.password}
              onChange={(event) =>
                updateLoginForm("password", event.target.value)
              }
            />
          </div>

          {signupSuccess && (
            <p className="notice notice--success" role="status">
              {signupSuccess}
            </p>
          )}

          {loginError && (
            <p className="notice notice--error" role="alert">
              {loginError}
            </p>
          )}

          <button
            type="submit"
            className="btn btn--block"
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <>
                One moment
                <span className="breath" aria-hidden="true"><span /><span /><span /></span>
              </>
            ) : (
              <>
                Go ahead
                <span className="btn__arrow" aria-hidden="true">→</span>
              </>
            )}
          </button>
        </form>
      ) : (
        <form
          className="auth-form"
          onSubmit={handleSignupSubmit}
          noValidate
          key="signup"
        >
          <fieldset className="auth-form__role">
            <legend className="field__label">Sign up as</legend>
            <div className="segmented">
              {ROLE_OPTIONS.map((option) => (
                <label key={option.value} className="segmented__option">
                  <input
                    type="radio"
                    name="signup-role"
                    value={option.value}
                    checked={signupForm.role === option.value}
                    onChange={() => updateSignupForm("role", option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="field">
            <label className="field__label" htmlFor="signup-name">Full name</label>
            <input
              id="signup-name"
              className="input"
              type="text"
              required
              autoComplete="name"
              value={signupForm.name}
              onChange={(event) =>
                updateSignupForm("name", event.target.value)
              }
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              className="input"
              type="email"
              required
              autoComplete="email"
              value={signupForm.email}
              onChange={(event) =>
                updateSignupForm("email", event.target.value)
              }
            />
          </div>

          <div className="auth-form__pair">
            <div className="field">
              <label className="field__label" htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                className="input"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                aria-describedby="signup-password-hint"
                value={signupForm.password}
                onChange={(event) =>
                  updateSignupForm("password", event.target.value)
                }
              />
            </div>

            <div className="field">
              <label className="field__label" htmlFor="signup-confirm-password">
                Confirm password
              </label>
              <input
                id="signup-confirm-password"
                className="input"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={signupForm.confirmPassword}
                onChange={(event) =>
                  updateSignupForm("confirmPassword", event.target.value)
                }
              />
            </div>
          </div>
          <p id="signup-password-hint" className="field__hint">
            At least 8 characters.
          </p>

          {signupError && (
            <p className="notice notice--error" role="alert">
              {signupError}
            </p>
          )}

          <button
            type="submit"
            className="btn btn--block"
            disabled={isSigningUp}
          >
            {isSigningUp ? (
              <>
                Setting things up
                <span className="breath" aria-hidden="true"><span /><span /><span /></span>
              </>
            ) : (
              <>
                Create my account
                <span className="btn__arrow" aria-hidden="true">→</span>
              </>
            )}
          </button>
        </form>
      )}

      <div className="auth__switch">
        <span className="muted">
          {mode === "login" ? "New here?" : "Already with us?"}
        </span>{" "}
        <button
          type="button"
          className="text-button"
          onClick={toggleMode}
        >
          {mode === "login" ? "Create an account" : "Log in"}
        </button>
      </div>
    </AuthShell>
  );
}
