import { useEffect, useRef } from "react";

/**
 * The hero illustration: a quiet room at 6 a.m. with a door left ajar onto
 * a pre-dawn horizon. On load the door swings open and light spills across
 * the floor. The window light on the wall drifts gently with the pointer.
 *
 * Built with SVG + CSS transforms (no WebGL) — light, accessible, and it
 * degrades to a still picture under reduced motion.
 */
export function RoomScene() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const finePointer = window.matchMedia?.("(pointer: fine)").matches;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!finePointer || reduceMotion) return;

    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const tick = () => {
      currentX += (targetX - currentX) * 0.06;
      currentY += (targetY - currentY) * 0.06;
      node.style.setProperty("--px", currentX.toFixed(3));
      node.style.setProperty("--py", currentY.toFixed(3));
      if (Math.abs(targetX - currentX) > 0.001 || Math.abs(targetY - currentY) > 0.001) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
      }
    };

    const onMove = (event: PointerEvent) => {
      targetX = event.clientX / window.innerWidth - 0.5;
      targetY = event.clientY / window.innerHeight - 0.5;
      if (!frame) frame = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="room" ref={ref} aria-hidden="true">
      <svg className="room__svg" viewBox="0 0 560 640" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="room-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#efe4d4" />
            <stop offset="1" stopColor="#e3d3bd" />
          </linearGradient>
          <linearGradient id="room-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c9ac88" />
            <stop offset="1" stopColor="#b8946c" />
          </linearGradient>
          <linearGradient id="room-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4a3b57" />
            <stop offset="0.45" stopColor="#8f7391" />
            <stop offset="0.78" stopColor="#e4a46a" />
            <stop offset="1" stopColor="#f3d7b8" />
          </linearGradient>
          <linearGradient id="room-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7d6c86" />
            <stop offset="1" stopColor="#3f3448" />
          </linearGradient>
          <linearGradient id="room-spill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6c48f" stopOpacity="0.95" />
            <stop offset="1" stopColor="#f6c48f" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="room-door" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#f1e6d6" />
            <stop offset="1" stopColor="#d9c6ad" />
          </linearGradient>
          <filter id="room-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <clipPath id="room-doorway">
            <path d="M262 492V250a74 74 0 0 1 148 0v242z" />
          </clipPath>
        </defs>

        {/* wall + floor */}
        <rect width="560" height="500" fill="url(#room-wall)" />
        <rect y="492" width="560" height="148" fill="url(#room-floor)" />
        <rect y="488" width="560" height="6" fill="#d6c3a8" />
        <g className="room__boards" stroke="#a9875f" strokeOpacity="0.35" strokeWidth="1">
          <path d="M0 540h560M0 596h560" />
          <path d="M120 494l-40 146M300 494l-12 146M470 494l40 146" />
        </g>

        {/* window light on the wall (parallax) */}
        <g className="room__window-light" filter="url(#room-soft)">
          <path d="M18 170l120-46v150l-120 46z" fill="#fbe2c2" opacity="0.85" />
          <path d="M150 120l70-27v150l-70 27z" fill="#fbe2c2" opacity="0.7" />
          <path d="M18 340l120-46v120l-120 46z" fill="#fbe2c2" opacity="0.55" />
          <path d="M150 290l70-27v120l-70 27z" fill="#fbe2c2" opacity="0.45" />
        </g>

        {/* the doorway: pre-dawn horizon beyond */}
        <g clipPath="url(#room-doorway)">
          <rect x="250" y="170" width="170" height="330" fill="url(#room-sky)" />
          <rect className="room__sun" x="300" y="398" width="80" height="80" rx="40" fill="#fbe7cc" opacity="0.9" filter="url(#room-soft)" />
          <rect x="250" y="420" width="170" height="80" fill="url(#room-sea)" />
          <g stroke="#f3d7b8" strokeOpacity="0.5" strokeWidth="1.2" strokeLinecap="round">
            <path className="room__ripple" d="M300 436h40M352 446h30M286 458h24M330 470h46" />
          </g>
        </g>
        <path
          d="M262 492V250a74 74 0 0 1 148 0v242"
          fill="none"
          stroke="#cdb898"
          strokeWidth="10"
        />

        {/* light spilling across the floor */}
        <path className="room__spill" d="M262 492h148l130 148H140z" fill="url(#room-spill)" />

        {/* the door, swinging open on its right hinge */}
        <g className="room__door">
          <path d="M262 492V250a74 74 0 0 1 148 0v242z" fill="url(#room-door)" />
          <path d="M262 492V250a74 74 0 0 1 148 0v242z" fill="none" stroke="#bfa98a" strokeWidth="1.2" />
          <circle cx="282" cy="380" r="4" fill="#8a7358" />
        </g>

        {/* chair */}
        <g className="room__chair" stroke="#3a3128" strokeWidth="5" strokeLinecap="round" fill="none">
          <path d="M92 400v130M92 470h64v60M156 470v-6" />
          <path d="M84 470h80" strokeWidth="7" />
        </g>
        <path d="M70 560c30 8 120 8 150 0" stroke="#7a5f43" strokeOpacity="0.22" strokeWidth="14" strokeLinecap="round" filter="url(#room-soft)" />

        {/* cup going cold */}
        <g className="room__cup">
          <path d="M470 474h34l-4 22h-26z" fill="#f6f1e9" stroke="#3a3128" strokeWidth="2" />
          <path d="M503 479c8 0 8 12 0 12" fill="none" stroke="#3a3128" strokeWidth="2" />
          <g className="room__steam" stroke="#8a7a6c" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.7">
            <path d="M482 466c-4-6 4-10 0-16" />
            <path d="M492 466c-4-6 4-10 0-16" />
          </g>
        </g>
      </svg>

      {/* a moment from the product: the morning-of note */}
      <div className="room__note">
        <span className="room__note-time">7:42 a.m.</span>
        <p className="room__note-text">It's today. You've done this. Go ahead.</p>
      </div>
    </div>
  );
}
