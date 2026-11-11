import type { ReactNode } from "react";
import { Brand } from "./Brand";

interface AppHeaderProps {
  crumb?: string;
  tone?: "light" | "dusk";
  onBrandClick?: () => void;
  brandTo?: string;
  children?: ReactNode;
}

/** Slim header for the app and the flows inside it. */
export function AppHeader({ crumb, tone = "light", onBrandClick, brandTo = "/", children }: AppHeaderProps) {
  return (
    <header className={`app-header${tone === "dusk" ? " app-header--dusk" : ""}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="wrap app-header__inner">
        <div className="app-header__left">
          <Brand to={brandTo} onClick={onBrandClick} inverse={tone === "dusk"} />
          {crumb && <span className="app-header__crumb">{crumb}</span>}
        </div>
        {children && <div className="app-header__right">{children}</div>}
      </div>
    </header>
  );
}
