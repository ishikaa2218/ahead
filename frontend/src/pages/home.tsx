import { useEffect, useState } from "react";
import type { SubmitEvent } from "react";
import { Link, useLocation } from "react-router";
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

interface PricingPlan {
  id: string;
  badge: string;
  price: string;
  priceSuffix: string;
  priceNote?: string;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  variant: "standard" | "premium";
}

const FEATURES: Feature[] = [
  {
    icon: "🎯",
    title: "Real Interview Questions",
    description:
      "Practice with a curated bank of questions sourced from actual interviews at top companies.",
  },
  {
    icon: "🤖",
    title: "AI-Powered Feedback",
    description:
      "Get instant, actionable feedback on your answers, tone, and pacing after every session.",
  },
  {
    icon: "👥",
    title: "Industry Experts",
    description:
      "Book mock interviews with experienced professionals from your target industry.",
  },
  {
    icon: "🗓️",
    title: "Flexible Scheduling",
    description:
      "Practice on your own time with slots that fit around classes, work, or job hunting.",
  },
  {
    icon: "📈",
    title: "Track Your Progress",
    description:
      "See how your confidence and performance improve across every attempt you make.",
  },
  {
    icon: "💬",
    title: "Domain-Specific Tracks",
    description:
      "Choose interview tracks for SDE, Product, Data, Consulting, and more.",
  },
];

const STEPS: Step[] = [
  {
    title: "Pick Your Track",
    description:
      "Select the role and domain you're preparing for, from software to product management.",
  },
  {
    title: "Book a Mock Interview",
    description:
      "Schedule a session with an AI interviewer or a real industry expert in a few clicks.",
  },
  {
    title: "Get Detailed Feedback",
    description:
      "Receive a breakdown of your strengths and gaps right after your session ends.",
  },
  {
    title: "Improve & Repeat",
    description:
      "Track your growth over time and keep practicing until you walk in with confidence.",
  },
];

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Ahead helped me walk into my final round without any nerves. The feedback was spot on.",
    name: "Priya Nair",
    role: "Final-year CS student",
  },
  {
    quote:
      "I practiced five mock interviews before my SDE interview and got the offer. Worth every minute.",
    name: "Rohan Mehta",
    role: "Software Engineer, job seeker",
  },
  {
    quote:
      "The industry experts gave feedback no course or video ever could. Genuinely changed my prep.",
    name: "Ananya Iyer",
    role: "MBA candidate",
  },
];

const STATS: Stat[] = [
  { value: "10,000+", label: "Mock Interviews Completed" },
  { value: "500+", label: "Expert Interviewers" },
  { value: "92%", label: "Report Higher Confidence" },
  { value: "4.8/5", label: "Average Rating" },
];

const PRICING_PLANS: PricingPlan[] = [
  {
    id: "ai-interview",
    badge: "AI Interview",
    price: "₹199",
    priceSuffix: "/session",
    description:
      "For students who want to just do a random check on your preparation using AI mock interviews",
    features: [
      "Audio based interview session",
      "Personalized feedback reports",
      "Role-specific interview questions",
      "Applicable to all job roles",
      "Improved confidence through practice",
    ],
    ctaLabel: "Start Practising",
    ctaHref: "/ai-interview-form",
    variant: "standard",
  },
  {
    id: "company-interview",
    badge: "Company-Based Interview",
    price: "₹1199",
    priceSuffix: "/interview",
    priceNote: "(Or Customize Package As Per Number Of Company Based Interviews)",
    description:
      "For students who have their interviews lined up can start their preparation with accurate guidance.",
    features: [
      "Interviewed by industry experts",
      "Have personalized guidance",
      "Proper company roadmap",
      "Revert within 24 hours",
      "Priority support",
    ],
    ctaLabel: "Go Premium",
    ctaHref: "/company-interview-booking",
    variant: "premium",
  },
];

