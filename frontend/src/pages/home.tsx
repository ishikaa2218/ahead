import { useEffect, useState } from "react";
import type { SubmitEvent } from "react";
import { Link, useLocation } from "react-router";
import doorImage from "../assets/7a5079521c27b62ceea548f0e4c55dac.jpg";
import { Navbar } from "../components/Navbar";
import { RoomScene } from "../components/RoomScene";
import { SiteFooter } from "../components/SiteFooter";
import { useReveal } from "../components/useReveal";
import { AmbientLight } from "../components/ambient/AmbientLight";
import { LitText } from "../components/ambient/LitText";
import { useParallax } from "../components/ambient/useParallax";
import "../stylesheets/home.css";

interface Moment {
  title: string;
  description: string;
  note: string;
}

interface PricingPlan {
  id: string;
  room: string;
  name: string;
  prices: { value: string; suffix: string }[];
  priceNote?: string;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  variant: "open" | "real";
}

// The journey through Ahead, step by step. The italic notes are how Ahead
// talks to you at each moment.
const MOMENTS: Moment[] = [
  {
    title: "Choose your room",
    description:
      "The Open Room for practice with an AI interviewer, any hour. The Real Room when there's a specific company and role on the line.",
    note: "The Open Room's ready when you are.",
  },
  {
    title: "Tell us what it's for",
    description:
      "Your target role, your track, the level you expect — and the job description, if you have one, so the questions sound like the real thing.",
    note: "Take a moment. There's no rush.",
  },
  {
    title: "Pick the moment",
    description:
      "Choose a time for the Open Room, or one of the slots your interviewer has opened. We'll email you a reminder 15 minutes before.",
    note: "You're on for tonight. Someone's preparing for it now.",
  },
  {
    title: "A quick check at the door",
    description:
      "Before the Open Room, you check your camera and mic — so the only thing left to think about is what you want to say.",
    note: "Somewhere quiet, headphones if you have them.",
  },
  {
    title: "Walk in",
    description:
      "Answer out loud, the way you will on the day. Stumble once here, where it doesn't cost anything.",
    note: "It's today. You've done this. Go ahead.",
  },
  {
    title: "Look back, honestly",
    description:
      "After the Open Room you get an overall score, five areas to look at, what went well and where to focus next.",
    note: "How did it actually go?",
  },
];

const PRICING_PLANS: PricingPlan[] = [
  {
    id: "ai-interview",
    room: "The Open Room",
    name: "AI interview",
    prices: [
      { value: "₹99", suffix: "text session" },
      { value: "₹199", suffix: "voice session" },
    ],
    description:
      "For when you want to check where your preparation is, any time, with an AI interviewer.",
    features: [
      "Voice or text — answer out loud, or type",
      "Questions shaped to your role and track",
      "Works for every kind of job role",
      "Personal feedback notes after every session",
      "Practice that makes the real one feel familiar",
    ],
    ctaLabel: "Step into the Open Room",
    ctaHref: "/ai-interview-form",
    variant: "open",
  },
  {
    id: "company-interview",
    room: "The Real Room",
    name: "Company-based interview",
    prices: [{ value: "₹1,199", suffix: "per interview" }],
    priceNote:
      "Several interviews lined up? We can put together a package for the number of company-based interviews you need.",
    description:
      "For when your interview is lined up and you want accurate guidance from someone who does this for real.",
    features: [
      "Interviewed by people working in the industry",
      "Personal guidance for your interview",
      "A proper roadmap for the company",
      "We get back to you within 24 hours",
      "Priority support",
    ],
    ctaLabel: "Book the Real Room",
    ctaHref: "/company-interview-booking",
    variant: "real",
  },
];

