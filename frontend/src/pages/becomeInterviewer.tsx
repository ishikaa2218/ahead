import { useState } from "react";
import type { SubmitEvent } from "react";
import { Link } from "react-router";
import heroImage from "../assets/hero.png";
import { Navbar } from "../components/Navbar";
import "../stylesheets/home.css";

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface Step {
  title: string;
  description: string;
}

interface Testimonial {
  quote: string;
  name: string;
  role: string;
}

interface Stat {
  value: string;
  label: string;
}

const BENEFITS: Feature[] = [
  {
    icon: "💰",
    title: "Earn On Your Terms",
    description:
      "Get paid per session, on a flexible schedule that fits around your day job.",
  },
  {
    icon: "🕒",
    title: "Flexible Scheduling",
    description:
      "Pick the slots that work for you. No minimum hours, no long-term commitment.",
  },
  {
    icon: "🌱",
    title: "Give Back",
    description:
      "Help students and job seekers build the confidence you once needed too.",
  },
  {
    icon: "🏆",
    title: "Build Your Reputation",
    description:
      "Grow a track record of helping candidates land offers at companies you know well.",
  },
  {
    icon: "🎯",
    title: "Interview Your Way",
    description:
      "Bring your own style — technical deep dives, behavioral rounds, or a mix of both.",
  },
  {
    icon: "📋",
    title: "We Handle the Logistics",
    description:
      "Scheduling, reminders, and candidate details are taken care of — you just show up.",
  },
];

const REQUIREMENTS: Feature[] = [
  {
    icon: "✓",
    title: "Real Industry Experience",
    description:
      "2+ years working in the role or domain you'd like to interview candidates for.",
  },
  {
    icon: "✓",
    title: "Strong Communication",
    description:
      "Comfortable giving clear, constructive feedback that helps candidates improve.",
  },
  {
    icon: "✓",
    title: "A Little Time to Spare",
    description:
      "Even an hour or two a week is enough to make a real difference.",
  },
];

const STEPS: Step[] = [
  {
    title: "Sign Up",
    description:
      "Create your interviewer account and tell us about your background.",
  },
  {
    title: "Set Your Availability",
    description:
      "Add the time slots you're free — update them whenever your schedule changes.",
  },
  {
    title: "Take Interviews",
    description:
      "Meet candidates, ask the questions you know matter, and share honest feedback.",
  },
  {
    title: "Get Paid",
    description:
      "Earn for every completed session, with payouts on a regular schedule.",
  },
];

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "I get to relive my own interview prep, except this time I'm the one giving the confidence boost.",
    name: "Ananya Rao",
    role: "Senior SDE, interviewer since 2024",
  },
  {
    quote:
      "It's flexible enough to fit around my actual job. A couple of sessions a week and I've already helped a dozen students.",
    name: "Vikram Desai",
    role: "Engineering Manager",
  },
  {
    quote:
      "Genuinely rewarding. Watching someone go from nervous to confident over a few sessions is the best part of my week.",
    name: "Sana Kapoor",
    role: "Product Manager",
  },
];

const STATS: Stat[] = [
  { value: "500+", label: "Active Interviewers" },
  { value: "10,000+", label: "Interviews Conducted" },
  { value: "4.8/5", label: "Average Interviewer Rating" },
  { value: "₹500+", label: "Typical Earnings Per Session" },
];

