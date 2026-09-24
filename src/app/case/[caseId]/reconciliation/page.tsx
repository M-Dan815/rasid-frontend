"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ApiAccount,
  ApiBankTransaction,
  ApiError,
  ApiException,
  ApiInvoice,
  RuleScope,
  bulkCategorize,
  generateTrialBalance,
  getAccounts,
  getExceptions,
  getInvoices,
  getSimilarTransactions,
  getTransactions,
  num,
  setTransactionCategory,
  setTransactionMatch,
  setTransactionSplit,
  type SimilarTransaction,
} from "@/lib/api";
import { fmtSAR } from "@/lib/format";
import { isBlockingExceptionType, MatchStatus } from "@/lib/data";
import { ConfidenceBar, MatchBadge, Toast } from "@/components/StatusPieces";
import { useLocale } from "@/lib/i18n";

type Filter = "all" | MatchStatus | "needs-account";

type DocStatus = "ready" | "missing" | "needs-clarification";

const DOC_STATUS_META: Record<DocStatus, { label: string; color: string }> = {
  ready: { label: "Ready", color: "var(--good)" },
  missing: { label: "Missing doc", color: "var(--accent)" },
  "needs-clarification": {
    label: "Needs clarification",
    color: "var(--warn)",
  },
};

/**
 * Document status is DERIVED on the frontend from the exception list —
 * the transactions endpoint does not fold it onto each row. The client was
 * explicit that classification confidence and document status are separate
 * concerns, so they render as separate columns.
 */
function deriveDocStatus(
  txn: ApiBankTransaction,
  exceptions: ApiException[],
): DocStatus {
  const forTxn = exceptions.filter((e) => e.bankTransactionId === txn.id);
  if (
    forTxn.some(
      (e) => e.type === "NEEDS_CLIENT_CLARIFICATION" && e.status === "OPEN",
    )
  )
    return "needs-clarification";
  if (
    forTxn.some(
      (e) =>
        (e.type === "MISSING_SUPPORTING_DOC" && e.status === "OPEN") ||
        e.status === "FLAGGED_MISSING_DOC",
    )
  )
    return "missing";
  return "ready";
}

function toUiStatus(s: string): MatchStatus {
  if (s === "MATCHED") return "matched";
  if (s === "NEEDS_REVIEW") return "needs-review";
  return "unmatched";
}

/** Colour the reason line by who produced it — rules are trusted, AI is a hint. */
function reasonColor(source: string | null): string {
  if (source === "rule") return "var(--good)";
  if (source === "manual" || source === "prior-approval") return "var(--accent)";
  return "var(--text-2)";
}

function reasonLabel(source: string | null): string | null {
  if (source === "rule") return "rule";
  if (source === "ai") return "AI";
  if (source === "manual") return "you";
  if (source === "prior-approval") return "prior";
  return null;
}

/** "Custom pattern" is really description-scope with an explicit ruleText.
 *  "similar" is a new scope (Anas feedback #1) — when chosen, the picker
 *  fetches a list of similar existing txns and lets the accountant
 *  multi-select which to apply the same account to (with a preview). */
type ScopeChoice = RuleScope | "custom" | "similar";

