"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ApiAccount,
  ApiError,
  ApiInvoice,
  ApiException,
  num,
  RuleScope,
  resolveException,
  type ResolveBody,
} from "@/lib/api";
import { fmtSAR } from "@/lib/format";
import {
  generateTrialBalance,
  getAccounts,
  getExceptions,
  getInvoices,
  getTransactions,
} from "@/lib/api";
import { isBlockingExceptionType } from "@/lib/data";
import { Toast } from "@/components/StatusPieces";
import { ConfettiBurst } from "@/components/ConfettiBurst";
import { useLocale } from "@/lib/i18n";
import { Bi } from "@/components/Bi";

function reasonsFor(
  e: ApiException,
  tr: (en: string, vars?: Record<string, string | number>) => string,
): { label: string; color: string }[] {
  switch (e.type) {
    case "UNMATCHED_TRANSACTION":
      return [{ label: tr("Unmatched to any invoice"), color: "var(--bad)" }];
    case "LOW_CONFIDENCE_CATEGORY": {
      const t = e.bankTransaction;
      const conf = t ? Math.round(num(t.categoryConfidence) * 100) : 0;
      return [
        {
          label: t?.categoryAccountId
            ? `${tr("Low-confidence account")} (${conf}%)`
            : tr("No account suggested"),
          color: "var(--warn)",
        },
      ];
    }
    case "UNMATCHED_INVOICE":
      return [
        {
          label: tr("Invoice with no matching bank transaction"),
          color: "var(--warn)",
        },
      ];
    case "POSSIBLE_DUPLICATE":
      return [{ label: tr("Possible duplicate invoice"), color: "var(--bad)" }];
    case "NEEDS_CLIENT_CLARIFICATION":
      return [{ label: tr("Needs client clarification"), color: "var(--warn)" }];
    case "MISSING_SUPPORTING_DOC":
      return [{ label: tr("Missing supporting document"), color: "var(--accent)" }];
    default:
      return [
        {
          label: e.type.replaceAll("_", " ").toLowerCase(),
          color: "var(--warn)",
        },
      ];
  }
}

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

type ScopeChoice = RuleScope | "custom";

