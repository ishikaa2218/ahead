import { useEffect } from "react";
import { richMotionAllowed } from "./media";

/**
 * Gentle depth: elements with `data-parallax="<speed>"` drift at a slightly
 * different rate from the content around them (speed 0.05 ≈ 5% of the
 * distance from the viewport centre). Desktop only; positions are measured
 * on load and resize, so scrolling only does arithmetic and transform writes.
 * Uses the `translate` property so it never fights CSS transforms.
 */
export function useParallax(deps: ReadonlyArray<unknown> = []) {
  useEffect(() => {
    if (!richMotionAllowed()) return;
    if (window.matchMedia?.("(max-width: 900px)").matches) return;

    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
    if (nodes.length === 0) return;

    let items: { el: HTMLElement; speed: number; centre: number }[] = [];
    const measure = () => {
      items = nodes.map((el) => {
        const previous = el.style.translate;
        el.style.translate = "";
        const rect = el.getBoundingClientRect();
        el.style.translate = previous;
        return {
          el,
          speed: Number(el.dataset.parallax) || 0.05,
          centre: rect.top + window.scrollY + rect.height / 2,
        };
      });
    };

    let frame = 0;
    const update = () => {
      frame = 0;
      const viewCentre = window.scrollY + window.innerHeight / 2;
      for (const item of items) {
        const distance = item.centre - viewCentre;
        if (Math.abs(distance) > window.innerHeight * 1.5) continue;
        item.el.style.translate = `0 ${(distance * -item.speed).toFixed(1)}px`;
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onResize = () => {
      measure();
      onScroll();
    };

    measure();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    // Fonts and images can shift layout after mount.
    const late = window.setTimeout(onResize, 1200);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.clearTimeout(late);
      cancelAnimationFrame(frame);
      nodes.forEach((el) => (el.style.translate = ""));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
