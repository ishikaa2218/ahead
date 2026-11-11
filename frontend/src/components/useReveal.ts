import { useEffect } from "react";

/**
 * Scroll entrances. Any element with a `data-reveal` attribute fades / rises
 * into place the first time it enters the viewport. Pass `deps` when the set
 * of revealable elements changes (e.g. after data loads).
 *
 * Purely presentational: if IntersectionObserver is unavailable, or the user
 * prefers reduced motion, everything is shown immediately.
 */
export function useReveal(deps: ReadonlyArray<unknown> = []) {
  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-shown])"),
    );

    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!("IntersectionObserver" in window) || reduceMotion) {
      elements.forEach((el) => el.setAttribute("data-shown", "true"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-shown", "true");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
