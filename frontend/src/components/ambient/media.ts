/** Shared capability checks for the ambient layer. */

function query(q: string): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(q).matches
    : false;
}

/** A real mouse or trackpad: hover exists and the pointer is precise. */
export function hasFinePointer(): boolean {
  return query("(hover: hover) and (pointer: fine)");
}

export function prefersReducedMotion(): boolean {
  return query("(prefers-reduced-motion: reduce)");
}

/** Rich effects (cursor, lamp, tilt, parallax) only where they're cheap and wanted. */
export function richMotionAllowed(): boolean {
  return hasFinePointer() && !prefersReducedMotion();
}

/** Subscribe to changes of either media condition. */
export function onMotionPreferenceChange(callback: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const queries = [
    window.matchMedia("(hover: hover) and (pointer: fine)"),
    window.matchMedia("(prefers-reduced-motion: reduce)"),
  ];
  queries.forEach((q) => q.addEventListener("change", callback));
  return () => queries.forEach((q) => q.removeEventListener("change", callback));
}
