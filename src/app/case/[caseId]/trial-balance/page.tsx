"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ApiError,
  ReadinessItem,
  ReadinessReport,
  TrialBalance,
  approveTrialBalance,
  generateTrialBalance,
  getCase,
  getReadiness,
  getTrialBalance,
} from "@/lib/api";
import { CountUp } from "@/components/CountUp";
import { ConfettiBurst } from "@/components/ConfettiBurst";
import Link from "next/link";
import { useLocale } from "@/lib/i18n";
import { Bi } from "@/components/Bi";

const STATUS_COLOR: Record<ReadinessItem["status"], string> = {
  complete: "var(--good)",
  in_progress: "var(--warn)",
  blocked: "var(--bad)",
};

const STATUS_GLYPH: Record<ReadinessItem["status"], string> = {
  complete: "✓",
  in_progress: "…",
  blocked: "✕",
};

/**
 * The two count-only lanes ("exceptions", "missing_docs") always emit
 * done: 0 on the backend, so `0/5` would read as a stuck checklist. Render
 * them as a plain count instead — the label supplies the noun.
 */
function ReadinessCount({ item }: { item: ReadinessItem }) {
  if (item.total <= 0) return null;
  if (item.key === "trial_balance") return null;
  if (item.key === "exceptions" || item.key === "missing_docs") {
    return (
      <span className="mono ms-2" style={{ color: "var(--text-2)" }}>
        {item.total}
      </span>
    );
  }
  return (
    <span className="mono ms-2" style={{ color: "var(--text-2)" }}>
      {item.done}/{item.total}
    </span>
  );
}

