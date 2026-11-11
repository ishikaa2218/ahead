import type { SubmitEvent } from "react";
import { Link } from "react-router";
import { Brand } from "./Brand";

interface SiteFooterProps {
  tagline: string;
  newsletter: {
    inputId: string;
    label: string;
    ariaLabel: string;
    email: string;
    onEmailChange: (value: string) => void;
    subscribed: boolean;
    onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  };
}

/**
 * Shared public footer. The newsletter form's state and submit handler stay
 * in the page that renders it — this component only lays them out.
 */
export function SiteFooter({ tagline, newsletter }: SiteFooterProps) {
  return (
    <footer className="site-footer" data-surface="dark">
      <div className="wrap site-footer__top">
        <div className="site-footer__brand">
          <Brand inverse />
          <p className="site-footer__tagline serif">{tagline}</p>
        </div>

        <nav className="site-footer__nav" aria-label="Footer">
          <div>
            <p className="site-footer__heading">Practise</p>
            <Link to="/ai-interview-form">The Open Room</Link>
            <Link to="/company-interview-booking">The Real Room</Link>
            <Link to="/dashboard">Your interviews</Link>
          </div>
          <div>
            <p className="site-footer__heading">Ahead</p>
            <Link to="/#how-it-works">How it works</Link>
            <Link to="/#pricing">Pricing</Link>
            <Link to="/become-interviewer">For interviewers</Link>
          </div>
        </nav>

        <form
          className="site-footer__newsletter"
          onSubmit={newsletter.onSubmit}
          aria-label={newsletter.ariaLabel}
        >
          <label htmlFor={newsletter.inputId} className="site-footer__heading">
            {newsletter.label}
          </label>
          <div className="site-footer__newsletter-row">
            <input
              id={newsletter.inputId}
              type="email"
              required
              placeholder="you@example.com"
              value={newsletter.email}
              onChange={(event) => newsletter.onEmailChange(event.target.value)}
              className="site-footer__input"
            />
            <button type="submit" className="btn btn--amber btn--sm">
              Subscribe
            </button>
          </div>
          {newsletter.subscribed && (
            <p className="site-footer__success" role="status">
              Thanks for subscribing! Keep an eye on your inbox.
            </p>
          )}
        </form>
      </div>

      <div className="wrap site-footer__bottom">
        <p>© {new Date().getFullYear()} Ahead. All rights reserved.</p>
        <p className="site-footer__sign">We never say good luck. Go ahead.</p>
      </div>
    </footer>
  );
}
