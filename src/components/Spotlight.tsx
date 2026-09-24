"use client";

import { useRef, type ReactNode } from "react";

/** A soft brass glow that follows the cursor within its container. */
export function Spotlight({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    const glow = glowRef.current;
    if (!el || !glow) return;
    const rect = el.getBoundingClientRect();
    glow.style.left = `${e.clientX - rect.left}px`;
    glow.style.top = `${e.clientY - rect.top}px`;
    glow.style.opacity = "1";
  }

  function onMouseLeave() {
    if (glowRef.current) glowRef.current.style.opacity = "0";
  }

  return (
    <div ref={ref} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave} className={`relative ${className}`}>
      <div
        ref={glowRef}
        aria-hidden
        style={{
          position: "absolute",
          width: 520,
          height: 520,
          left: 0,
          top: 0,
          transform: "translate(-50%,-50%)",
          background: "radial-gradient(circle, rgba(228,185,104,.10) 0%, rgba(228,185,104,0) 70%)",
          pointerEvents: "none",
          opacity: 0,
          transition: "opacity .3s ease",
          zIndex: 0,
        }}
      />
      <div className="relative" style={{ zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