export function BecomeInterviewer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  function handleNewsletterSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      return;
    }
    setSubscribed(true);
    setEmail("");
  }

  return (
    <div className="home">
      <Navbar />

      <main>
        <section className="hero">
          <div className="hero__content">
            <h1 className="hero__title">
              Share your expertise. <span>Shape a career.</span>
            </h1>
            <p className="hero__subtitle">
              Become an Ahead interviewer and help students and job seekers
              prepare for the interviews that matter — on a schedule that
              works for you, with pay for every session.
            </p>
            <div className="hero__actions">
              <Link
                to="/login?mode=signup&role=interviewer"
                className="btn btn--primary"
              >
                Become an Interviewer
              </Link>
              <a href="#interviewer-how-it-works" className="btn btn--secondary">
                See How It Works
              </a>
            </div>
          </div>
          <div className="hero__image-wrapper">
            <img
              src={heroImage}
              alt="An experienced professional conducting a mock interview on Ahead"
              className="hero__image"
            />
          </div>
        </section>

        <section className="stats" aria-label="Ahead interviewers by the numbers">
          <div className="stats__inner">
            {STATS.map((stat) => (
              <div key={stat.label} className="stats__item">
                <span className="stats__value">{stat.value}</span>
                <span className="stats__label">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="interviewer-benefits" className="features">
          <h2 className="section-title">Why interview with Ahead</h2>
          <p className="section-subtitle">
            A flexible way to mentor the next generation while earning for
            your time.
          </p>
          <div className="features__grid">
            {BENEFITS.map((benefit) => (
              <div key={benefit.title} className="feature-card">
                <span className="feature-card__icon" aria-hidden="true">
                  {benefit.icon}
                </span>
                <h3 className="feature-card__title">{benefit.title}</h3>
                <p className="feature-card__description">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="interviewer-how-it-works" className="how-it-works">
          <h2 className="section-title">How it works</h2>
          <p className="section-subtitle">
            From sign-up to your first interview in four simple steps.
          </p>
          <ol className="steps">
            {STEPS.map((step, index) => (
              <li key={step.title} className="step">
                <span className="step__number">{index + 1}</span>
                <h3 className="step__title">{step.title}</h3>
                <p className="step__description">{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="interviewer-requirements" className="features">
          <h2 className="section-title">What we look for</h2>
          <p className="section-subtitle">
            No formal certification needed — just real experience and a
            willingness to help.
          </p>
          <div className="features__grid">
            {REQUIREMENTS.map((requirement) => (
              <div key={requirement.title} className="feature-card">
                <span className="feature-card__icon" aria-hidden="true">
                  {requirement.icon}
                </span>
                <h3 className="feature-card__title">{requirement.title}</h3>
                <p className="feature-card__description">
                  {requirement.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="testimonials" className="testimonials">
          <h2 className="section-title">Hear from our interviewers</h2>
          <div className="testimonials__grid">
            {TESTIMONIALS.map((testimonial) => (
              <figure key={testimonial.name} className="testimonial-card">
                <blockquote className="testimonial-card__quote">
                  “{testimonial.quote}”
                </blockquote>
                <figcaption className="testimonial-card__author">
                  <span className="testimonial-card__name">
                    {testimonial.name}
                  </span>
                  <span className="testimonial-card__role">
                    {testimonial.role}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="cta">
          <h2 className="cta__title">Ready to help someone get ahead?</h2>
          <p className="cta__subtitle">
            Sign up as an interviewer and set your first availability slot
            today.
          </p>
          <Link
            to="/login?mode=signup&role=interviewer"
            className="btn btn--primary"
          >
            Become an Interviewer
          </Link>
        </section>
      </main>

      <footer className="footer">
        <div className="footer__inner">
          <div className="footer__brand">
            <span className="footer__logo">Ahead</span>
            <p className="footer__tagline">
              Join a community of professionals helping candidates practice
              their way to offers.
            </p>
          </div>

          <form
            className="footer__newsletter"
            onSubmit={handleNewsletterSubmit}
            aria-label="Subscribe to interviewer updates"
          >
            <label htmlFor="interviewer-newsletter-email" className="footer__label">
              Get interviewer tips and updates
            </label>
            <div className="footer__newsletter-row">
              <input
                id="interviewer-newsletter-email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="footer__input"
              />
              <button type="submit" className="btn btn--primary">
                Subscribe
              </button>
            </div>
            {subscribed && (
              <p className="footer__success" role="status">
                Thanks for subscribing! Keep an eye on your inbox.
              </p>
            )}
          </form>
        </div>
        <p className="footer__copyright">
          © {new Date().getFullYear()} Ahead. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
