"use client";

import { useRef, type ReactNode } from "react";

/**
 * Wraps interactive elements (buttons, links) and nudges them toward the
 * cursor on hover — a small "magnetic" pull that makes primary CTAs feel
 * tactile instead of static.
 */
export function Magnetic({ children, strength = 14 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    el.style.transform = `translate(${(x / rect.width) * strength}px, ${(y / rect.height) * strength}px)`;
  }

  function onMouseLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "translate(0,0)";
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ display: "inline-block", transition: "transform .25s cubic-bezier(.16,1,.3,1)" }}
    >
      {children}
    </div>
  );
}
