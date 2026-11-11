import type { ReactNode } from "react";
import lightImage from "../assets/a79540c1159df6b08aa6ba4651435a54.jpg";
import { Brand } from "./Brand";

interface AuthShellProps {
  aside: { quote: ReactNode; caption: string };
  children: ReactNode;
}

/** Split layout for sign-in pages: a quiet, lit wall on one side, the form on the other. */
export function AuthShell({ aside, children }: AuthShellProps) {
  return (
    <div className="auth page">
      <aside className="auth__aside" aria-hidden="true">
        <img className="auth__image" src={lightImage} alt="" width={736} height={1104} />
        <div className="auth__aside-inner">
          <Brand inverse />
          <div className="auth__quote">
            <p className="serif">{aside.quote}</p>
            <span>{aside.caption}</span>
          </div>
        </div>
      </aside>
      <main id="main" className="auth__main">
        <div className="auth__mobile-brand">
          <Brand />
        </div>
        <div className="auth__panel">{children}</div>
      </main>
    </div>
  );
}