export default function ReconciliationPage() {
  const { tr } = useLocale();
  const params = useParams<{ caseId: string }>();
  const router = useRouter();
  const caseId = params.caseId;

  const [txns, setTxns] = useState<ApiBankTransaction[] | null>(null);
  const [accounts, setAccounts] = useState<ApiAccount[] | null>(null);
  const [invoices, setInvoices] = useState<ApiInvoice[] | null>(null);
  const [exceptions, setExceptions] = useState<ApiException[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [picker, setPicker] = useState<{
    txnId: string;
    mode: "match" | "category" | "split";
  } | null>(null);
  const [pickedId, setPickedId] = useState("");
  const [pickedScope, setPickedScope] = useState<ScopeChoice>("description");
  const [customRuleText, setCustomRuleText] = useState("");
  const [busyTxn, setBusyTxn] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [t, e] = await Promise.all([
        getTransactions(caseId),
        getExceptions(caseId),
      ]);
      setTxns(t);
      setExceptions(e);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : tr("Failed to load reconciliation"),
      );
    }
  }, [caseId]);

  useEffect(() => {
    load();
  }, [load]);

  const list = txns ?? [];
  const takenInvoiceIds = new Set(
    list.map((t) => t.matchedInvoiceId).filter((x): x is string => !!x),
  );

  const needsCategory = (t: ApiBankTransaction) => !t.categoryAccountId;
  const needsMatch = (t: ApiBankTransaction) => t.matchStatus !== "MATCHED";
  const hasProposal = (t: ApiBankTransaction) =>
    t.matchStatus === "NEEDS_REVIEW" && !!t.matchedInvoiceId;

  // A transaction blocks TB generation when it has no category, OR when it
  // has an OPEN blocking exception attached. Match status does NOT gate —
  // the backend's generateTrialBalance only checks category + exceptions.
  const blockingTxnIds = useMemo(() => {
    const ids = new Set<string>();
    for (const e of exceptions) {
      if (
        e.status === "OPEN" &&
        e.bankTransactionId &&
        isBlockingExceptionType(e.type)
      ) {
        ids.add(e.bankTransactionId);
      }
    }
    return ids;
  }, [exceptions]);

  const blockers = list.filter(
    (t) => needsCategory(t) || blockingTxnIds.has(t.id),
  ).length;

  function openPicker(txnId: string, mode: "match" | "category" | "split") {
    const txn = list.find((t) => t.id === txnId);
    setPicker({ txnId, mode });
    setPickedId("");
    setCustomRuleText("");
    // Recommend merchant-scope when counterparty is present (the classifier
    // and rule matcher both rely on it being clean). Fall back to
    // description-scope otherwise.
    setPickedScope(txn?.counterparty ? "merchant" : "description");
    if (mode === "category" && !accounts)
      getAccounts()
        .then(setAccounts)
        .catch(() => setError(tr("Failed to load the chart of accounts")));
    if (mode === "match" && !invoices)
      getInvoices(caseId)
        .then(setInvoices)
        .catch(() => setError(tr("Failed to load invoices")));
  }

  async function act(fn: () => Promise<unknown>, label: string, txnId: string) {
    setBusyTxn(txnId);
    setError(null);
    try {
      await fn();
      setToast(label);
      setPicker(null);
      setPickedId("");
      setCustomRuleText("");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tr("Action failed"));
    } finally {
      setBusyTxn(null);
    }
  }

  async function generateAndContinue() {
    setGenerating(true);
    setError(null);
    try {
      await generateTrialBalance(caseId);
      router.push(`/case/${caseId}/trial-balance`);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : tr("Could not generate the trial balance"),
      );
    } finally {
      setGenerating(false);
    }
  }

  function applyCategory(t: ApiBankTransaction) {
    // "similar" scope has its own apply flow (SimilarTxnPicker calls
    // bulkCategorize directly via onApply), so this function should never
    // be reached when pickedScope === "similar". The button that calls
    // applyCategory is hidden in that case.
    if (pickedScope === "similar") return Promise.resolve();
    const scope: RuleScope =
      pickedScope === "custom" ? "description" : pickedScope;
    const ruleText =
      pickedScope === "custom" ? customRuleText.trim() : undefined;
    return act(
      () => setTransactionCategory(caseId, t.id, pickedId, scope, ruleText),
      tr("Account applied — saved as a reusable firm rule"),
      t.id,
    );
  }

  // ─── Search + sort (Anas feedback #6) ──────────────────────────────────
  // Search filters by description / counterparty / amount (the latter as a
  // plain numeric substring match — typing "200" matches any amount containing
  // "200" like "2,000.00" or "1,200.50"). Sort: click the Amount column
  // header to toggle asc/desc; default is date-asc (statement order).
  // Declared HERE (before rows + counts) so it's in scope for those uses.
  const [search, setSearch] = useState("");
  const [amountSort, setAmountSort] = useState<"none" | "asc" | "desc">("none");
  const searchNorm = search.trim().toLowerCase();
  const filteredBySearch = list.filter((t) => {
    if (!searchNorm) return true;
    const desc = t.description.toLowerCase();
    const cp = (t.counterparty ?? "").toLowerCase();
    const amt = Math.abs(num(t.amount)).toFixed(2);
    return (
      desc.includes(searchNorm) ||
      cp.includes(searchNorm) ||
      amt.includes(searchNorm)
    );
  });
  const sortedForDisplay =
    amountSort === "none"
      ? filteredBySearch
      : [...filteredBySearch].sort((a, b) => {
          const diff = num(a.amount) - num(b.amount);
          return amountSort === "asc" ? diff : -diff;
        });

  // Use sortedForDisplay (which already includes the search filter) as the
  // source for both rows + counts, so the search box actually narrows the
  // table. The counts still reflect the FULL list so the accountant sees the
  // true totals in the tabs.
  const rows = sortedForDisplay.filter((t) =>
    filter === "all"
      ? true
      : filter === "needs-account"
        ? !t.categoryAccountId
        : toUiStatus(t.matchStatus) === filter,
  );
  const counts: Record<Filter, number> = {
    all: list.length,
    matched: list.filter((t) => t.matchStatus === "MATCHED").length,
    "needs-review": list.filter((t) => t.matchStatus === "NEEDS_REVIEW").length,
    unmatched: list.filter((t) => t.matchStatus === "UNMATCHED").length,
    // "Needs account" filters by classification status, not invoice-match
    // status. Anas feedback: the existing "Needs review" tab filtered by
    // matchStatus === NEEDS_REVIEW which is about INVOICE matching — useless
    // on a statement-only case where every txn is "Unmatched". The tab the
    // accountant actually wants is "show me transactions that don't have an
    // account assigned yet" — that's the actual work to do.
    "needs-account": list.filter((t) => !t.categoryAccountId).length,
  };

  // Build the tab list dynamically — hide the invoice-match tabs (Matched /
  // Needs review / Unmatched) when no invoices are uploaded, since every txn
  // would show up as "Unmatched 0%" which is noise. Always show "All" and
  // "Needs account" — those are about the accountant's actual work.
  const hasInvoices = (invoices?.length ?? 0) > 0;
  const tabs: [Filter, string][] = hasInvoices
    ? [
        ["all", tr("All")],
        ["needs-account", tr("Needs account")],
        ["matched", tr("Matched")],
        ["needs-review", tr("Needs review")],
        ["unmatched", tr("Unmatched")],
      ]
    : [
        ["all", tr("All")],
        ["needs-account", tr("Needs account")],
      ];

  return (
    <div className="p-8 md:p-10 page-enter">
      <div className="rise mb-6">
        <h1 className="display text-[32px]">{tr("Reconciliation")}</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-2)" }}>
          {tr("Match transactions to invoices and assign accounts — every transaction needs an account before the Trial Balance can be generated. Classification confidence and document status are separate: a missing invoice does not make the classification uncertain.")}
        </p>
      </div>

      {error && (
        <div
          className="text-[12px] px-3 py-2 mb-4"
          style={{ color: "var(--bad)", border: "1px solid var(--bad-line)" }}
        >
          {error}
        </div>
      )}

      {txns !== null && (
        <div className="card-flat p-4 mb-6 flex items-center justify-between gap-4 rise">
          <div className="flex items-center gap-2">
            <span
              className="status-dot"
              style={{
                background: blockers === 0 ? "var(--good)" : "var(--warn)",
              }}
            />
            <span
              className="text-[13px]"
              style={{
                color: blockers === 0 ? "var(--good)" : "var(--text-2)",
              }}
            >
              {blockers === 0
                ? tr("Every transaction has an account and no blocking exceptions — ready.")
                : blockers === 1
                  ? tr("1 transaction still needs a decision before the Trial Balance can be generated.")
                  : tr("{n} transactions still need a decision before the Trial Balance can be generated.", { n: blockers })}
            </span>
          </div>
          <button
            disabled={blockers > 0 || generating}
            onClick={generateAndContinue}
            className="btn-primary click-scale px-4 py-2 text-sm shrink-0"
          >
            {generating ? tr("Generating…") : tr("Generate trial balance →")}
          </button>
        </div>
      )}

      <div className="flex gap-1 mb-3 rise" style={{ animationDelay: "60ms" }}>
        {tabs.map(([k, l]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className="click-scale px-3.5 py-1.5 text-[12px]"
            style={{
              borderRadius: 999,
              background: filter === k ? "var(--accent)" : "var(--surface)",
              color: filter === k ? "var(--on-accent)" : "var(--text-2)",
              border: `1px solid ${filter === k ? "var(--accent)" : "var(--border)"}`,
            }}
          >
            {l} <span className="mono opacity-70">{counts[k]}</span>
          </button>
        ))}
      </div>

      {/* Search + sort — Anas feedback #6. Search narrows by description /
          counterparty / amount. Click Amount header to toggle asc/desc. */}
      {txns !== null && (
        <div
          className="flex gap-2 items-center mb-3 rise"
          style={{ animationDelay: "80ms" }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tr("Search description / counterparty / amount…")}
            className="field flex-1 px-3 py-1.5 text-[12.5px]"
          />
          {search && (
            <span className="text-[12px]" style={{ color: "var(--text-2)" }}>
              {rows.length} / {list.length}
            </span>
          )}
        </div>
      )}

      {txns !== null && (
        <div
          className="card-flat overflow-x-auto rise"
          style={{ animationDelay: "100ms" }}
        >
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {[
                  tr("Transaction"),
                  tr("Counterparty"),
                  tr("Amount"),
                  tr("Account"),
                  ...((invoices?.length ?? 0) > 0
                    ? [tr("Invoice matched")]
                    : []),
                  tr("Document"),
                  tr("Actions"),
                ].map((h, i) => {
                  const isAmount = i === 2;
                  const sortIcon =
                    isAmount && amountSort !== "none"
                      ? amountSort === "asc" ? " ↑" : " ↓"
                      : "";
                  return (
                    <th
                      key={h}
                      className="text-start px-4 py-3 text-[12.5px] font-normal"
                      style={{
                        color: "var(--text-2)",
                        cursor: isAmount ? "pointer" : "default",
                        userSelect: isAmount ? "none" : "auto",
                      }}
                      onClick={
                        isAmount
                          ? () =>
                              setAmountSort((cur) =>
                                cur === "none"
                                  ? "desc"
                                  : cur === "desc"
                                    ? "asc"
                                    : "none",
                              )
                          : undefined
                      }
                    >
                      {h}
                      {sortIcon && (
                        <span style={{ color: "var(--accent)" }}>{sortIcon}</span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const busy = busyTxn === t.id;
                const status = toUiStatus(t.matchStatus);
                const pickerInvoices = (invoices ?? []).filter(
                  (iv) =>
                    !takenInvoiceIds.has(iv.id) || iv.id === t.matchedInvoiceId,
                );
                const isPickerRow = picker?.txnId === t.id;
                const rlabel0 = reasonLabel(t.categoryReasonSource);
                const rlabel = rlabel0 ? tr(rlabel0) : null;
                const rcolor = reasonColor(t.categoryReasonSource);
                const doc = deriveDocStatus(t, exceptions);
                const docMeta = DOC_STATUS_META[doc];

                return (
                  <tr
                    key={t.id}
                    className="row-hover align-top"
                    style={{
                      borderBottom: "1px solid var(--border-soft)",
                      opacity: busy ? 0.5 : 1,
                    }}
                  >
                    <td className="px-4 py-3 min-w-[220px]">
                      <div>{t.description}</div>
                      {/* Refund pairing tag — Anas feedback #4. When this
                          txn is a refund auto-paired with an original
                          purchase, show "Refund of {date · merchant}" so
                          the accountant sees the link instead of treating
                          the refund as a standalone row. */}
                      {t.pairedWithTxn ? (
                        <div
                          className="text-[11.5px] mt-0.5 italic"
                          style={{ color: "var(--accent)" }}
                        >
                          ↩ {tr("Refund of")}{" "}
                          {t.pairedWithTxn.date.slice(0, 10)} ·{" "}
                          {t.pairedWithTxn.counterparty ??
                            t.pairedWithTxn.description.slice(0, 40)}
                          {t.pairedWithTxn.description.length > 40 ? "…" : ""}
                        </div>
                      ) : null}
                      {t.reference ? (
                        <div
                          className="ar text-[12.5px] mt-0.5"
                          style={{ color: "var(--text-2)" }}
                        >
                          {t.reference}
                        </div>
                      ) : null}
                      {/* Split indicator — show "Split across N accounts"
                          when this txn has been split, so the accountant
                          can see at a glance that the journal will post
                          multiple lines. */}
                      {t.splits && t.splits.length >= 2 ? (
                        <div
                          className="text-[11.5px] mt-0.5"
                          style={{ color: "var(--text-2)" }}
                        >
                          {tr("Split across {n} accounts", { n: t.splits.length })}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-3 text-[12px] min-w-[140px]">
                      {t.counterparty ?? (
                        <span style={{ color: "var(--text-2)" }}>—</span>
                      )}
                    </td>

                    <td className="px-4 py-3 mono text-end whitespace-nowrap">
                      {fmtSAR(num(t.amount))}
                    </td>

                    <td className="px-4 py-3 text-[12px] min-w-[200px]">
                      {t.categoryAccount ? (
                        <>
                          <div>{t.categoryAccount.name}</div>
                          <div
                            className="text-[12.5px] mt-0.5"
                            style={{ color: "var(--text-2)" }}
                          >
                            <span
                              className="mono"
                              style={{ color: "var(--good)" }}
                            >
                              ({(t.categorySource ?? "manual").toLowerCase()}{" "}
                              {Math.round(num(t.categoryConfidence) * 100)}%)
                            </span>
                          </div>
                          {t.categoryReason ? (
                            <div
                              className="text-[12.5px] mt-0.5 italic"
                              style={{ color: rcolor }}
                            >
                              {rlabel ? `[${rlabel}] ` : ""}
                              {t.categoryReason}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <span style={{ color: "var(--bad)" }}>
                          {tr("no account — blocks the trial balance")}
                        </span>
                      )}
                    </td>

                    {/* Hide the Invoice-matched column entirely when no
                        invoices are uploaded — otherwise every row would
                        show "Unmatched 0%" which is noise. The cell is
                        only rendered when invoices.length > 0, matching
                        the conditional header above. */}
                    {((invoices?.length ?? 0) > 0) && (
                      <td className="px-4 py-3 text-[12px] min-w-[140px]">
                        <div style={{ color: "var(--text-2)" }}>
                          {t.matchedInvoice?.invoiceNumber ?? "—"}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <ConfidenceBar value={num(t.matchConfidence)} />
                          <MatchBadge status={status} />
                        </div>
                      </td>
                    )}

                    <td className="px-4 py-3 text-[12.5px] whitespace-nowrap">
                      <span
                        className="px-2 py-0.5"
                        style={{
                          color: docMeta.color,
                          border: `1px solid color-mix(in srgb, ${docMeta.color} 35%, transparent)`,
                        }}
                      >
                        {tr(docMeta.label)}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {!needsCategory(t) && !needsMatch(t) ? (
                        <span
                          className="text-[12.5px]"
                          style={{ color: "var(--good)" }}
                        >
                          {tr("done")}
                        </span>
                      ) : (
                        <div className="flex flex-col items-start gap-1.5 min-w-[180px]">
                          {needsMatch(t) && hasProposal(t) && (
                            <button
                              disabled={busy}
                              onClick={() =>
                                act(
                                  () =>
                                    setTransactionMatch(
                                      caseId,
                                      t.id,
                                      t.matchedInvoiceId!,
                                    ),
                                  tr("Match confirmed"),
                                  t.id,
                                )
                              }
                              className="btn-primary click-scale px-2.5 py-1 text-[12.5px]"
                            >
                              {tr("✓ Confirm this match (")}
                              {t.matchedInvoice?.invoiceNumber})
                            </button>
                          )}
                          {needsMatch(t) && (
                            <>
                              <button
                                onClick={() => openPicker(t.id, "match")}
                                disabled={busy}
                                className="btn-ghost click-scale px-2.5 py-1 text-[12.5px]"
                              >
                                {hasProposal(t)
                                  ? tr("Pick a different invoice…")
                                  : tr("Match to invoice…")}
                              </button>
                              <button
                                onClick={() =>
                                  act(
                                    () => setTransactionMatch(caseId, t.id),
                                    tr("Accepted — no invoice expected"),
                                    t.id,
                                  )
                                }
                                disabled={busy}
                                className="text-[12.5px]"
                                style={{ color: "var(--text-2)" }}
                              >
                                {tr("No invoice — accept")}
                              </button>
                            </>
                          )}
                          {needsCategory(t) && (
                            <button
                              onClick={() => openPicker(t.id, "category")}
                              disabled={busy}
                              className="btn-ghost click-scale px-2.5 py-1 text-[12.5px]"
                            >
                              {tr("Choose account…")}
                            </button>
                          )}
                          {needsCategory(t) && (
                            <button
                              onClick={() => openPicker(t.id, "split")}
                              disabled={busy}
                              className="btn-ghost click-scale px-2.5 py-1 text-[12.5px]"
                              title={tr("Split this transaction across multiple accounts (e.g. 80% Transport / 20% Hospitality)")}
                            >
                              {tr("Split…")}
                            </button>
                          )}

                          {isPickerRow && picker.mode === "match" && (
                            <div
                              className="fade flex flex-col gap-1.5 mt-1 p-2 w-full"
                              style={{ background: "var(--surface-2)" }}
                            >
                              <select
                                value={pickedId}
                                onChange={(e) => setPickedId(e.target.value)}
                                className="field px-2 py-1 text-[12.5px] w-full"
                              >
                                <option value="">{tr("Choose invoice…")}</option>
                                {pickerInvoices.map((iv) => (
                                  <option key={iv.id} value={iv.id}>
                                    {iv.invoiceNumber ?? "(no #)"} ·{" "}
                                    {iv.counterparty ?? "—"} ·{" "}
                                    {fmtSAR(num(iv.amountTotal))}
                                  </option>
                                ))}
                              </select>
                              {pickerInvoices.length === 0 && (
                                <span
                                  className="text-[12px]"
                                  style={{ color: "var(--warn)" }}
                                >
                                  {tr("No invoices in this case yet — upload some first, or use “No invoice — accept”.")}
                                </span>
                              )}
                              <div className="flex gap-1.5">
                                <button
                                  disabled={!pickedId || busy}
                                  onClick={() =>
                                    act(
                                      () =>
                                        setTransactionMatch(
                                          caseId,
                                          t.id,
                                          pickedId,
                                        ),
                                      tr("Transaction matched to invoice"),
                                      t.id,
                                    )
                                  }
                                  className="btn-primary click-scale px-2 py-1 text-[12.5px]"
                                >
                                  {tr("Match")}
                                </button>
                                <button
                                  onClick={() => setPicker(null)}
                                  className="btn-ghost click-scale px-2 py-1 text-[12.5px]"
                                >
                                  {tr("Cancel")}
                                </button>
                              </div>
                            </div>
                          )}

                          {isPickerRow && picker.mode === "category" && (
                            <div
                              className="fade flex flex-col gap-2 mt-1 p-2 w-full"
                              style={{ background: "var(--surface-2)" }}
                            >
                              <select
                                value={pickedId}
                                onChange={(e) => setPickedId(e.target.value)}
                                className="field px-2 py-1 text-[12.5px] w-full"
                              >
                                <option value="">{tr("Choose account…")}</option>
                                {(accounts ?? [])
                                  .filter((a) => a.postable)
                                  .map((a) => (
                                    <option key={a.id} value={a.id}>
                                      {a.code} — {a.name}
                                      {a.nameAr ? ` (${a.nameAr})` : ""}
                                      {a.requiresSupportingDoc
                                        ? tr(" ⚠ needs doc")
                                        : ""}
                                    </option>
                                  ))}
                              </select>

                              <div
                                className="text-[12px] "
                                style={{ color: "var(--text-2)" }}
                              >
                                {tr("Apply this decision to")}
                              </div>
                              <div className="flex flex-col gap-1 text-[12.5px]">
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="radio"
                                    checked={pickedScope === "none"}
                                    onChange={() => setPickedScope("none")}
                                  />
                                  {tr("Only this transaction")}
                                </label>
                                <label
                                  className="flex items-center gap-1.5"
                                  style={{
                                    cursor: t.counterparty
                                      ? "pointer"
                                      : "not-allowed",
                                    opacity: t.counterparty ? 1 : 0.45,
                                  }}
                                >
                                  <input
                                    type="radio"
                                    disabled={!t.counterparty}
                                    checked={pickedScope === "merchant"}
                                    onChange={() => setPickedScope("merchant")}
                                  />
                                  {tr("All future transactions matching this counterparty")}
                                  {t.counterparty
                                    ? ` (${t.counterparty})`
                                    : tr(" (no counterparty)")}
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="radio"
                                    checked={pickedScope === "description"}
                                    onChange={() =>
                                      setPickedScope("description")
                                    }
                                  />
                                  {tr("All future transactions matching this description")}
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="radio"
                                    checked={pickedScope === "custom"}
                                    onChange={() => setPickedScope("custom")}
                                  />
                                  {tr("Custom pattern…")}
                                </label>
                                {pickedScope === "custom" && (
                                  <input
                                    value={customRuleText}
                                    onChange={(e) =>
                                      setCustomRuleText(e.target.value)
                                    }
                                    placeholder={tr("Match text (e.g. ALDREES)")}
                                    className="field px-2 py-1 text-[12.5px]"
                                  />
                                )}
                                {/* Apply to selected similar — Anas feedback #1.
                                    When chosen, shows a multi-select list of
                                    similar existing txns (same kind +
                                    counterparty). The accountant picks which
                                    to include + clicks Apply to bulk-
                                    categorize them all to the same account. */}
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="radio"
                                    checked={pickedScope === "similar"}
                                    onChange={() => setPickedScope("similar")}
                                  />
                                  {tr("Apply to selected similar transactions…")}
                                </label>
                                {pickedScope === "similar" && (
                                  <SimilarTxnPicker
                                    caseId={caseId}
                                    txnId={t.id}
                                    onApply={async (txnIds) => {
                                      if (!pickedId) return;
                                      await act(
                                        () =>
                                          bulkCategorize(caseId, {
                                            accountId: pickedId,
                                            txnIds,
                                          }),
                                        tr("Applied to {n} transactions", { n: txnIds.length }),
                                        t.id,
                                      );
                                    }}
                                  />
                                )}
                              </div>

                              <div className="flex gap-1.5">
                                {/* Hide the standalone Apply button when the
                                    "similar" scope is chosen — the
                                    SimilarTxnPicker renders its own Apply
                                    button (with the multi-select count) and
                                    calls bulkCategorize via onApply. */}
                                {pickedScope !== "similar" && (
                                  <button
                                    disabled={
                                      !pickedId ||
                                      busy ||
                                      (pickedScope === "custom" &&
                                        !customRuleText.trim())
                                    }
                                    onClick={() => applyCategory(t)}
                                    className="btn-primary click-scale px-2 py-1 text-[12.5px]"
                                  >
                                    {tr("Apply")}
                                  </button>
                                )}
                                <button
                                  onClick={() => setPicker(null)}
                                  className="btn-ghost click-scale px-2 py-1 text-[12.5px]"
                                >
                                  {tr("Cancel")}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Split picker — Anas feedback #2. Lets the
                              accountant allocate this transaction's
                              amount across 2+ accounts. The backend
                              endpoint enforces that the splits sum to
                              |amount| within 0.01 SAR. */}
                          {isPickerRow && picker.mode === "split" && (
                            <SplitPicker
                              txn={t}
                              accounts={(accounts ?? []).filter((a) => a.postable)}
                              busy={busy}
                              onCancel={() => setPicker(null)}
                              onSaved={() => {
                                setToast(tr("Transaction split across accounts"));
                                setPicker(null);
                                load();
                              }}
                              caseId={caseId}
                            />
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

// ─── SplitPicker (Anas feedback #2) ─────────────────────────────────────
// Inline form for allocating a transaction's amount across 2+ accounts.
// The backend endpoint enforces that split amounts sum to |txn.amount|
// within 0.01 SAR. Each row is an account-select + amount-input. The
// "Add row" button lets the accountant add more rows. The total +
// remaining indicator shows how close the splits are to the txn amount.

type SplitRow = { accountId: string; amount: string };

function SplitPicker({
  txn,
  accounts,
  busy,
  onCancel,
  onSaved,
  caseId,
}: {
  txn: ApiBankTransaction;
  accounts: ApiAccount[];
  busy: boolean;
  onCancel: () => void;
  onSaved: () => void;
  caseId: string;
}) {
  const { tr } = useLocale();
  const absAmount = Math.abs(num(txn.amount));
  // Start with two empty rows.
  const [rows, setRows] = useState<SplitRow[]>([
    { accountId: "", amount: "" },
    { accountId: "", amount: "" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const total = rows.reduce((sum, r) => {
    const n = Number(r.amount);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
  const remaining = absAmount - total;
  const canSave =
    rows.length >= 2 &&
    rows.every((r) => r.accountId && Number(r.amount) > 0) &&
    Math.abs(remaining) < 0.01;

  async function save() {
    setError(null);
    setSaving(true);
    try {
      await setTransactionSplit(
        caseId,
        txn.id,
        rows.map((r) => ({ accountId: r.accountId, amount: Number(r.amount) })),
      );
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tr("Could not save split"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fade flex flex-col gap-2 mt-1 p-2 w-full"
      style={{ background: "var(--surface-2)" }}
    >
      <div
        className="text-[12px] font-semibold"
        style={{ color: "var(--text)" }}
      >
        {tr("Split")} {fmtSAR(absAmount)} {tr("across accounts")}
      </div>
      {rows.map((r, i) => (
        <div key={i} className="flex gap-1.5 items-center">
          <select
            value={r.accountId}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...next[i], accountId: e.target.value };
              setRows(next);
            }}
            className="field flex-1 px-2 py-1 text-[12.5px]"
          >
            <option value="">{tr("Choose account…")}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name}
                {a.nameAr ? ` (${a.nameAr})` : ""}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            value={r.amount}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...next[i], amount: e.target.value };
              setRows(next);
            }}
            placeholder="0.00"
            className="field w-24 px-2 py-1 text-[12.5px] mono text-end"
          />
          {rows.length > 2 && (
            <button
              onClick={() => setRows(rows.filter((_, j) => j !== i))}
              className="text-[12px] px-1"
              style={{ color: "var(--bad)" }}
              title={tr("Remove this split row")}
            >
              ✕
            </button>
          )}
        </div>
      ))}
      <div className="flex items-center gap-3 text-[12px]">
        <button
          onClick={() => setRows([...rows, { accountId: "", amount: "" }])}
          className="btn-ghost click-scale px-2 py-1 text-[12px]"
        >
          + {tr("Add row")}
        </button>
        <span style={{ color: "var(--text-2)" }}>
          {tr("Total")}: <span className="mono">{total.toFixed(2)}</span>
        </span>
        <span
          style={{
            color: Math.abs(remaining) < 0.01 ? "var(--good)" : "var(--warn)",
          }}
        >
          {tr("Remaining")}: <span className="mono">{remaining.toFixed(2)}</span>
        </span>
      </div>
      {error && (
        <div className="text-[12px]" style={{ color: "var(--bad)" }}>
          {error}
        </div>
      )}
      <div className="flex gap-1.5">
        <button
          disabled={!canSave || saving || busy}
          onClick={save}
          className="btn-primary click-scale px-2 py-1 text-[12.5px]"
        >
          {saving ? "…" : tr("Save split")}
        </button>
        <button
          onClick={onCancel}
          className="btn-ghost click-scale px-2 py-1 text-[12.5px]"
        >
          {tr("Cancel")}
        </button>
      </div>
    </div>
  );
}

// ─── SimilarTxnPicker (Anas feedback #1) ────────────────────────────────
// Inline form for "Apply to selected similar transactions". Fetches the
// list of similar existing txns (same enrichment.kind + same normalised
// counterparty/merchant), shows them with checkboxes, and lets the
// accountant multi-select which to include. On Apply, calls the
// bulk-categorize endpoint with the selected txnIds.
function SimilarTxnPicker({
  caseId,
  txnId,
  onApply,
}: {
  caseId: string;
  txnId: string;
  onApply: (txnIds: string[]) => Promise<void>;
}) {
  const { tr } = useLocale();
  const [similar, setSimilar] = useState<SimilarTransaction[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    let alive = true;
    setError(null);
    getSimilarTransactions(caseId, txnId)
      .then((list) => {
        if (!alive) return;
        setSimilar(list);
        // Pre-select all by default — the accountant can uncheck the
        // ones they don't want to include.
        setSelected(new Set(list.map((t) => t.id)));
      })
      .catch((e) => {
        if (!alive) return;
        setError(
          e instanceof ApiError ? e.message : tr("Failed to load similar"),
        );
      });
    return () => {
      alive = false;
    };
  }, [caseId, txnId, tr]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  async function apply() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setApplying(true);
    setError(null);
    try {
      await onApply(ids);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tr("Could not apply"));
    } finally {
      setApplying(false);
    }
  }

  if (error) {
    return (
      <div className="text-[12px]" style={{ color: "var(--bad)" }}>
        {error}
      </div>
    );
  }
  if (similar === null) {
    return (
      <div className="text-[12px]" style={{ color: "var(--text-2)" }}>
        {tr("Loading similar…")}
      </div>
    );
  }
  if (similar.length === 0) {
    return (
      <div className="text-[12px]" style={{ color: "var(--text-2)" }}>
        {tr("No similar transactions found in this case.")}
      </div>
    );
  }

  return (
    <div
      className="fade flex flex-col gap-1.5 mt-1 p-2 w-full"
      style={{ background: "var(--surface-2)" }}
    >
      <div
        className="text-[12px]"
        style={{ color: "var(--text-2)" }}
      >
        {tr("{n} similar transactions — select which to apply this account to:", { n: similar.length })}
      </div>
      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
        {similar.map((t) => (
          <label
            key={t.id}
            className="flex items-center gap-2 text-[12px] cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.has(t.id)}
              onChange={() => toggle(t.id)}
            />
            <span className="mono" style={{ color: "var(--text-2)" }}>
              {t.date.slice(0, 10)}
            </span>
            <span style={{ color: "var(--text)" }}>
              {fmtSAR(t.amount)}
            </span>
            <span
              className="truncate flex-1"
              style={{ color: "var(--text-2)" }}
              title={t.description}
            >
              {t.description.slice(0, 60)}
              {t.description.length > 60 ? "…" : ""}
            </span>
            {t.categoryAccount ? (
              <span
                className="text-[11px] px-1.5 py-0.5"
                style={{
                  color: "var(--good)",
                  border: "1px solid var(--border-soft)",
                }}
              >
                ✓ {t.categoryAccount.code}
              </span>
            ) : null}
          </label>
        ))}
      </div>
      <div className="flex gap-1.5 items-center">
        <button
          disabled={selected.size === 0 || applying}
          onClick={apply}
          className="btn-primary click-scale px-2 py-1 text-[12.5px]"
        >
          {applying
            ? "…"
            : tr("Apply to {n} selected", { n: selected.size })}
        </button>
        <button
          onClick={() => setSelected(new Set())}
          disabled={selected.size === 0}
          className="text-[12px] underline"
          style={{ color: "var(--text-2)" }}
        >
          {tr("Clear")}
        </button>
        <button
          onClick={() =>
            setSelected(new Set(similar.map((t) => t.id)))
          }
          disabled={selected.size === similar.length}
          className="text-[12px] underline"
          style={{ color: "var(--text-2)" }}
        >
          {tr("Select all")}
        </button>
      </div>
    </div>
  );
}