export function Home() {
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  useReveal();
  useParallax();

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
    <div className="home page">
      <AmbientLight welcome />
      <Navbar />

      <main id="main">
        {/* ---------------------------------------------------------- HERO */}
        <section className="hero" aria-labelledby="hero-title" data-ambient="dawn">
          <div className="wrap hero__grid">
            <div className="hero__copy">
              <p className="eyebrow hero__eyebrow">For the hours before</p>
              <h1 id="hero-title" className="hero__title serif">
                <span className="hero__line">The room before</span>{" "}
                <span className="hero__line">
                  the room <em>that matters.</em>
                </span>
              </h1>
              <p className="hero__lede">
                Practise the interview before the real one. Get familiar with
                the questions, the conversation and the moment — so the person
                who walks in is the real you.
              </p>
              <div className="hero__actions">
                <Link to="/ai-interview-form" className="btn btn--amber" data-magnetic>
                  Step into the Open Room
                  <span className="btn__arrow" aria-hidden="true">→</span>
                </Link>
                <Link to="/company-interview-booking" className="link-arrow">
                  Book the Real Room <span aria-hidden="true">→</span>
                </Link>
              </div>
              <p className="hero__fine meta">
                Open Room from ₹99 · Real Room ₹1,199 per interview
              </p>
            </div>

            <div className="hero__scene" data-parallax="0.06">
              <RoomScene />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ PROBLEM */}
        <section className="statement" aria-labelledby="statement-title" data-ambient="still">
          <div className="wrap statement__grid">
            <p className="eyebrow" data-reveal>Why Ahead exists</p>
            <LitText
              id="statement-title"
              className="statement__title serif"
              parts={["People aren't bad at interviews.", { em: "They're new to them." }]}
            />
            <div className="statement__body" data-reveal style={{ ["--i" as string]: 2 }}>
              <p>
                You studied. You know the material. And then, in a room with a
                stranger, the right words arrive a moment too late. That's not
                a gap in what you know — it's the first time you've had to say
                it out loud, under pressure.
              </p>
              <p>
                Ahead moves that first time somewhere it doesn't cost anything.
                We make the room familiar, so the person who walks into the
                real one is the real you.
              </p>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- ROOMS */}
        <section id="features" className="rooms" aria-labelledby="rooms-title" data-ambient="sand">
          <div className="wrap">
            <header className="section-head">
              <p className="eyebrow" data-reveal>Two rooms</p>
              <h2 id="rooms-title" className="section-head__title serif" data-reveal style={{ ["--i" as string]: 1 }}>
                One for practice. <em>One for the day itself.</em>
              </h2>
            </header>

            <div className="rooms__grid">
              <article className="room-panel room-panel--open" data-reveal data-tilt>
                <div className="room-panel__light" aria-hidden="true" />
                <p className="room-panel__kicker">The Open Room</p>
                <h3 className="room-panel__title serif">
                  General. Any hour. <em>No audience.</em>
                </h3>
                <p className="room-panel__lede">
                  An AI interviewer named Maya, ready whenever you are. Set the
                  role, the track and the difficulty, then answer out loud — or
                  type, if that's where you want to start.
                </p>
                <dl className="room-panel__facts">
                  <div>
                    <dt>Kind</dt>
                    <dd>Technical, behavioural or mixed</dd>
                  </div>
                  <div>
                    <dt>Length</dt>
                    <dd>5, 8 or 10 questions · about 5 min each</dd>
                  </div>
                  <div>
                    <dt>After</dt>
                    <dd>Scores, strengths and where to focus next</dd>
                  </div>
                </dl>
                <Link to="/ai-interview-form" className="btn">
                  Set up the Open Room
                  <span className="btn__arrow" aria-hidden="true">→</span>
                </Link>
              </article>

              <article className="room-panel room-panel--real" data-reveal data-tilt data-spotlight data-surface="dark" style={{ ["--i" as string]: 1 }}>
                <p className="room-panel__kicker">The Real Room</p>
                <h3 className="room-panel__title serif">
                  A person. A company. <em>A time.</em>
                </h3>
                <p className="room-panel__lede">
                  A scheduled interview with someone who works in the industry.
                  You choose the interviewer and the slot; they prepare for
                  your role and the job you're going for.
                </p>
                <dl className="room-panel__facts">
                  <div>
                    <dt>Who</dt>
                    <dd>You see their name and company before you book</dd>
                  </div>
                  <div>
                    <dt>When</dt>
                    <dd>A slot they've opened, in IST</dd>
                  </div>
                  <div>
                    <dt>Before</dt>
                    <dd>The meeting link and a reminder, by email</dd>
                  </div>
                </dl>
                <Link to="/company-interview-booking" className="btn btn--light">
                  Book the Real Room
                  <span className="btn__arrow" aria-hidden="true">→</span>
                </Link>
              </article>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------- HOW IT WORKS */}
        <section id="how-it-works" className="moments" aria-labelledby="moments-title" data-ambient="path">
          <div className="wrap moments__grid">
            <header className="moments__head">
              <p className="eyebrow" data-reveal>How it works</p>
              <h2 id="moments-title" className="section-head__title serif" data-reveal style={{ ["--i" as string]: 1 }}>
                The hours before, <em>one step at a time.</em>
              </h2>
              <p className="lede" data-reveal style={{ ["--i" as string]: 2 }}>
                Nothing to figure out on the day. Every step is the same one
                you'll take when it counts.
              </p>
            </header>

            <ol className="moments__list">
              {MOMENTS.map((moment, index) => (
                <li key={moment.title} className="moment" data-reveal>
                  <span className="moment__index" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="moment__body">
                    <h3 className="moment__title">{moment.title}</h3>
                    <p className="moment__desc">{moment.description}</p>
                    <p className="moment__note serif">“{moment.note}”</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ------------------------------------------------------ PRICING */}
        <section id="pricing" className="pricing" aria-labelledby="pricing-title" data-ambient="sand">
          <div className="wrap">
            <header className="section-head section-head--center">
              <p className="eyebrow eyebrow--plain" data-reveal>Pricing</p>
              <h2 id="pricing-title" className="section-head__title serif" data-reveal style={{ ["--i" as string]: 1 }}>
                Here's how you can start.
              </h2>
              <p className="lede" data-reveal style={{ ["--i" as string]: 2 }}>
                No tricks, no hidden charges. You pay for the room you use.
              </p>
            </header>

            <div className="pricing__grid">
              {PRICING_PLANS.map((plan, index) => (
                <article
                  key={plan.id}
                  className={`plan plan--${plan.variant}`}
                  data-reveal
                  data-tilt
                  data-spotlight={plan.variant === "real" ? "" : undefined}
                  data-surface={plan.variant === "real" ? "dark" : undefined}
                  style={{ ["--i" as string]: index }}
                >
                  <header className="plan__head">
                    <p className="plan__room">{plan.room}</p>
                    <h3 className="plan__name">{plan.name}</h3>
                  </header>

                  <div className="plan__prices">
                    {plan.prices.map((price) => (
                      <p key={price.suffix} className="plan__price">
                        <span className="plan__price-value serif">{price.value}</span>
                        <span className="plan__price-suffix">{price.suffix}</span>
                      </p>
                    ))}
                  </div>

                  <p className="plan__desc">{plan.description}</p>

                  <ul className="plan__features">
                    {plan.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>

                  {plan.priceNote && <p className="plan__note meta">{plan.priceNote}</p>}

                  <Link
                    to={plan.ctaHref}
                    className={`btn btn--block ${plan.variant === "real" ? "btn--light" : ""}`}
                  >
                    {plan.ctaLabel}
                    <span className="btn__arrow" aria-hidden="true">→</span>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------ THE GOOD-LUCK RULE */}
        <section id="testimonials" className="goahead" aria-labelledby="goahead-title" data-ambient="warm">
          <div className="wrap goahead__grid">
            <div className="goahead__words" aria-hidden="true" data-parallax="0.05">
              <span className="goahead__struck serif">Good luck.</span>
              <span className="goahead__said serif">Go ahead.</span>
            </div>
            <div className="goahead__copy">
              <p className="eyebrow" data-reveal>The good-luck rule</p>
              <LitText
                id="goahead-title"
                className="goahead__title serif"
                parts={["We never say good luck."]}
              />
              <p data-reveal style={{ ["--i" as string]: 2 }}>
                Luck says the outcome is chance — that the late nights, the
                projects, the rehearsing, the shaking hands at 6 a.m. were
                incidental. It's what people say when they don't know what
                else to say.
              </p>
              <p data-reveal style={{ ["--i" as string]: 3 }}>
                So we say <strong>go ahead</strong>. Same warmth, same moment,
                the opposite worldview: you prepared, it's your turn, walk in.
                We don't promise the outcome. We help you get ready for the
                moment.
              </p>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------- CLOSING CTA */}
        <section className="closing" aria-labelledby="closing-title" data-ambient="dark" data-surface="dark" data-spotlight>
          <div className="wrap closing__grid">
            <figure className="closing__image" data-reveal="mask" data-parallax="0.04">
              <img
                src={doorImage}
                alt="A door left open in a quiet room at dawn, light falling across the floor"
                loading="lazy"
                width={1080}
                height={1293}
              />
            </figure>
            <div className="closing__copy">
              <LitText
                id="closing-title"
                className="closing__title serif"
                parts={["The room is ready", { em: "when you are." }]}
              />
              <p className="closing__lede" data-reveal style={{ ["--i" as string]: 1 }}>
                Make an account, set up your first practice, and come back
                whenever you need a quiet place to get ready.
              </p>
              <div className="closing__actions" data-reveal style={{ ["--i" as string]: 2 }}>
                <Link to="/login?mode=signup" className="btn btn--amber" data-magnetic>
                  Create your account
                  <span className="btn__arrow" aria-hidden="true">→</span>
                </Link>
                <Link to="/login" className="btn btn--ghost-light">
                  I already have one
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter
        tagline="For the hours before."
        newsletter={{
          inputId: "newsletter-email",
          label: "Interview notes, now and then",
          ariaLabel: "Subscribe to the Ahead newsletter",
          email,
          onEmailChange: setEmail,
          subscribed,
          onSubmit: handleNewsletterSubmit,
        }}
      />
    </div>
  );
}
