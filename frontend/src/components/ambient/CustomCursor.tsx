import { useEffect, useRef, useState } from "react";
import { onMotionPreferenceChange, richMotionAllowed } from "./media";

/**
 * Ahead's cursor: a small ink dot with a soft ring that trails a little
 * behind, like a lamp being carried. It also drives a few quiet
 * hover behaviours through data attributes, so pages don't need any code:
 *
 *   data-magnetic   – the element leans a few pixels toward the pointer
 *   data-tilt       – the element tilts very slightly in 3D under the pointer
 *   data-spotlight  – a soft light inside the element follows the pointer
 *   data-surface="dark" – the cursor switches to its light variant
 *   data-cursor="drag"  – a wider ring for draggable things
 *
 * Only runs with a mouse/trackpad and when reduced motion is not requested.
 * Touch devices keep their normal behaviour; text fields keep the native
 * text cursor so selection and typing are unaffected.
 */

type CursorState = "default" | "link" | "cta" | "text" | "drag" | "disabled";

const TEXT_FIELD =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="file"]):not([type="range"]), textarea, select, [contenteditable="true"]';
const INTERACTIVE =
  'a[href], button, [role="button"], [role="tab"], label, summary, input[type="checkbox"], input[type="radio"], input[type="file"], [data-cursor="link"]';

