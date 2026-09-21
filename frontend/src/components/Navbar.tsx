import { Link, useNavigate } from "react-router";
import { useAuth } from "../context/useAuth";

interface NavLink {
  label: string;
  href: string;
}

const NAV_LINKS: NavLink[] = [
  { label: "Features", href: "/#features" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Testimonials", href: "/#testimonials" },
  { label: "For Interviewers", href: "/become-interviewer" },
];

export function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand">
          Ahead
        </Link>
        <nav className="navbar__links" aria-label="Primary navigation">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} to={link.href} className="navbar__link">
              {link.label}
            </Link>
          ))}
        </nav>
        {user ? (
          <div className="navbar__account">
            <span className="navbar__greeting">
              Hi, {user.name.split(" ")[0]}
            </span>
            <button
              type="button"
              className="navbar__logout"
              onClick={handleLogout}
            >
              Log out
            </button>
          </div>
        ) : (
          <Link to="/login" className="navbar__login">
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
