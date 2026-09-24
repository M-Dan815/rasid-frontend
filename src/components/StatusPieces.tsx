"use client";

import { useEffect } from "react";
import { Check, CircleAlert, X } from "lucide-react";
import { CaseStatus, MatchStatus, STATUS_META } from "@/lib/data";
import { useLocale } from "@/lib/i18n";

export function StatusPill({ status }: { status: CaseStatus }) {
  const meta = STATUS_META[status];
  const { locale } = useLocale();
  return (
    <span className="chip" style={{ color: meta.color, background: meta.bg }}>
      <span className="status-dot" style={{ background: meta.color }} />
      {locale === "ar" ? meta.labelAr : meta.label}
    </span>
  );
}

export function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 0.85 ? "var(--good)" : value >= 0.6 ? "var(--warn)" : "var(--bad)";
  return (
    <div className="flex min-w-[92px] items-center gap-2">
      <div className="confidence-bar flex-1">
        <div className="confidence-fill" style={{ width: `${value * 100}%`, background: color }} />
      </div>
      <span className="num text-[12px] font-semibold" style={{ color }}>
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

const MATCH_MAP: Record<
  MatchStatus,
  { Icon: typeof Check; color: string; bg: string; label: string; labelAr: string }
> = {
  matched: { Icon: Check, color: "var(--good)", bg: "var(--good-bg)", label: "Matched", labelAr: "تمت المطابقة" },
  "needs-review": { Icon: CircleAlert, color: "var(--warn)", bg: "var(--warn-bg)", label: "Needs review", labelAr: "بحاجة للمراجعة" },
  unmatched: { Icon: X, color: "var(--bad)", bg: "var(--bad-bg)", label: "Unmatched", labelAr: "غير مطابقة" },
};

export function MatchBadge({ status }: { status: MatchStatus }) {
  const m = MATCH_MAP[status];
  const { locale } = useLocale();
  return (
    <span className="chip" style={{ color: m.color, background: m.bg }}>
      <m.Icon size={14} strokeWidth={2.5} aria-hidden />
      {locale === "ar" ? m.labelAr : m.label}
    </span>
  );
}

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      role="status"
      className="toast fixed bottom-6 end-6 z-50 flex items-center gap-3 rounded-xl px-4 py-3"
      style={{ background: "var(--inverse-bg)", color: "#fff", border: "1px solid var(--border)" }}
    >
      <span
        className="flex h-5 w-5 items-center justify-center rounded-full"
        style={{ background: "var(--teal)", color: "var(--navy-deep)" }}
      >
        <Check size={13} strokeWidth={3} aria-hidden />
      </span>
      <span className="text-sm">{message}</span>
    </div>
  );
}
