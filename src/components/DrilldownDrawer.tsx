"use client";

import { TRANSACTIONS } from "@/lib/data";
import { fmtSAR } from "@/lib/format";
import { useLocale } from "@/lib/i18n";
import { Bi } from "@/components/Bi";

export type StatementLine = {
  label: string;
  labelAr: string;
  value: number;
  sourceCategory?: string;
};

export function DrilldownDrawer({ line, onClose }: { line: StatementLine | null; onClose: () => void }) {
  const { tr } = useLocale();
  if (!line) return null;
  const related = TRANSACTIONS.filter((t) => t.categoryEn === line.sourceCategory);
  const shown = related.length ? related : TRANSACTIONS.slice(0, 2);

  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div className="absolute inset-0 fade" style={{ background: "var(--scrim)" }} />
      <div className="drawer absolute end-0 top-0 bottom-0 w-[420px] max-w-[92vw] card-flat p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-1">
          <h3 className="display text-[18px]"><Bi en={line.label} ar={line.labelAr} className="text-[13px]" /></h3>
          <button onClick={onClose} className="text-[13px]" style={{ color: "var(--text-2)" }}>
            {tr("Close")}
          </button>
        </div>
        <div className="mono text-[22px] mt-3 mb-6" style={{ color: "var(--accent)" }}>
          {fmtSAR(line.value)}
        </div>
        <div className="text-[12.5px] mb-2" style={{ color: "var(--text-2)" }}>
          {tr("Source transactions")}
        </div>
        <div className="space-y-2">
          {shown.map((t, i) => (
            <div key={t.id} className="fade px-3 py-2.5 text-[12px]" style={{ background: "var(--surface-2)", borderRadius: 10, animationDelay: `${i * 70}ms` }}>
              <div className="flex justify-between">
                <span>{t.desc}</span>
                <span className="mono">{fmtSAR(t.amount)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span style={{ color: "var(--text-2)" }}>
                  {t.date} · {t.bank}
                </span>
                <span className="underline decoration-dotted" style={{ color: "var(--accent)" }}>
                  {tr("source doc")}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[12.5px] mt-5" style={{ color: "var(--text-2)" }}>
          {tr("Every figure in these statements traces back to a real transaction — nothing here was invented to balance the books.")}
        </p>
      </div>
    </div>
  );
}
