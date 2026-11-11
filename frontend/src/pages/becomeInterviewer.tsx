import { useState } from "react";
import type { SubmitEvent } from "react";
import { Link } from "react-router";
import lightImage from "../assets/a79540c1159df6b08aa6ba4651435a54.jpg";
import { Navbar } from "../components/Navbar";
import { SiteFooter } from "../components/SiteFooter";
import { useReveal } from "../components/useReveal";
import { AmbientLight } from "../components/ambient/AmbientLight";
import { LitText } from "../components/ambient/LitText";
import { useParallax } from "../components/ambient/useParallax";
import "../stylesheets/home.css";
import "../stylesheets/becomeInterviewer.css";

interface Feature {
  title: string;
  description: string;
}

interface Step {
  title: string;
  description: string;
}

const BENEFITS: Feature[] = [
  {
    title: "Earn on your terms",
    description:
      "Get paid per session, on a flexible schedule that fits around your day job.",
  },
  {
    title: "Flexible scheduling",
    description:
      "Pick the slots that work for you. No minimum hours, no long-term commitment.",
  },
  {
    title: "Give back",
    description:
      "Help students and job seekers build the composure you once needed too.",
  },
  {
    title: "Build your reputation",
    description:
      "Grow a track record of preparing candidates for companies you know well.",
  },
  {
    title: "Interview your way",
    description:
      "Bring your own style — technical deep dives, behavioural rounds, or a mix of both.",
  },
  {
    title: "We handle the logistics",
    description:
      "Scheduling, reminders and candidate details are taken care of — you just show up.",
  },
];

const REQUIREMENTS: Feature[] = [
  {
    title: "Real industry experience",
    description:
      "2+ years working in the role or domain you'd like to interview candidates for.",
  },
  {
    title: "Strong communication",
    description:
      "Comfortable giving clear, constructive feedback that helps candidates improve.",
  },
  {
    title: "A little time to spare",
    description:
      "Even an hour or two a week is enough to make a real difference.",
  },
];

const STEPS: Step[] = [
  {
    title: "Sign up",
    description:
      "Create your interviewer account and tell us about your background.",
  },
  {
    title: "Set your availability",
    description:
      "Add the time slots you're free — update them whenever your schedule changes.",
  },
  {
    title: "Take interviews",
    description:
      "Meet candidates, ask the questions you know matter, and share honest feedback.",
  },
  {
    title: "Get paid",
    description:
      "Earn for every completed session, with payouts on a regular schedule.",
  },
];

export function BecomeInterviewer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  useReveal();
  useParallax();

  function handleNewsletterSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      return;
    }
    setSubscribed(true);
    setEmail("");
  }

  return (
    <div className="home interviewer page">
      <AmbientLight welcome />
      <Navbar />

      <main id="main">
        <section className="iv-hero" aria-labelledby="iv-title" data-ambient="dawn">
          <div className="wrap iv-hero__grid">
            <div className="iv-hero__copy">
              <p className="eyebrow hero__eyebrow">For interviewers</p>
              <h1 id="iv-title" className="hero__title serif iv-hero__title">
                <span className="hero__line">Be the person in the room</span>{" "}
                <span className="hero__line">
                  <em>you once needed.</em>
                </span>
              </h1>
              <p className="hero__lede">
                Become an Ahead interviewer and help students and job seekers
                prepare for the interviews that matter — on a schedule that
                works for you, with pay for every session.
              </p>
              <div className="hero__actions">
                <Link
                  to="/login?mode=signup&role=interviewer"
                  className="btn btn--dusk"
                  data-magnetic
                >
                  Become an interviewer
                  <span className="btn__arrow" aria-hidden="true">→</span>
                </Link>
                <a href="#interviewer-how-it-works" className="link-arrow">
                  See how it works <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
            <figure className="iv-hero__image" data-parallax="0.05">
              <img
                src={lightImage}
                alt="Morning light falling through blinds onto a warm wall"
                width={736}
                height={1104}
              />
              <figcaption className="iv-hero__caption serif">
                “Okay — when shall we start?”
              </figcaption>
            </figure>
          </div>
        </section>

        <section id="interviewer-benefits" className="iv-benefits" aria-labelledby="iv-benefits-title" data-ambient="sand">
          <div className="wrap">
            <header className="section-head">
              <p className="eyebrow" data-reveal>Why interview with Ahead</p>
              <h2 id="iv-benefits-title" className="section-head__title serif" data-reveal style={{ ["--i" as string]: 1 }}>
                Mentor the next ones in, <em>and be paid for your time.</em>
              </h2>
            </header>
            <ul className="iv-list">
              {BENEFITS.map((benefit, index) => (
                <li key={benefit.title} className="iv-list__item" data-reveal style={{ ["--i" as string]: index % 3 }}>
                  <span className="iv-list__num" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="iv-list__title">{benefit.title}</h3>
                  <p className="iv-list__desc">{benefit.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="interviewer-how-it-works" className="moments" aria-labelledby="iv-steps-title" data-ambient="path">
          <div className="wrap moments__grid">
            <header className="moments__head">
              <p className="eyebrow" data-reveal>How it works</p>
              <h2 id="iv-steps-title" className="section-head__title serif" data-reveal style={{ ["--i" as string]: 1 }}>
                From sign-up to your first interview, <em>in four steps.</em>
              </h2>
            </header>
            <ol className="moments__list">
              {STEPS.map((step, index) => (
                <li key={step.title} className="moment" data-reveal>
                  <span className="moment__index" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="moment__body">
                    <h3 className="moment__title">{step.title}</h3>
                    <p className="moment__desc">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="interviewer-requirements" className="iv-reqs" aria-labelledby="iv-reqs-title" data-ambient="dusk">
          <div className="wrap iv-reqs__grid">
            <header className="iv-reqs__head">
              <p className="eyebrow" data-reveal>What we look for</p>
              <h2 id="iv-reqs-title" className="section-head__title serif" data-reveal style={{ ["--i" as string]: 1 }}>
                No certificate needed.
              </h2>
              <p className="lede" data-reveal style={{ ["--i" as string]: 2 }}>
                Just real experience and a willingness to help someone walk in
                steadier than they would have alone.
              </p>
            </header>
            <dl className="iv-reqs__list">
              {REQUIREMENTS.map((requirement, index) => (
                <div key={requirement.title} data-reveal style={{ ["--i" as string]: index }}>
                  <dt>{requirement.title}</dt>
                  <dd>{requirement.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="closing" aria-labelledby="iv-closing-title" data-ambient="dark" data-surface="dark" data-spotlight>
          <div className="wrap iv-closing">
            <LitText
              id="iv-closing-title"
              className="closing__title serif"
              parts={["Ready to help someone", { em: "go ahead?" }]}
            />
            <p className="closing__lede" data-reveal style={{ ["--i" as string]: 1 }}>
              Sign up as an interviewer and set your first availability slot.
            </p>
            <div className="closing__actions" data-reveal style={{ ["--i" as string]: 2 }}>
              <Link
                to="/login?mode=signup&role=interviewer"
                className="btn btn--amber"
                data-magnetic
              >
                Become an interviewer
                <span className="btn__arrow" aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter
        tagline="Join the people who make the first time feel familiar."
        newsletter={{
          inputId: "interviewer-newsletter-email",
          label: "Interviewer tips and updates",
          ariaLabel: "Subscribe to interviewer updates",
          email,
          onEmailChange: setEmail,
          subscribed,
          onSubmit: handleNewsletterSubmit,
        }}
      />
    </div>
  );
}
