"use client";

import { useEffect, useState } from "react";
import { CountUp } from "@/components/CountUp";

const ROWS = [
  { label: "Sales Revenue", ar: "إيرادات المبيعات", value: 112000, delay: 0 },
  { label: "Purchases — Materials", ar: "مشتريات", value: -46750.5, delay: 550 },
  { label: "Rent Expense", ar: "إيجارات", value: -27000, delay: 1100 },
  { label: "Government Fees", ar: "رسوم حكومية", value: -3200, delay: 1650 },
];

const LAST_DELAY = ROWS[ROWS.length - 1].delay;

function LedgerSequence() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [balanced, setBalanced] = useState(false);

  useEffect(() => {
    const timers = ROWS.map((r, i) => setTimeout(() => setVisibleCount((c) => Math.max(c, i + 1)), r.delay));
    const balanceTimer = setTimeout(() => setBalanced(true), LAST_DELAY + 700);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(balanceTimer);
    };
  }, []);

  const total = ROWS.reduce((s, r) => s + r.value, 0);

  return (
    <>
      <div className="space-y-2.5 min-h-[132px]">
        {ROWS.slice(0, visibleCount).map((r) => (
          <div key={r.label} className="fade flex items-center justify-between text-[12px]">
            <span style={{ color: "var(--paper-dim)" }}>
              {r.label} <span className="ar" style={{ opacity: 0.7 }}>{r.ar}</span>
            </span>
            <span className="mono" style={{ color: r.value < 0 ? "var(--paper)" : "var(--good)" }}>
              {r.value < 0 ? "\u2212" : ""}
              {Math.abs(r.value).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>
      <div className="hairline-soft my-3" />
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--paper-dim)" }}>
          Net
        </span>
        <span className="mono text-[15px]" style={{ color: "var(--brass)" }}>
          {visibleCount >= ROWS.length ? <CountUp value={total} decimals={2} /> : "—"}
        </span>
      </div>
      <div
        className="mt-3 flex items-center gap-2 text-[11px] transition-opacity duration-500"
        style={{ opacity: balanced ? 1 : 0, color: "var(--good)" }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14">
          <circle cx="7" cy="7" r="6.2" fill="none" stroke="var(--good)" strokeWidth="1.2" />
          <path
            d="M4 7l2 2 4-4.5"
            fill="none"
            stroke="var(--good)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: 10,
              strokeDashoffset: balanced ? 0 : 10,
              transition: "stroke-dashoffset .5s ease .1s",
            }}
          />
        </svg>
        Debits = Credits — Trial Balance locked
      </div>
    </>
  );
}

export function LiveLedgerWidget() {
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const loopTimer = setTimeout(() => setCycle((c) => c + 1), LAST_DELAY + 4200);
    return () => clearTimeout(loopTimer);
  }, [cycle]);

  return (
    <div className="card-flat p-5 text-left w-full max-w-sm mx-auto" style={{ boxShadow: "0 24px 60px -20px rgba(0,0,0,.55)" }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--paper-dim)" }}>
          Al Fanar Trading Co. — live case
        </span>
        <span className="status-dot" style={{ background: "var(--brass)" }} />
      </div>
      <LedgerSequence key={cycle} />
    </div>
  );
}
