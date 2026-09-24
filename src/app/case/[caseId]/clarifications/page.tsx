"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import {
  ApiAccount,
  ApiError,
  Clarification,
  ClarificationsBundle,
  answerClarification,
  getAccounts,
  getClarifications,
  requestClientClarificationLink,
  revokeClientClarificationLink,
} from "@/lib/api";
import { fmtSAR } from "@/lib/format";
import { Toast } from "@/components/StatusPieces";
import { num } from "@/lib/api";
import { useLocale } from "@/lib/i18n";

/**
 * The "ask the client" lane. Distinct from the accountant exception queue:
 * these questions cannot be resolved by the accountant alone — the client
 * has to explain what a transaction was. The case does NOT block on these;
 * the readiness checklist counts them but everything else keeps flowing.
 *
 * Two ways to answer:
 *   - Inline here, by the accountant (e.g. they called the client).
 *   - Share the public link (see /public/clarifications/[token]) and let
 *     the client answer directly. The answeredBy tag on the backend is
 *     "client:portal" in that case.
 */
export default function ClarificationsPage() {
  const { tr } = useLocale();
  const params = useParams<{ caseId: string }>();
  const caseId = params.caseId;

  const [data, setData] = useState<ClarificationsBundle | null>(null);
  const [accounts, setAccounts] = useState<ApiAccount[] | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareExpiry, setShareExpiry] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [answerAccountId, setAnswerAccountId] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await getClarifications(caseId));
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : tr("Failed to load clarifications"),
      );
    }
  }, [caseId]);

  useEffect(() => {
    load();
  }, [load]);

  async function ensureAccounts() {
    if (accounts) return;
    try {
      setAccounts(await getAccounts());
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : tr("Failed to load chart of accounts"),
      );
    }
  }

  function startAnswer(c: Clarification) {
    setAnsweringId(c.id);
    setAnswerText("");
    // Pre-fill the account dropdown with the AI's proposed account (if any)
    // so the accountant can confirm with one click — they can still pick a
    // different account if they disagree. Matches the one-click behaviour
    // of the client portal's "Yes, that's right" button.
    setAnswerAccountId(c.proposedAccount?.id ?? "");
    ensureAccounts();
  }

  async function submitAnswer(c: Clarification) {
    if (!answerText.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await answerClarification(caseId, c.id, {
        answer: answerText.trim(),
        proposedAccountId: answerAccountId || undefined,
      });
      setToast(tr("Clarification answered"));
      setAnsweringId(null);
      setAnswerText("");
      setAnswerAccountId("");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tr("Failed to record answer"));
    } finally {
      setBusy(false);
    }
  }

  async function generateShare() {
    setBusy(true);
    setError(null);
    try {
      const { token, expiresAt } = await requestClientClarificationLink(caseId);
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      setShareLink(`${origin}/public/clarifications/${token}`);
      setShareExpiry(expiresAt);
      setToast(tr("Share link generated — send it to the client"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tr("Failed to generate link"));
    } finally {
      setBusy(false);
    }
  }

  async function revokeShare() {
    setBusy(true);
    setError(null);
    try {
      await revokeClientClarificationLink(caseId);
      setShareLink(null);
      setShareExpiry(null);
      setToast(tr("Share link revoked"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tr("Failed to revoke link"));
    } finally {
      setBusy(false);
    }
  }

  const open = data?.open ?? [];
  const answered = data?.answered ?? [];

  return (
    <div className="p-8 md:p-10 max-w-4xl page-enter">
      <div className="rise flex items-end justify-between mb-2">
        <div>
          <h1 className="display text-[32px]">
            {tr("Client clarifications")}{" "}
            <span
              className="ar ar-secondary text-[16px]"
              style={{ color: "var(--text-2)" }}
            >
              طلب توضيح من العميل
            </span>
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-2)" }}>
            {tr("Transactions the system could not infer — no rule matched and the AI couldn't confidently classify. Only the client can explain these.")}
          </p>
        </div>
        <span
          className="mono text-[13px]"
          style={{ color: open.length ? "var(--warn)" : "var(--good)" }}
        >
          {data === null ? "…" : tr("{n} open", { n: open.length })}
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

      {/* Share link panel */}
      <div className="card-flat p-5 my-6 rise">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[13px] mb-1">{tr("Client share link")}</div>
            <div className="text-[12.5px]" style={{ color: "var(--text-2)" }}>
              {tr("Generate a single-purpose link the client can open without an account. It exposes only this case's open clarifications. Rotating invalidates the previous link.")}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={generateShare}
              disabled={busy}
              className="btn-primary click-scale px-4 py-2 text-[12px]"
            >
              {shareLink ? tr("Rotate link") : tr("Generate link")}
            </button>
            {shareLink && (
              <button
                onClick={revokeShare}
                disabled={busy}
                className="btn-ghost click-scale px-4 py-2 text-[12px]"
              >
                {tr("Revoke")}
              </button>
            )}
          </div>
        </div>
        {shareLink && (
          <div
            className="mt-3 p-3 text-[12.5px] break-all"
            style={{ background: "var(--surface-2)" }}
          >
            <div className="mono" style={{ color: "var(--text)" }}>
              {shareLink}
            </div>
            {shareExpiry && (
              <div className="mt-1" style={{ color: "var(--text-2)" }}>
                {tr("Expires")} {new Date(shareExpiry).toLocaleString()}
              </div>
            )}
            <button
              onClick={() => {
                if (shareLink) {
                  void navigator.clipboard.writeText(shareLink);
                  setToast(tr("Link copied to clipboard"));
                }
              }}
              className="mt-2 underline decoration-dotted text-[12.5px]"
              style={{ color: "var(--accent)" }}
            >
              {tr("copy to clipboard")}
            </button>
          </div>
        )}
      </div>

      {open.length > 0 && (
        <div
          className="mb-2 text-[12.5px] "
          style={{ color: "var(--text-2)" }}
        >
          {tr("Open questions")}
        </div>
      )}

      <div className="space-y-3">
        {open.map((c) => {
          const t = c.bankTransaction;
          const answering = answeringId === c.id;
          return (
            <div key={c.id} className="card-flat p-5 rise">
              {t ? (
                <>
                  <div className="text-sm">{t.description}</div>
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
                    {t.date.slice(0, 10)} ·{" "}
                    <span style={{ color: "var(--text)" }}>
                      {fmtSAR(num(t.amount))}
                    </span>
                  </div>
                </>
              ) : null}
              <div
                className="mt-3 text-[13px]"
                style={{ color: "var(--accent)" }}
              >
                {c.questionAr ?? c.question}
              </div>
              <div
                className="mt-1 text-[12px] italic"
                style={{ color: "var(--text-2)" }}
              >
                {c.question}
              </div>

              {/* AI hypothesis callout — same teal-tinted style as the
                  client portal's, so the accountant can see what the AI
                  suggested before deciding whether to confirm inline. */}
              {c.proposedAccount && c.hypothesisReason ? (
                <div
                  className="mt-3 p-3 rise"
                  style={{
                    background: "var(--teal-tint)",
                    border: "1px solid var(--border-soft)",
                    borderRadius: "var(--radius-control)",
                  }}
                >
                  <div
                    className="flex items-center gap-1.5 text-[11px] font-semibold uppercase"
                    style={{ color: "var(--accent)", letterSpacing: "0.04em" }}
                  >
                    <Sparkles size={13} strokeWidth={2.5} aria-hidden />
                    {tr("AI suggests")}
                  </div>
                  <div className="mt-1.5 text-[13px] flex items-baseline gap-1.5">
                    <span
                      className="mono font-semibold"
                      style={{ color: "var(--accent)" }}
                    >
                      {c.proposedAccount.code}
                    </span>
                    <span style={{ color: "var(--text)" }}>
                      — {c.proposedAccount.nameAr ?? c.proposedAccount.name}
                    </span>
                  </div>
                  <div
                    className="mt-1 text-[12px]"
                    style={{ color: "var(--text-2)" }}
                  >
                    {c.hypothesisReason}
                  </div>
                  {c.detectedPattern?.summary ? (
                    <div
                      className="mt-1.5 text-[11.5px] italic"
                      style={{ color: "var(--text-3)" }}
                    >
                      {c.detectedPattern.summary}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {!answering ? (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => startAnswer(c)}
                    disabled={busy}
                    className="btn-primary click-scale px-3 py-1.5 text-[12px]"
                  >
                    {tr("Answer inline")}
                  </button>
                </div>
              ) : (
                <div className="mt-3 space-y-2 fade">
                  <textarea
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    rows={2}
                    placeholder={tr("What was this transaction for?")}
                    className="field w-full px-3 py-2 text-[12px]"
                  />
                  <select
                    value={answerAccountId}
                    onChange={(e) => setAnswerAccountId(e.target.value)}
                    className="field w-full px-3 py-2 text-[12px]"
                  >
                    <option value="">
                      {tr("(optional) apply an account with this answer…")}
                    </option>
                    {(accounts ?? [])
                      .filter((a) => a.postable)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} — {a.name}
                          {a.nameAr ? ` (${a.nameAr})` : ""}
                        </option>
                      ))}
                  </select>
                  {/* Inline hint explaining what happens with vs without an
                      account selected — the previous UX was silent about
                      this, and the accountant couldn't tell whether their
                      answer would un-block the trial balance or not. */}
                  <div
                    className="text-[11.5px] italic"
                    style={{ color: "var(--text-3)" }}
                  >
                    {answerAccountId
                      ? tr("This account will be applied to every unresolved payment to the same payee — one answer settles the whole group.")
                      : tr("Without an account, the answer is recorded but the transaction stays unclassified. You'll need to categorize it on the Reconciliation page afterwards.")}
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={busy || !answerText.trim()}
                      onClick={() => submitAnswer(c)}
                      className="btn-primary click-scale px-3 py-1.5 text-[12px]"
                    >
                      {tr("Save answer")}
                    </button>
                    <button
                      onClick={() => setAnsweringId(null)}
                      className="btn-ghost click-scale px-3 py-1.5 text-[12px]"
                    >
                      {tr("Cancel")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {answered.length > 0 && (
        <>
          <div
            className="mt-8 mb-2 text-[12.5px] "
            style={{ color: "var(--text-2)" }}
          >
            {tr("Answered")}
          </div>
          <div className="space-y-2">
            {answered.map((c) => {
              const t = c.bankTransaction;
              return (
                <div key={c.id} className="card-flat p-4">
                  {t ? (
                    <div className="text-[12px]">
                      {t.description.slice(0, 80)}
                      {t.description.length > 80 ? "…" : ""}
                    </div>
                  ) : null}
                  <div
                    className="text-[12.5px] mt-1"
                    style={{ color: "var(--text-2)" }}
                  >
                    {tr("Q:")} {c.question}
                  </div>
                  <div
                    className="text-[12px] mt-1"
                    style={{ color: "var(--good)" }}
                  >
                    {tr("A:")} {c.answer}
                  </div>
                  {c.answeredBy && (
                    <div
                      className="text-[12px] mt-1"
                      style={{ color: "var(--text-2)" }}
                    >
                      {tr("by")} {c.answeredBy}
                      {c.answeredAt
                        ? ` — ${new Date(c.answeredAt).toLocaleString()}`
                        : ""}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {data !== null && open.length === 0 && answered.length === 0 && (
        <div
          className="card-flat p-6 text-center text-[13px]"
          style={{ color: "var(--text-2)" }}
        >
          {tr("No clarifications yet. When a transaction can't be inferred, it will appear here automatically after running the pipeline.")}
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
