import { useEffect, useRef, useState } from "react";
import { hasFinePointer, prefersReducedMotion, richMotionAllowed } from "./media";

/**
 * The room's light. A fixed layer behind the page made of a few very soft
 * radial lights in Ahead's own colours (amber, ivory, a touch of dusk).
 *
 * - Sections carry `data-ambient="<tone>"`. Whichever section sits in the
 *   middle of the viewport sets the tone, and the lights drift and brighten
 *   toward it over ~2s. The section also gets `data-ambient-active`, which
 *   CSS uses to light a CTA a little more when it's in front of you.
 * - Scroll progress slowly moves the whole light field, like the sun moving.
 * - On desktop a faint lamp follows the cursor.
 * - `welcome` starts the room slightly dim and lets the light come in.
 *
 * No blur filters, no canvas: just gradients, opacity and transforms.
 *
 * On phones, touch devices and low-powered machines it runs in "lite" mode:
 * no fixed light layer at all — the page background itself shifts tone as
 * sections arrive, which costs almost nothing to scroll over.
 */

function shouldUseLite(): boolean {
  if (!hasFinePointer()) return true;
  if (window.matchMedia?.("(max-width: 768px)").matches) return true;
  const nav = navigator as Navigator & { deviceMemory?: number };
  if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 4) return true;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4) return true;
  return false;
}

interface AmbientLightProps {
  /** "site" = full scroll-responsive light; "app" = quiet base light + cursor lamp. */
  scene?: "site" | "app";
  welcome?: boolean;
  initialTone?: string;
}

export function AmbientLight({ scene = "site", welcome = false, initialTone = "dawn" }: AmbientLightProps) {
  const [lite] = useState(shouldUseLite);
  const rootRef = useRef<HTMLElement>(null);
  const driftRef = useRef<HTMLDivElement>(null);
  const lampRef = useRef<HTMLDivElement>(null);

  // Welcoming light: begin dim, then let the morning in.
  useEffect(() => {
    const root = rootRef.current;
    const page = root?.closest<HTMLElement>(".page");
    if (!root || !welcome) return;
    const wake = () => {
      root.removeAttribute("data-waking");
      page?.removeAttribute("data-amb-waking");
    };
    if (prefersReducedMotion()) {
      wake();
      return;
    }
    page?.setAttribute("data-amb-waking", "true");
    const id = window.setTimeout(wake, 120);
    return () => {
      window.clearTimeout(id);
      wake();
    };
  }, [welcome]);

  // Section tones.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || scene !== "site" || !("IntersectionObserver" in window)) return;
    const page = root.closest<HTMLElement>(".page");

    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-ambient]"));
    if (sections.length === 0) return;

    let active: HTMLElement | null = null;
    const observer = new IntersectionObserver(
      (entries) => {
        // The band is the middle 10% of the viewport, so only one section is in it at a time.
        const hit = entries.find((entry) => entry.isIntersecting);
        if (!hit) return;
        const section = hit.target as HTMLElement;
        if (section === active) return;
        active?.removeAttribute("data-ambient-active");
        active = section;
        section.setAttribute("data-ambient-active", "true");
        const tone = section.dataset.ambient ?? "dawn";
        root.dataset.tone = tone;
        if (page) page.dataset.ambTone = tone;
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    sections.forEach((section) => observer.observe(section));
    return () => {
      observer.disconnect();
      active?.removeAttribute("data-ambient-active");
    };
  }, [scene]);

  // Scroll drift: one transform write per frame, only while scrolling.
  useEffect(() => {
    const drift = driftRef.current;
    if (!drift || scene !== "site" || prefersReducedMotion()) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      const x = Math.sin(progress * Math.PI) * 6; // vw
      const y = progress * -14; // vh
      drift.style.transform = `translate3d(${x.toFixed(2)}vw, ${y.toFixed(2)}vh, 0)`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [scene]);

  // Cursor lamp (desktop only).
  useEffect(() => {
    const lamp = lampRef.current;
    if (!lamp || !richMotionAllowed()) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 3;
    let tx = x;
    let ty = y;
    let frame = 0;
    let shown = false;

    const tick = () => {
      frame = 0;
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      lamp.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      if (Math.abs(tx - x) > 0.5 || Math.abs(ty - y) > 0.5) frame = requestAnimationFrame(tick);
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      tx = event.clientX;
      ty = event.clientY;
      if (!shown) {
        shown = true;
        x = tx;
        y = ty;
        lamp.classList.add("is-on");
      }
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const onLeave = (event: MouseEvent) => {
      if (event.relatedTarget === null) {
        shown = false;
        lamp.classList.remove("is-on");
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseout", onLeave, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseout", onLeave);
      cancelAnimationFrame(frame);
    };
  }, []);

  if (lite) {
    // No fixed layer: only a marker so the page can be found and tinted.
    return (
      <span
        ref={rootRef as React.RefObject<HTMLSpanElement>}
        className="ambient-marker"
        data-tone={initialTone}
        data-waking={welcome ? "true" : undefined}
        hidden
      />
    );
  }

  return (
    <div
      ref={rootRef as React.RefObject<HTMLDivElement>}
      className={`ambient ambient--${scene}`}
      data-tone={initialTone}
      data-waking={welcome ? "true" : undefined}
      aria-hidden="true"
    >
      {scene === "site" && <div className="ambient__base" />}
      <div ref={driftRef} className="ambient__drift">
        <div className="ambient__light ambient__light--sun" />
        <div className="ambient__light ambient__light--window" />
        {scene === "site" && (
          <>
            <div className="ambient__light ambient__light--floor" />
            <div className="ambient__light ambient__light--dusk" />
          </>
        )}
      </div>
      <div className="ambient__lamp-anchor">
        <div ref={lampRef} className="ambient__lamp" />
      </div>
    </div>
  );
}