export function CustomCursor() {
  const [enabled, setEnabled] = useState(richMotionAllowed);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => onMotionPreferenceChange(() => setEnabled(richMotionAllowed())), []);

  useEffect(() => {
    if (!enabled) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    const root = document.documentElement;
    root.classList.add("has-custom-cursor");

    let pointerX = -100;
    let pointerY = -100;
    let ringX = -100;
    let ringY = -100;
    let frame = 0;
    let visible = false;

    let hovered: Element | null = null; // the interactive element under the pointer
    let magnetic: HTMLElement | null = null;
    let tilt: HTMLElement | null = null;
    let spotlight: HTMLElement | null = null;
    let sheen: HTMLElement | null = null;

    const setState = (state: CursorState) => {
      if (ring.dataset.state !== state) {
        ring.dataset.state = state;
        dot.dataset.state = state;
      }
    };

    const setTone = (dark: boolean) => {
      const tone = dark ? "light" : "ink";
      if (ring.dataset.tone !== tone) {
        ring.dataset.tone = tone;
        dot.dataset.tone = tone;
      }
    };

    const releaseMagnet = () => {
      if (magnetic) magnetic.style.translate = "";
      magnetic = null;
    };
    const releaseTilt = () => {
      if (tilt) {
        tilt.style.removeProperty("--tilt-x");
        tilt.style.removeProperty("--tilt-y");
        tilt.removeAttribute("data-tilting");
      }
      tilt = null;
    };
    const releaseSpotlight = () => {
      if (spotlight) {
        spotlight.style.removeProperty("--sx");
        spotlight.style.removeProperty("--sy");
        spotlight.removeAttribute("data-lit");
      }
      spotlight = null;
    };

    const tick = () => {
      frame = 0;

      // Ring trails the pointer; with a magnet it is drawn toward the element's centre.
      let targetX = pointerX;
      let targetY = pointerY;
      if (magnetic) {
        const r = magnetic.getBoundingClientRect();
        targetX = pointerX + (r.left + r.width / 2 - pointerX) * 0.35;
        targetY = pointerY + (r.top + r.height / 2 - pointerY) * 0.35;
      }
      ringX += (targetX - ringX) * 0.2;
      ringY += (targetY - ringY) * 0.2;

      dot.style.translate = `${pointerX}px ${pointerY}px`;
      ring.style.translate = `${ringX}px ${ringY}px`;

      if (Math.abs(targetX - ringX) > 0.2 || Math.abs(targetY - ringY) > 0.2) {
        frame = requestAnimationFrame(tick);
      }
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      pointerX = event.clientX;
      pointerY = event.clientY;

      if (!visible) {
        visible = true;
        ringX = pointerX;
        ringY = pointerY;
        root.classList.add("cursor-visible");
      }

      if (magnetic) {
        const r = magnetic.getBoundingClientRect();
        const dx = (pointerX - (r.left + r.width / 2)) / (r.width / 2);
        const dy = (pointerY - (r.top + r.height / 2)) / (r.height / 2);
        magnetic.style.translate = `${(dx * 5).toFixed(2)}px ${(dy * 4).toFixed(2)}px`;
      }
      if (tilt) {
        const r = tilt.getBoundingClientRect();
        const px = (pointerX - r.left) / r.width - 0.5;
        const py = (pointerY - r.top) / r.height - 0.5;
        tilt.style.setProperty("--tilt-x", `${(-py * 3).toFixed(2)}deg`);
        tilt.style.setProperty("--tilt-y", `${(px * 3.5).toFixed(2)}deg`);
      }
      if (spotlight) {
        const r = spotlight.getBoundingClientRect();
        spotlight.style.setProperty("--sx", `${(((pointerX - r.left) / r.width) * 100).toFixed(1)}%`);
        spotlight.style.setProperty("--sy", `${(((pointerY - r.top) / r.height) * 100).toFixed(1)}%`);
      }
      if (sheen) {
        const r = sheen.getBoundingClientRect();
        sheen.style.setProperty("--hx", `${(((pointerX - r.left) / r.width) * 100).toFixed(1)}%`);
        sheen.style.setProperty("--hy", `${(((pointerY - r.top) / r.height) * 100).toFixed(1)}%`);
      }

      schedule();
    };

    // Work out what's under the pointer only when it changes element.
    const onOver = (event: PointerEvent) => {
      if (event.target instanceof Element) updateTarget(event.target);
    };

    // Scrolling moves content under a still pointer without firing pointer events.
    let scrollFrame = 0;
    const onScroll = () => {
      if (!visible || scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        const target = document.elementFromPoint(pointerX, pointerY);
        if (target) updateTarget(target);
      });
    };

    function updateTarget(target: Element) {

      setTone(Boolean(target.closest('[data-surface="dark"]')));

      if (target.closest(TEXT_FIELD)) {
        hovered = null;
        setState("text");
      } else {
        const drag = target.closest('[draggable="true"], [data-cursor="drag"]');
        const interactive = drag ?? target.closest(INTERACTIVE);
        hovered = interactive;
        if (drag) setState("drag");
        else if (!interactive) setState("default");
        else if (
          (interactive as HTMLButtonElement).disabled ||
          interactive.getAttribute("aria-disabled") === "true"
        )
          setState("disabled");
        else if (interactive.closest("[data-magnetic]") || interactive.classList.contains("btn--amber"))
          setState("cta");
        else setState("link");
      }

      const nextMagnet = (hovered?.closest("[data-magnetic]") as HTMLElement | null) ?? null;
      if (nextMagnet !== magnetic) {
        releaseMagnet();
        magnetic = nextMagnet;
      }
      const nextTilt = target.closest("[data-tilt]") as HTMLElement | null;
      if (nextTilt !== tilt) {
        releaseTilt();
        tilt = nextTilt;
        tilt?.setAttribute("data-tilting", "true");
      }
      const nextSpot = target.closest("[data-spotlight]") as HTMLElement | null;
      if (nextSpot !== spotlight) {
        releaseSpotlight();
        spotlight = nextSpot;
        spotlight?.setAttribute("data-lit", "true");
      }
      sheen = (hovered?.closest(".btn") as HTMLElement | null) ?? null;
      // The element under the pointer can change without the pointer moving (e.g. on scroll),
      // so let the ring settle toward its new target.
      schedule();
    }

    const onDown = () => ring.classList.add("is-down");
    const onUp = () => ring.classList.remove("is-down");

    const onLeave = (event: MouseEvent) => {
      if (event.relatedTarget === null) {
        visible = false;
        root.classList.remove("cursor-visible");
        releaseMagnet();
        releaseTilt();
        releaseSpotlight();
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("mouseout", onLeave, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(scrollFrame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("mouseout", onLeave);
      releaseMagnet();
      releaseTilt();
      releaseSpotlight();
      root.classList.remove("has-custom-cursor", "cursor-visible");
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <div ref={ringRef} className="cursor-ring" data-state="default" data-tone="ink" aria-hidden="true" />
      <div ref={dotRef} className="cursor-dot" data-state="default" data-tone="ink" aria-hidden="true" />
    </>
  );
}
