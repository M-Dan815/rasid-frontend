"use client";

import { Fragment, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ApiError,
  getCase,
  getDocumentVerification,
  getExceptions,
  getTransactions,
  openDocument,
  type VerificationReport,
} from "@/lib/api";
import {
  duplicateInvoiceIdsFrom,
  uiTransaction,
  UiTransaction,
} from "@/lib/adapters";
import { fmtSAR } from "@/lib/format";
import { useLocale } from "@/lib/i18n";

export default function ExtractionPage() {
  const { tr } = useLocale();
  const params = useParams<{ caseId: string }>();
  const [rows, setRows] = useState<UiTransaction[] | null>(null);
  const [docKeys, setDocKeys] = useState<Map<string, string>>(new Map());
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // ─── Statement verification reports (Anas feedback #8) ──────────────
  // One report per bank-statement document. Loaded alongside the
  // transactions + case. When non-empty, renders a section listing each
  // BALANCE_BREAK issue with surrounding row context + a "View original"
  // button so the accountant can compare the suspected missing-row
  // against the source PDF.
  const [verifications, setVerifications] = useState<VerificationReport[]>([]);

  useEffect(() => {
    let alive = true;
    Promise.all([
      getTransactions(params.caseId),
      getExceptions(params.caseId),
      getCase(params.caseId),
    ])
      .then(([txs, exs, kase]) => {
        if (!alive) return;
        const dups = duplicateInvoiceIdsFrom(exs);
        setRows(txs.map((t) => uiTransaction(t, dups)));
        setDocKeys(
          new Map((kase.documents ?? []).map((d) => [d.id, d.storageKey])),
        );
        // Fetch verification reports for all bank-statement documents in
        // parallel. Non-fatal if any fail — the section just doesn't show.
        const bankStmtDocs = (kase.documents ?? []).filter(
          (d) => d.type === "BANK_STATEMENT",
        );
        Promise.all(
          bankStmtDocs.map((d) =>
            getDocumentVerification(params.caseId, d.id).catch(() => null),
          ),
        ).then((reports) => {
          if (!alive) return;
          const valid = reports.filter(
            (r): r is VerificationReport => r !== null,
          );
          setVerifications(valid);
        });
      })
      .catch(
        (e) =>
          alive &&
          setError(
            e instanceof ApiError ? e.message : tr("Failed to load transactions"),
          ),
      );
    return () => {
      alive = false;
    };
  }, [params.caseId]);

  function viewOriginal(t: UiTransaction) {
    const key = t.documentId ? docKeys.get(t.documentId) : undefined;
    if (key)
      openDocument(key).catch(() =>
        setError(tr("Could not open the source document")),
      );
  }

  return (
    <div className="p-8 md:p-10 page-enter">
      <div className="rise flex items-end justify-between mb-6">
        <div>
          <h1 className="display text-[32px]">{tr("Extracted transactions")}</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-2)" }}>
            {rows === null
              ? tr("Loading…")
              : tr("{n} rows — each linked to its source document", { n: rows.length })}
          </p>
        </div>
      </div>

      {error && (
        <div
          className="text-[12px] px-3 py-2 mb-4"
          style={{ color: "var(--bad)", border: "1px solid var(--bad-line)" }}
        >
          {error}
        </div>
      )}

      {/* ─── Statement integrity verification (Anas feedback #8) ──────────
          For each bank-statement document with issues, render a card
          listing each BALANCE_BREAK with surrounding row context + a
          "View original" button. The accountant can compare the suspected
          missing-row against the source PDF and either re-extract or
          manually add the missing row. */}
      {verifications.map((v) =>
        v.issues.length === 0 ? null : (
          <div
            key={v.document.id}
            className="card-flat p-5 my-6 rise"
            style={{
              borderLeft: "3px solid var(--warn)",
            }}
          >
            <div className="flex items-end justify-between gap-3 mb-3">
              <div>
                <div
                  className="text-[11px] uppercase font-semibold"
                  style={{ color: "var(--warn)", letterSpacing: "0.04em" }}
                >
                  {tr("Statement integrity")}
                </div>
                <div className="text-[13px] mt-1">
                  {v.document.fileName}
                </div>
                <div
                  className="text-[12px] mt-0.5"
                  style={{ color: "var(--text-2)" }}
                >
                  {v.totalRows} {tr("rows extracted")} ·{" "}
                  {v.issues.length} {tr("issues")}
                </div>
              </div>
              <button
                onClick={() => {
                  const key = docKeys.get(v.document.id);
                  if (key) openDocument(key);
                }}
                className="btn-ghost click-scale px-3 py-1.5 text-[12px]"
              >
                {tr("view original")}
              </button>
            </div>
            <div className="space-y-3">
              {v.issues.map((issue, i) => (
                <div
                  key={i}
                  className="p-3"
                  style={{
                    background: "var(--surface-2)",
                    borderRadius: "var(--radius-control)",
                  }}
                >
                  <div
                    className="text-[12px]"
                    style={{ color: "var(--text)" }}
                  >
                    {issue.message}
                  </div>
                  {issue.context.length > 0 && (
                    <div className="mt-2 text-[11.5px]">
                      <div
                        className="uppercase font-semibold mb-1"
                        style={{
                          color: "var(--text-2)",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {tr("Surrounding rows:")}
                      </div>
                      <table className="w-full">
                        <tbody>
                          {issue.context.map((ctx, j) => {
                            // Highlight the row at the break index.
                            const isBreak =
                              issue.index != null &&
                              ctx.rawRowIndex === issue.index;
                            return (
                              <tr
                                key={j}
                                style={{
                                  background: isBreak
                                    ? "var(--warn-bg)"
                                    : "transparent",
                                }}
                              >
                                <td
                                  className="mono pr-2 py-0.5"
                                  style={{
                                    color: "var(--text-2)",
                                    width: "3rem",
                                  }}
                                >
                                  #{ctx.rawRowIndex ?? j}
                                </td>
                                <td
                                  className="mono pr-2"
                                  style={{ color: "var(--text-2)" }}
                                >
                                  {ctx.date.slice(0, 10)}
                                </td>
                                <td className="mono pr-2 text-end whitespace-nowrap">
                                  <span
                                    style={{
                                      color:
                                        ctx.amount < 0
                                          ? "var(--bad)"
                                          : "var(--good)",
                                    }}
                                  >
                                    {fmtSAR(ctx.amount)}
                                  </span>
                                </td>
                                <td className="pl-2 truncate max-w-[400px]">
                                  {ctx.description}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ),
      )}


      {rows !== null && (
        <div className="card-flat overflow-x-auto rise">
          <table className="w-full text-[13px]">
            <thead>
              <tr
                className="text-start"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                {[tr("Date"), tr("Description"), tr("Bank"), tr("Amount"), tr("Source")].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-[12.5px] font-normal"
                      style={{ color: "var(--text-2)" }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <Fragment key={t.id}>
                  <tr
                    className="row-hover cursor-pointer"
                    style={{ borderBottom: "1px solid var(--border-soft)" }}
                    onClick={() => setOpenRow(openRow === t.id ? null : t.id)}
                  >
                    <td
                      className="px-4 py-3 mono"
                      style={{ color: "var(--text-2)" }}
                    >
                      {t.date}
                    </td>
                    <td className="px-4 py-3">
                      <div>{t.desc}</div>
                      {t.descAr && (
                        <div
                          className="ar text-[12.5px]"
                          style={{ color: "var(--text-2)" }}
                        >
                          {t.descAr}
                        </div>
                      )}
                    </td>
                    <td
                      className="px-4 py-3 mono text-[12px]"
                      style={{ color: "var(--text-2)" }}
                    >
                      {t.bank}
                    </td>
                    <td
                      className="px-4 py-3 mono text-end"
                      style={{
                        color: t.amount < 0 ? "var(--text)" : "var(--good)",
                      }}
                    >
                      {fmtSAR(t.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          viewOriginal(t);
                        }}
                        className="underline decoration-dotted text-[12px]"
                        style={{ color: "var(--accent)" }}
                      >
                        {tr("view original")} <span className="arrow-nudge">→</span>
                      </button>
                    </td>
                  </tr>
                  {openRow === t.id && (
                    <tr className="fade">
                      <td colSpan={5} className="px-4 pb-4">
                        <div
                          className="p-4 flex items-center gap-4"
                          style={{ background: "var(--surface-2)" }}
                        >
                          <div
                            className="w-16 h-20 shrink-0 flex items-center justify-center text-[12px] text-center"
                            style={{
                              background: "var(--canvas)",
                              border: "1px solid var(--border)",
                              color: "var(--text-2)",
                            }}
                          >
                            {tr("SOURCE")}
                            <br />
                            {tr("DOC")}
                          </div>
                          <div
                            className="text-[12px]"
                            style={{ color: "var(--text-2)" }}
                          >
                            {tr("Original file:")}{" "}
                            <span
                              className="mono"
                              style={{ color: "var(--text)" }}
                            >
                              {t.documentName ?? "unknown"}
                            </span>
                            {t.invoiceRef && (
                              <>
                                {" "}
                                {tr("· matched invoice")}{" "}
                                <span
                                  className="mono"
                                  style={{ color: "var(--text)" }}
                                >
                                  {t.invoiceRef}
                                </span>
                              </>
                            )}
                            {t.reference && (
                              <>
                                {" "}
                                {tr("· ref")}{" "}
                                <span
                                  className="mono"
                                  style={{ color: "var(--text)" }}
                                >
                                  {t.reference}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
