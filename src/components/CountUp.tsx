"use client";

import { useEffect, useRef, useState } from "react";

export function CountUp({
  value,
  prefix = "",
  suffix = "",
  duration = 320,
  decimals = 2,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimals?: number;
}) {
  const [display, setDisplay] = useState(0);
  const frame = useRef<number | undefined>(undefined);

  useEffect(() => {
    let start: number | null = null;
    function step(ts: number) {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) frame.current = requestAnimationFrame(step);
    }
    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [value, duration]);

  return (
    <span className="count-up">
      {prefix}
      {display.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