export function Home() {
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!location.hash) {
      return;
    }
    const target = document.getElementById(location.hash.slice(1));
    target?.scrollIntoView({ behavior: "smooth" });
  }, [location.hash]);

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
              Practice interviews. <span>Get ahead.</span>
            </h1>
            <p className="hero__subtitle">
              Ahead is the mock interview platform for students and job
              seekers who want to walk into the real thing with confidence.
              Practice with AI, get feedback from real professionals, and
              track your growth every step of the way.
            </p>
            <div className="hero__actions">
              <Link to="/signup" className="btn btn--primary">
                Get Started Free
              </Link>
              <a href="#how-it-works" className="btn btn--secondary">
                See How It Works
              </a>
            </div>
          </div>
          <div className="hero__image-wrapper">
            <img
              src={heroImage}
              alt="Student practicing for a mock interview on Ahead"
              className="hero__image"
            />
          </div>
        </section>

        <section className="stats" aria-label="Ahead by the numbers">
          <div className="stats__inner">
            {STATS.map((stat) => (
              <div key={stat.label} className="stats__item">
                <span className="stats__value">{stat.value}</span>
                <span className="stats__label">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="features">
          <h2 className="section-title">Why practice with Ahead</h2>
          <p className="section-subtitle">
            Everything you need to prepare, practice, and perform under
            pressure.
          </p>
          <div className="features__grid">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="feature-card">
                <span className="feature-card__icon" aria-hidden="true">
                  {feature.icon}
                </span>
                <h3 className="feature-card__title">{feature.title}</h3>
                <p className="feature-card__description">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="how-it-works">
          <h2 className="section-title">How it works</h2>
          <p className="section-subtitle">
            Four simple steps between you and your next offer.
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

        <section id="pricing" className="pricing">
          <h2 className="pricing__title">Here's how you can start.</h2>
          <p className="pricing__subtitle">
            No tricks. No hidden charges. Just better conversations, better
            feedback, and more confidence every time you show up.
          </p>
          <div className="pricing__grid">
            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`pricing-card pricing-card--${plan.variant}`}
              >
                <div className="pricing-card__info">
                  <span className="pricing-card__badge">{plan.badge}</span>
                  <p className="pricing-card__price">
                    <span className="pricing-card__price-value">
                      {plan.price}
                    </span>
                    <span className="pricing-card__price-suffix">
                      {plan.priceSuffix}
                    </span>
                  </p>
                  {plan.priceNote && (
                    <p className="pricing-card__note">{plan.priceNote}</p>
                  )}
                  <p className="pricing-card__description">
                    {plan.description}
                  </p>
                  <Link
                    to={plan.ctaHref}
                    className={`pricing-card__cta pricing-card__cta--${plan.variant}`}
                  >
                    {plan.ctaLabel}
                  </Link>
                </div>
                <div className="pricing-card__divider" aria-hidden="true" />
                <ul className="pricing-card__features">
                  {plan.features.map((feature) => (
                    <li key={feature} className="pricing-feature">
                      <span
                        className="pricing-feature__check"
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section id="testimonials" className="testimonials">
          <h2 className="section-title">Loved by students and job seekers</h2>
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
          <h2 className="cta__title">Ready to get ahead of the competition?</h2>
          <p className="cta__subtitle">
            Create a free account and book your first mock interview today.
          </p>
          <Link to="/signup" className="btn btn--primary">
            Start Practicing Now
          </Link>
        </section>
      </main>

      <footer className="footer">
        <div className="footer__inner">
          <div className="footer__brand">
            <span className="footer__logo">Ahead</span>
            <p className="footer__tagline">
              Helping students and job seekers practice their way to offers.
            </p>
          </div>

          <form
            className="footer__newsletter"
            onSubmit={handleNewsletterSubmit}
            aria-label="Subscribe to the Ahead newsletter"
          >
            <label htmlFor="newsletter-email" className="footer__label">
              Get interview tips in your inbox
            </label>
            <div className="footer__newsletter-row">
              <input
                id="newsletter-email"
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
