"use client";

import { Fragment, useEffect, useState } from "react";
import { ApiError, DrilldownLine, getDrilldown } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { Bi } from "@/components/Bi";

export type DrillAccount = {
  id: string;
  code: string;
  name: string;
  nameAr: string | null;
};

const money = (n: number) =>
  n ? n.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "—";

export function LedgerDrilldown({
  caseId,
  account,
  onOpenDoc,
  onClose,
}: {
  caseId: string;
  account: DrillAccount | null;
  onOpenDoc?: (docId: string, fileName: string) => void;
  onClose: () => void;
}) {
  const { tr } = useLocale();
  const [lines, setLines] = useState<DrilldownLine[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!account) {
      setLines(null);
      setError(null);
      return;
    }
    let alive = true;
    setLines(null);
    setError(null);
    getDrilldown(caseId, account.id)
      .then((l) => alive && setLines(l))
      .catch(
        (e) =>
          alive &&
          setError(
            e instanceof ApiError ? e.message : tr("Failed to load ledger lines"),
          ),
      );
    return () => {
      alive = false;
    };
  }, [caseId, account]);

  if (!account) return null;

  return (
    <div
      className="fixed inset-0 z-40 fade flex justify-end"
      style={{ background: "var(--scrim)" }}
      onClick={onClose}
    >
      <aside
        className="rise h-full w-full max-w-[560px] overflow-y-auto"
        style={{
          background: "var(--surface)",
          borderInlineStart: "1px solid var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="display text-[17px]">
                {account.code} — <Bi en={account.name} ar={account.nameAr} className="text-[12px]" />
              </h3>
            </div>
            <button
              onClick={onClose}
              className="btn-ghost click-scale px-3 py-1 text-[12px]"
            >
              {tr("Close")}
            </button>
          </div>
          <p className="text-[12px] mb-5" style={{ color: "var(--text-2)" }}>
            {tr("Every journal line behind this figure, traced back to its source transaction and document.")}
          </p>

          {error && (
            <div className="text-[13px]" style={{ color: "var(--bad)" }}>
              {error}
            </div>
          )}
          {!error && lines === null && (
            <div className="text-[13px]" style={{ color: "var(--text-2)" }}>
              {tr("Loading…")}
            </div>
          )}
          {lines !== null && lines.length === 0 && (
            <div className="text-[13px]" style={{ color: "var(--text-2)" }}>
              {tr("No movements posted to this account.")}
            </div>
          )}

          {lines !== null && lines.length > 0 && (
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {[tr("Date"), tr("Memo"), tr("Debit"), tr("Credit")].map((h, i) => (
                    <th
                      key={h}
                      className={`px-2 py-2 text-[12px] font-normal ${i > 1 ? "text-end" : "text-start"}`}
                      style={{ color: "var(--text-2)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <Fragment key={i}>
                    <tr style={{ borderBottom: "1px solid var(--border-soft)" }}>
                      <td
                        className="px-2 py-2 mono"
                        style={{ color: "var(--text-2)" }}
                      >
                        {l.date.slice(0, 10)}
                      </td>
                      <td className="px-2 py-2">{l.memo}</td>
                      <td className="px-2 py-2 mono text-end">
                        {money(l.debit)}
                      </td>
                      <td className="px-2 py-2 mono text-end">
                        {money(l.credit)}
                      </td>
                    </tr>
                    {(l.sourceDocument || l.sourceTransaction) && (
                      <tr
                        style={{ borderBottom: "1px solid var(--border-soft)" }}
                      >
                        <td />
                        <td
                          colSpan={3}
                          className="px-2 pb-2 text-[12.5px]"
                          style={{ color: "var(--text-2)" }}
                        >
                          {l.sourceTransaction && (
                            <span>
                              {tr("from:")}{" "}
                              <span className="mono">
                                {l.sourceTransaction.description.slice(0, 40)}
                              </span>{" "}
                              ·{" "}
                            </span>
                          )}
                          {l.sourceDocument && (
                            <button
                              onClick={() =>
                                onOpenDoc?.(
                                  l.sourceDocument!.id,
                                  l.sourceDocument!.fileName,
                                )
                              }
                              className="underline decoration-dotted"
                              style={{ color: "var(--accent)" }}
                            >
                              {l.sourceDocument.fileName}{" "}
                              <span className="arrow-nudge">→</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </aside>
    </div>
  );
}
