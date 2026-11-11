import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../context/useAuth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="waiting waiting--screen" role="status">
        <span className="breath" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <p>One moment…</p>
      </div>
    );
  }

  if (!user) {
    const redirectTarget = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(redirectTarget)}`}
        replace
      />
    );
  }

  return <>{children}</>;
}
