import { Link } from "react-router";

interface BrandProps {
  to?: string;
  inverse?: boolean;
  onClick?: () => void;
  label?: string;
}

/** The doorway glyph: a frame with a strip of amber light. */
export function BrandGlyph() {
  return (
    <svg className="brand__glyph" viewBox="0 0 22 26" aria-hidden="true">
      <path className="door-frame" d="M2.5 25V10.5a8.5 8.5 0 0 1 17 0V25" />
      <path className="door-light" d="M11 25V2.1a8.5 8.5 0 0 1 8.5 8.4V25z" />
    </svg>
  );
}

export function Brand({ to = "/", inverse = false, onClick, label = "Ahead" }: BrandProps) {
  const className = `brand${inverse ? " brand--inverse" : ""}`;

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick} aria-label={`${label} — home`}>
        <BrandGlyph />
        <span>Ahead</span>
      </button>
    );
  }

  return (
    <Link to={to} className={className} aria-label={`${label} — home`}>
      <BrandGlyph />
      <span>Ahead</span>
    </Link>
  );
}
