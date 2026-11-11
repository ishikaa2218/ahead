import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "../context/useAuth";
import { Brand } from "./Brand";
import { Icon } from "./Icon";
import "../stylesheets/navbar.css";

interface NavLink {
  label: string;
  href: string;
}

// Same destinations as before; labels rewritten in Ahead's voice.
const NAV_LINKS: NavLink[] = [
  { label: "The rooms", href: "/#features" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Go ahead", href: "/#testimonials" },
  { label: "For interviewers", href: "/become-interviewer" },
];

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  const isCurrent = (href: string) =>
    href.startsWith("/#")
      ? location.pathname === "/" && location.hash === href.slice(1)
      : location.pathname === href;

  return (
    <header
      className={`site-nav${isScrolled ? " site-nav--scrolled" : ""}${
        isMenuOpen ? " site-nav--open" : ""
      }`}
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="site-nav__inner wrap">
        <Brand />

        <nav className="site-nav__links" aria-label="Primary navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="site-nav__link"
              aria-current={isCurrent(link.href) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="site-nav__account">
          {user ? (
            <>
              <span className="site-nav__greeting">
                Hi, {user.name.split(" ")[0]}
              </span>
              {user.role === "student" && (
                <Link to="/dashboard" className="btn btn--sm btn--ghost">
                  Your interviews
                </Link>
              )}
              <button
                type="button"
                className="site-nav__text-btn"
                onClick={handleLogout}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="site-nav__text-btn">
                Log in
              </Link>
              <Link to="/login?mode=signup" className="btn btn--sm">
                Get started
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="site-nav__toggle"
          aria-expanded={isMenuOpen}
          aria-controls="site-nav-sheet"
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <Icon name={isMenuOpen ? "close" : "menu"} size={22} />
        </button>
      </div>

      <div
        id="site-nav-sheet"
        className="site-nav__sheet"
        hidden={!isMenuOpen}
      >
        <nav className="site-nav__sheet-links" aria-label="Mobile navigation">
          {NAV_LINKS.map((link, index) => (
            <Link
              key={link.href}
              to={link.href}
              className="site-nav__sheet-link"
              style={{ ["--i" as string]: index }}
              onClick={() => setIsMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="site-nav__sheet-account">
          {user ? (
            <>
              <p className="meta">Signed in as {user.name}</p>
              {user.role === "student" && (
                <Link to="/dashboard" className="btn btn--block">
                  Your interviews
                </Link>
              )}
              <button
                type="button"
                className="btn btn--ghost btn--block"
                onClick={handleLogout}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login?mode=signup" className="btn btn--block">
                Get started
              </Link>
              <Link to="/login" className="btn btn--ghost btn--block">
                Log in
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