export default function ExceptionsPage() {
  const { tr } = useLocale();
  const params = useParams<{ caseId: string }>();
  const router = useRouter();
  const caseId = params.caseId;

  // Keep OPEN and FLAGGED_MISSING_DOC — the latter is still visible to the
  // accountant (it just stops blocking). Drop only RESOLVED.
  const [exceptions, setExceptions] = useState<ApiException[] | null>(null);
  const [totalTx, setTotalTx] = useState(0);
  const [accounts, setAccounts] = useState<ApiAccount[] | null>(null);
  const [invoices, setInvoices] = useState<ApiInvoice[] | null>(null);
  const [picker, setPicker] = useState<{
    exceptionId: string;
    mode: "category" | "match";
  } | null>(null);
  const [pickedAccountId, setPickedAccountId] = useState("");
  const [pickedInvoiceId, setPickedInvoiceId] = useState("");
  const [pickedScope, setPickedScope] = useState<ScopeChoice>("description");
  const [customRuleText, setCustomRuleText] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [celebrated, setCelebrated] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [exs, txs] = await Promise.all([
        getExceptions(caseId),
        getTransactions(caseId),
      ]);
      setExceptions(exs.filter((e) => e.status !== "RESOLVED"));
      setTotalTx(txs.length);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tr("Failed to load exceptions"));
    }
  }, [caseId]);

  useEffect(() => {
    load();
  }, [load]);

  const allRows = exceptions ?? [];

  const blockingLane = allRows.filter(
    (e) => e.status === "OPEN" && isBlockingExceptionType(e.type),
  );
  const informationalLane = allRows.filter(
    (e) =>
      e.status === "FLAGGED_MISSING_DOC" ||
      (e.status === "OPEN" && !isBlockingExceptionType(e.type)),
  );

  const totalOpen = blockingLane.length + informationalLane.length;
  const blockingCount = blockingLane.length;
  const blockingDone = exceptions !== null && blockingCount === 0;

  async function act(id: string, body: ResolveBody, label: string) {
    setBusyId(id);
    setError(null);
    try {
      const updated = await resolveException(caseId, id, body);
      // Update in place so FLAGGED_MISSING_DOC rows stay visible.
      setExceptions((prev) =>
        prev ? prev.map((e) => (e.id === id ? updated : e)) : prev,
      );
      if (blockingCount === 1 && isBlockingExceptionType(updated.type))
        setCelebrated(true);
      setToast(label);
      setPicker(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tr("Action failed"));
    } finally {
      setBusyId(null);
    }
  }

  function openPicker(e: ApiException, mode: "category" | "match") {
    const t = e.bankTransaction ?? null;
    setPicker({ exceptionId: e.id, mode });
    setPickedAccountId("");
    setPickedInvoiceId("");
    setCustomRuleText("");
    setPickedScope(t?.counterparty ? "merchant" : "description");
    if (mode === "category" && !accounts) {
      getAccounts()
        .then(setAccounts)
        .catch(() => setError(tr("Failed to load the chart of accounts")));
    }
    if (mode === "match" && !invoices) {
      getInvoices(caseId)
        .then(setInvoices)
        .catch(() => setError(tr("Failed to load invoices")));
    }
  }

  function applyCategory(e: ApiException) {
    const scope: RuleScope =
      pickedScope === "custom" ? "description" : pickedScope;
    const ruleText =
      pickedScope === "custom" ? customRuleText.trim() : undefined;
    return act(
      e.id,
      {
        action: "manual_category",
        accountId: pickedAccountId,
        ruleScope: scope,
        ruleText,
      },
      tr("Account applied — saved as a reusable firm rule"),
    );
  }

  async function generateAndContinue() {
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
    }
  }

  function renderCard(e: ApiException, i: number) {
    const t = e.bankTransaction;
    const inv = e.invoice;
    const busy = busyId === e.id;
    const needsCategory =
      e.type === "LOW_CONFIDENCE_CATEGORY" && t && !t.categoryAccountId;
    const isClientQuestion = e.type === "NEEDS_CLIENT_CLARIFICATION";
    const isMissingDoc = e.type === "MISSING_SUPPORTING_DOC";
    const isFlagged = e.status === "FLAGGED_MISSING_DOC";
    const rlabel0 = t ? reasonLabel(t.categoryReasonSource) : null;
    const rlabel = rlabel0 ? tr(rlabel0) : null;
    const rcolor = t ? reasonColor(t.categoryReasonSource) : "var(--text-2)";

    return (
      <div
        key={e.id}
        className="rise card-flat p-5 relative overflow-hidden"
        style={{ animationDelay: `${i * 70}ms`, opacity: busy ? 0.5 : 1 }}
      >
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              {reasonsFor(e, tr).map((r, ri) => (
                <span
                  key={ri}
                  className="text-[12px] px-2 py-0.5"
                  style={{ color: r.color, border: `1px solid color-mix(in srgb, ${r.color} 35%, transparent)` }}
                >
                  {r.label}
                </span>
              ))}
              {isFlagged && (
                <span
                  className="text-[12px] px-2 py-0.5"
                  style={{
                    color: "var(--text-2)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {tr("Flagged — still visible")}
                </span>
              )}
            </div>

            {t ? (
              <>
                <div className="text-sm">{t.description}</div>
                {t.counterparty && (
                  <div
                    className="text-[12px] mt-0.5"
                    style={{ color: "var(--text-2)" }}
                  >
                    {tr("Counterparty:")}{" "}
                    <span style={{ color: "var(--text)" }}>
                      {t.counterparty}
                    </span>
                  </div>
                )}
                {t.reference && (
                  <div
                    className="ar text-[12px] mt-0.5"
                    style={{ color: "var(--text-2)" }}
                  >
                    {t.reference}
                  </div>
                )}
                <div
                  className="mono text-[12px] mt-2"
                  style={{ color: "var(--text-2)" }}
                >
                  {t.date.slice(0, 10)} · {t.bankLabel ?? "—"} ·{" "}
                  <span style={{ color: "var(--text)" }}>
                    {fmtSAR(num(t.amount))}
                  </span>
                </div>
                {(t.categoryAccount || num(t.categoryConfidence) > 0) && (
                  <div
                    className="mt-2 text-[12px]"
                    style={{ color: "var(--text-2)" }}
                  >
                    {tr("Suggested:")}{" "}
                    <span style={{ color: "var(--accent)" }}>
                      {t.categoryAccount ? <Bi en={t.categoryAccount.name} ar={t.categoryAccount.nameAr} /> : tr("none")}
                    </span>{" "}
                    ({Math.round(num(t.categoryConfidence) * 100)}%)
                  </div>
                )}
                {t.categoryReason ? (
                  <div
                    className="mt-1 text-[12.5px] italic"
                    style={{ color: rcolor }}
                  >
                    {rlabel ? `[${rlabel}] ` : ""}
                    {t.categoryReason}
                  </div>
                ) : null}
              </>
            ) : inv ? (
              <>
                <div className="text-sm">
                  {tr("Invoice")} {inv.invoiceNumber ?? tr("(unnumbered)")}
                  {inv.counterparty ? ` — ${inv.counterparty}` : ""}
                </div>
                <div
                  className="mono text-[12px] mt-2"
                  style={{ color: "var(--text-2)" }}
                >
                  {inv.date ? inv.date.slice(0, 10) : tr("no date")} ·{" "}
                  <span style={{ color: "var(--text)" }}>
                    {fmtSAR(num(inv.amountTotal))}
                  </span>
                </div>
              </>
            ) : null}

            {e.note && (
              <div
                className="mt-2 text-[12px]"
                style={{ color: "var(--warn)" }}
              >
                {e.note}
              </div>
            )}

            {picker?.exceptionId === e.id && (
              <div className="mt-3 flex flex-col gap-2">
                {picker.mode === "category" ? (
                  <>
                    <select
                      value={pickedAccountId}
                      onChange={(ev) => setPickedAccountId(ev.target.value)}
                      className="field px-2 py-1.5 text-[12px] min-w-[260px]"
                    >
                      <option value="">{tr("Choose an account…")}</option>
                      {(accounts ?? [])
                        .filter((a) => a.postable)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} — {a.name}
                            {a.nameAr ? ` (${a.nameAr})` : ""}
                            {a.requiresSupportingDoc ? tr(" ⚠ needs doc") : ""}
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
                          cursor: t?.counterparty ? "pointer" : "not-allowed",
                          opacity: t?.counterparty ? 1 : 0.45,
                        }}
                      >
                        <input
                          type="radio"
                          disabled={!t?.counterparty}
                          checked={pickedScope === "merchant"}
                          onChange={() => setPickedScope("merchant")}
                        />
                        {tr("All future transactions matching this counterparty")}
                        {t?.counterparty
                          ? ` (${t.counterparty})`
                          : tr(" (no counterparty)")}
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          checked={pickedScope === "description"}
                          onChange={() => setPickedScope("description")}
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
                          onChange={(ev) => setCustomRuleText(ev.target.value)}
                          placeholder={tr("Match text")}
                          className="field px-2 py-1 text-[12.5px]"
                        />
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        disabled={
                          !pickedAccountId ||
                          busy ||
                          (pickedScope === "custom" && !customRuleText.trim())
                        }
                        onClick={() => applyCategory(e)}
                        className="btn-primary click-scale px-3 py-1.5 text-[12px]"
                      >
                        {tr("Apply")}
                      </button>
                      <button
                        onClick={() => setPicker(null)}
                        className="btn-ghost click-scale px-3 py-1.5 text-[12px]"
                      >
                        {tr("Cancel")}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <select
                      value={pickedInvoiceId}
                      onChange={(ev) => setPickedInvoiceId(ev.target.value)}
                      className="field px-2 py-1.5 text-[12px] min-w-[260px]"
                    >
                      <option value="">{tr("Choose an invoice…")}</option>
                      {(invoices ?? []).map((iv) => (
                        <option key={iv.id} value={iv.id}>
                          {iv.invoiceNumber ?? "(no #)"} ·{" "}
                          {iv.counterparty ?? "—"} ·{" "}
                          {fmtSAR(num(iv.amountTotal))}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        disabled={!pickedInvoiceId || busy}
                        onClick={() =>
                          act(
                            e.id,
                            {
                              action: "manual_match",
                              invoiceId: pickedInvoiceId,
                            },
                            tr("Transaction matched to invoice"),
                          )
                        }
                        className="btn-primary click-scale px-3 py-1.5 text-[12px]"
                      >
                        {tr("Match")}
                      </button>
                      <button
                        onClick={() => setPicker(null)}
                        className="btn-ghost click-scale px-3 py-1.5 text-[12px]"
                      >
                        {tr("Cancel")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            {needsCategory ? (
              <button
                onClick={() => openPicker(e, "category")}
                disabled={busy}
                className="btn-primary click-scale px-3.5 py-1.5 text-[12px]"
              >
                {tr("Choose account")}
              </button>
            ) : (
              <button
                onClick={() =>
                  act(
                    e.id,
                    { action: "approve" },
                    isClientQuestion
                      ? tr("Accepted into suspense — ask the client from the Clarifications page")
                      : isMissingDoc
                        ? tr("Accepted without supporting document")
                        : e.type === "POSSIBLE_DUPLICATE"
                          ? tr("Duplicate reviewed & accepted")
                          : tr("Approved"),
                  )
                }
                disabled={busy}
                className="btn-primary click-scale px-3.5 py-1.5 text-[12px]"
              >
                {isClientQuestion ? tr("Accept & ask client") : tr("Approve")}
              </button>
            )}
            {t && (
              <>
                <button
                  onClick={() => openPicker(e, "category")}
                  disabled={busy}
                  className="btn-ghost click-scale px-3.5 py-1.5 text-[12px]"
                >
                  {tr("Change account")}
                </button>
                <button
                  onClick={() => openPicker(e, "match")}
                  disabled={busy}
                  className="btn-ghost click-scale px-3.5 py-1.5 text-[12px]"
                >
                  {tr("Match to invoice")}
                </button>
              </>
            )}
            {isMissingDoc && e.status === "OPEN" && (
              <button
                onClick={() =>
                  act(
                    e.id,
                    { action: "flag_missing_doc" },
                    tr("Flagged — row stays visible, no longer blocks the TB"),
                  )
                }
                disabled={busy}
                className="text-[12.5px] text-start"
                style={{ color: "var(--text-2)" }}
              >
                {tr("Flag missing doc")}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 md:p-10 max-w-4xl page-enter relative">
      <div className="rise flex items-end justify-between mb-2">
        <div>
          <h1 className="display text-[32px]">{tr("Exception review")}</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-2)" }}>
            {tr("Only what needs your judgment —")} {Math.max(0, totalTx - totalOpen)}{" "}
            {tr("clean transactions are already handled. Informational rows do not block the Trial Balance.")}
          </p>
        </div>
        <span
          className="mono text-[13px]"
          style={{
            color:
              blockingCount === 0 && totalOpen === 0
                ? "var(--good)"
                : blockingCount === 0
                  ? "var(--accent)"
                  : "var(--warn)",
          }}
        >
          {exceptions === null
            ? "…"
            : `${blockingCount} ${tr("blocking")} · ${informationalLane.length} ${tr("info")}`}
        </span>
      </div>

      {error && (
        <div
          className="text-[12px] px-3 py-2 mt-4"
          style={{ color: "var(--bad)", border: "1px solid var(--bad-line)" }}
        >
          {error}
        </div>
      )}

      {/* ── Blocking lane ─────────────────────────────────────────── */}
      <div className="mt-6 mb-2 flex items-baseline gap-2">
        <span
          className="text-[12.5px] "
          style={{ color: "var(--warn)" }}
        >
          {tr("Blocking")}
        </span>
        <span className="ar ar-secondary text-[12px]" style={{ color: "var(--text-2)" }}>
          المانعة
        </span>
        <span className="text-[12.5px]" style={{ color: "var(--text-2)" }}>
          {tr("— must be resolved before the Trial Balance can be generated")}
        </span>
      </div>
      <div className="space-y-3">
        {blockingLane.map((e, i) => renderCard(e, i))}
        {blockingLane.length === 0 && exceptions !== null && (
          <div
            className="card-flat p-4 text-[12px]"
            style={{ color: "var(--good)" }}
          >
            {tr("✓ No blocking exceptions.")}
          </div>
        )}
      </div>

      {/* ── Informational lane ────────────────────────────────────── */}
      <div className="mt-8 mb-2 flex items-baseline gap-2">
        <span
          className="text-[12.5px] "
          style={{ color: "var(--accent)" }}
        >
          {tr("Informational")}
        </span>
        <span className="ar ar-secondary text-[12px]" style={{ color: "var(--text-2)" }}>
          إعلامية
        </span>
        <span className="text-[12.5px]" style={{ color: "var(--text-2)" }}>
          {tr("— does not block the Trial Balance")}
        </span>
      </div>
      <div className="space-y-3">
        {informationalLane.map((e, i) => renderCard(e, i))}
        {informationalLane.length === 0 && exceptions !== null && (
          <div
            className="card-flat p-4 text-[12px]"
            style={{ color: "var(--text-2)" }}
          >
            {tr("No informational notes.")}
          </div>
        )}
      </div>

      {exceptions === null && !error && (
        <div className="text-[13px] mt-6" style={{ color: "var(--text-2)" }}>
          {tr("Loading exceptions…")}
        </div>
      )}

      <div className="mt-8 flex items-center gap-4 relative">
        {celebrated && <ConfettiBurst />}
        <button
          disabled={!blockingDone}
          onClick={() => setConfirming(true)}
          className="btn-primary click-scale px-5 py-2.5 text-sm"
        >
          {blockingDone
            ? tr("Generate trial balance & continue")
            : tr("Resolve {n} blocking more to continue", { n: blockingCount })}
        </button>
        {blockingDone && (
          <span className="text-[12px]" style={{ color: "var(--good)" }}>
            {informationalLane.length > 0
              ? informationalLane.length === 1
                ? tr("Blocking lane cleared — 1 informational note remains (non-blocking).")
                : tr("Blocking lane cleared — {n} informational notes remain (non-blocking).", { n: informationalLane.length })
              : tr("All exceptions cleared")}
          </span>
        )}
      </div>

      {confirming && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center fade"
          style={{ background: "var(--scrim)" }}
          onClick={() => setConfirming(false)}
        >
          <div
            className="rise card-flat p-6 w-[380px]"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h3 className="display text-[17px] mb-2">
              {tr("Lock this batch of exceptions?")}
            </h3>
            <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
              {tr("Your approvals will be saved as reusable rules for this firm's future cases, then the Trial Balance will be generated deterministically.")}
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => {
                  setConfirming(false);
                  generateAndContinue();
                }}
                className="btn-primary click-scale flex-1 py-2 text-sm"
              >
                {tr("Confirm & continue")}
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="btn-ghost click-scale flex-1 py-2 text-sm"
              >
                {tr("Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