function ReadinessChecklist({ report }: { report: ReadinessReport }) {
  const { tr } = useLocale();
  return (
    <div className="card-flat p-5 mb-6 rise">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div
            className="text-[12.5px] "
            style={{ color: "var(--text-2)" }}
          >
            {tr("Trial Balance readiness")}
          </div>
          <div className="text-[13px] mt-0.5">
            {report.readyForStatements ? (
              <span style={{ color: "var(--good)" }}>
                {tr("All checks complete — ready to approve.")}
              </span>
            ) : (
              <span style={{ color: "var(--warn)" }}>
                {report.blockingSummary}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        {report.items.map((it) => (
          <div key={it.key} className="flex items-start gap-3 text-[12px] py-1">
            <span
              className="mono shrink-0 w-4 text-center"
              style={{ color: STATUS_COLOR[it.status] }}
            >
              {STATUS_GLYPH[it.status]}
            </span>
            <span className="flex-1">
              <Bi en={it.label} ar={it.labelAr} />
              <ReadinessCount item={it} />
              {it.detail ? (
                <div
                  className="text-[12.5px] mt-0.5"
                  style={{ color: "var(--text-2)" }}
                >
                  {it.detail}
                </div>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TrialBalancePage() {
  const { tr } = useLocale();
  const params = useParams<{ caseId: string }>();
  const router = useRouter();
  const caseId = params.caseId;
  const [tb, setTb] = useState<TrialBalance | null>(null);
  const [readiness, setReadiness] = useState<ReadinessReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [approved, setApproved] = useState(false);
  const [reveal, setReveal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [kase, balance, r] = await Promise.all([
        getCase(caseId),
        getTrialBalance(caseId),
        getReadiness(caseId),
      ]);
      setTb(balance);
      setReadiness(r);
      setApproved(kase.status === "TB_APPROVED" || kase.status === "COMPLETE");
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : tr("Failed to load the trial balance"),
      );
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    load();
    const t = setTimeout(() => setReveal(true), 120);
    return () => clearTimeout(t);
  }, [load]);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      setTb(await generateTrialBalance(caseId));
      setReadiness(await getReadiness(caseId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tr("Generation failed"));
    } finally {
      setGenerating(false);
    }
  }

  async function approve() {
    setError(null);
    try {
      setTb(await approveTrialBalance(caseId));
      setApproved(true);
      setTimeout(() => router.push(`/case/${caseId}/statements`), 700);
    } catch (e) {
      // Backend 400s carry the readiness summary inside the message — show
      // it verbatim so the accountant sees exactly what's outstanding.
      setError(e instanceof ApiError ? e.message : tr("Approval failed"));
    }
  }

  const balanced = tb?.balanced ?? false;
  const hasRows = (tb?.rows.length ?? 0) > 0;
  const readyForApproval = readiness?.readyForStatements ?? false;

  return (
    <div className="p-8 md:p-10 max-w-4xl page-enter relative">
      {approved && <ConfettiBurst count={22} />}
      <div className="rise flex items-end justify-between mb-6">
        <div>
          <h1 className="display text-[32px]">
            {tr("Trial Balance")}{" "}
            <span
              className="ar ar-secondary text-[16px]"
              style={{ color: "var(--text-2)" }}
            >
              ميزان المراجعة
            </span>
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-2)" }}>
            {tr("Calculated deterministically from approved transactions — no AI in the math. Approval requires the readiness checklist below, not just Debit = Credit.")}
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

      {!loading && readiness && <ReadinessChecklist report={readiness} />}

      {!loading && tb !== null && !hasRows && !approved && (
        <div className="card-flat p-8 text-center rise">
          <p className="text-sm" style={{ color: "var(--text-2)" }}>
            {tr("No journal lines yet. Generate the Trial Balance from this case's resolved transactions.")}
          </p>
          <div className="flex justify-center gap-3 mt-4">
            <Link
              href={`/case/${caseId}/opening-balances`}
              className="btn-ghost click-scale px-4 py-2 text-[12px]"
            >
              {tr("Opening balances")}
            </Link>
            <Link
              href={`/case/${caseId}/adjustments`}
              className="btn-ghost click-scale px-4 py-2 text-[12px]"
            >
              {tr("Adjustments")}
            </Link>
            <button
              disabled={generating}
              onClick={generate}
              className="btn-primary click-scale px-5 py-2.5 text-sm"
            >
              {generating ? tr("Generating…") : tr("Generate trial balance")}
            </button>
          </div>
        </div>
      )}

      {tb !== null && hasRows && (
        <>
          <div className="card-flat overflow-hidden rise">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {[tr("Code"), tr("Account"), tr("Debit"), tr("Credit")].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-[12.5px] font-normal ${i > 1 ? "text-end" : "text-start"}`}
                      style={{ color: "var(--text-2)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tb.rows.map((r, i) => (
                  <tr
                    key={r.accountId}
                    className="row-hover fade"
                    style={{
                      borderBottom: "1px solid var(--border-soft)",
                      animationDelay: `${i * 50}ms`,
                    }}
                  >
                    <td
                      className="px-4 py-3 mono"
                      style={{ color: "var(--text-2)" }}
                    >
                      {r.code}
                    </td>
                    <td className="px-4 py-3">
                      <Bi en={r.name} ar={r.nameAr} />
                    </td>
                    <td className="px-4 py-3 mono text-end">
                      {r.debit
                        ? r.debit.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 mono text-end">
                      {r.credit
                        ? r.credit.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid var(--border)" }}>
                  <td className="px-4 py-3" colSpan={2}>
                    <span
                      className="text-[12px] "
                      style={{ color: "var(--text-2)" }}
                    >
                      {tr("Totals")}
                    </span>
                  </td>
                  <td className="px-4 py-3 mono text-end font-medium">
                    {reveal ? (
                      <CountUp value={tb.totalDebit} decimals={2} />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 mono text-end font-medium">
                    {reveal ? (
                      <CountUp value={tb.totalCredit} decimals={2} />
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span
                className="status-dot"
                style={{ background: balanced ? "var(--good)" : "var(--bad)" }}
              />
              <span
                className="text-[13px]"
                style={{ color: balanced ? "var(--good)" : "var(--bad)" }}
              >
                {balanced
                  ? tr("Debits = Credits — balanced")
                  : tr("Out of balance — finalization blocked")}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/case/${caseId}/opening-balances`}
                className="btn-ghost click-scale px-3 py-2 text-[12px]"
              >
                {tr("Opening balances")}
              </Link>
              <Link
                href={`/case/${caseId}/adjustments`}
                className="btn-ghost click-scale px-3 py-2 text-[12px]"
              >
                {tr("Adjustments")}
              </Link>
              {!approved && hasRows && (
                <button
                  disabled={generating}
                  onClick={generate}
                  className="btn-ghost click-scale px-4 py-2 text-[12px]"
                >
                  {generating ? tr("Regenerating…") : tr("Regenerate")}
                </button>
              )}
              {!approved ? (
                <button
                  disabled={!balanced || !hasRows || !readyForApproval}
                  onClick={approve}
                  className="btn-primary click-scale px-5 py-2.5 text-sm"
                  title={
                    !readyForApproval
                      ? tr("Readiness checklist must be all green to approve")
                      : undefined
                  }
                >
                  {tr("Approve trial balance")}
                </button>
              ) : (
                <span
                  className="stamp text-[12.5px] px-3 py-1.5"
                  style={{ color: "var(--good)" }}
                >
                  {tr("APPROVED")}
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
