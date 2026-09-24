"use client";

import { useRef, type ReactNode, type CSSProperties } from "react";

export function TiltCard({
  children,
  className = "",
  style,
  max = 6,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(800px) rotateY(${px * max}deg) rotateX(${-py * max}deg) translateY(-2px)`;
  }

  function onMouseLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg) translateY(0)";
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={className}
      style={{ transition: "transform .35s cubic-bezier(.16,1,.3,1)", transformStyle: "preserve-3d", ...style }}
    >
      {children}
    </div>
  );
}
