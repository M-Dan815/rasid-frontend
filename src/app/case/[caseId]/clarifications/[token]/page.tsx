"use client";

import { Logo } from "@/components/Logo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Toast } from "@/components/StatusPieces";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ApiError,
  PublicClarificationsResponse,
  answerPublicClarification,
  getPublicClarifications,
} from "@/lib/api";
import { fmtSAR } from "@/lib/format";
import { useLocale } from "@/lib/i18n";

/**
 * PUBLIC client-facing portal — no auth, no Shell, no useAuthGuard.
 * The accountant sends the link from the Clarifications page; the client
 * opens it, reads each question with its transaction, and answers.
 *
 * The endpoint only exposes this case's OPEN clarifications and basic
 * identifying metadata (client name, period). Nothing else.
 *
 * ─── AI HYPOTHESIS BLOCK ──────────────────────────────────────────────
 * Each clarification MAY carry an AI-proposed account + reason (see
 * backend: patternDetector.ts + ai-provider.ts → suggestClarificationQuestion
 * + processing.service.ts → raiseExceptions). When present, this page
 * renders a teal-tinted callout above the answer box, and a "Yes, that's
 * right" button (btn-accent) alongside the existing free-text "Send answer"
 * path. Clicking "Yes" submits with confirmHypothesis=true; the backend
 * applies the proposed account to the underlying transaction AND every
 * other unresolved payment to the same payee in one click
 * (see classification/learning.ts → propagateToPayeeSiblings).
 */
export default function PublicClarificationsPage() {
  const { tr } = useLocale();
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [data, setData] = useState<PublicClarificationsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answered, setAnswered] = useState<Set<string>>(new Set());
  const [settled, setSettled] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getPublicClarifications(token)
      .then((d) => alive && setData(d))
      .catch((e) => {
        if (!alive) return;
        setError(
          e instanceof ApiError
            ? e.message
            : tr("This link is invalid or has expired."),
        );
      });
    return () => {
      alive = false;
    };
  }, [token]);

  async function submit(id: string, confirmHypothesis = false) {
    // When confirming the hypothesis with an empty answer box, pre-fill a
    // short confirmation so the backend's `answer: z.string().min(1)`
    // validation passes and the audit trail records what the client meant.
    const typed = (answers[id] ?? "").trim();
    const answer =
      typed || (confirmHypothesis ? tr("Yes, this is correct") : "");
    if (!answer) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await answerPublicClarification(
        token,
        id,
        answer,
        confirmHypothesis || undefined,
      );
      setAnswered((prev) => new Set(prev).add(id));
      if (res.groupSettled) {
        setSettled((prev) => new Set(prev).add(id));
        setToast(
          tr("✓ Group settled — every transaction to this payee has been categorized."),
        );
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tr("Could not send answer"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      className="min-h-screen py-10 px-4"
      style={{ background: "var(--canvas)" }}
    >
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="mb-3 flex items-center justify-between"><Logo variant="primary" height={40} /><span className="flex items-center gap-2"><ThemeToggle /><LanguageToggle /></span></div>
          {data ? (
            <>
              <div
                className="text-[12px]"
                style={{ color: "var(--text-2)" }}
              >
                {data.case.firmName}
                {data.case.firmNameAr ? ` — ${data.case.firmNameAr}` : ""}
              </div>
              <h1 className="display text-[22px] mt-1">
                {data.case.clientName}
                {data.case.clientNameAr ? ` — ${data.case.clientNameAr}` : ""}
              </h1>
              <div
                className="text-[12px] mt-1"
                style={{ color: "var(--text-2)" }}
              >
                {data.case.label} ·{" "}
                {new Date(data.case.periodStart).toLocaleDateString()} <span className="rtl-flip">→</span>{" "}
                {new Date(data.case.periodEnd).toLocaleDateString()}
              </div>
            </>
          ) : null}
        </div>

        {error && (
          <div
            className="card-flat p-5 mb-6 text-[13px]"
            style={{ color: "var(--bad)" }}
          >
            {error}
          </div>
        )}

        {!data && !error && (
          <div
            className="card-flat p-6 text-center text-[13px]"
            style={{ color: "var(--text-2)" }}
          >
            {tr("Loading…")}
          </div>
        )}

        {data && data.clarifications.length === 0 && (
          <div
            className="card-flat p-6 text-center text-[13px]"
            style={{ color: "var(--text-2)" }}
          >
            {tr("No open questions on this case right now. You'll be notified if anything needs your input.")}
          </div>
        )}

        <div className="space-y-4">
          {data?.clarifications.map((c) => {
            const isAnswered = answered.has(c.id);
            const isSettled = settled.has(c.id);
            const isBusy = busyId === c.id;
            const hasHypothesis = !!c.hypothesis;
            return (
              <div key={c.id} className="card-flat p-5">
                {c.transaction ? (
                  <>
                    <div className="text-sm">{c.transaction.description}</div>
                    {c.transaction.reference && (
                      <div
                        className="ar text-[12px] mt-0.5"
                        style={{ color: "var(--text-2)" }}
                      >
                        {c.transaction.reference}
                      </div>
                    )}
                    <div
                      className="mono text-[12px] mt-2"
                      style={{ color: "var(--text-2)" }}
                    >
                      {c.transaction.date.slice(0, 10)} ·{" "}
                      <span style={{ color: "var(--text)" }}>
                        {fmtSAR(c.transaction.amount)}
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
                  className="text-[12px] italic mt-0.5"
                  style={{ color: "var(--text-2)" }}
                >
                  {c.question}
                </div>

                {/* AI hypothesis callout — only rendered when the backend
                    attached a proposed account + reason. The "Yes, that's
                    right" button below submits with confirmHypothesis=true
                    and the backend settles every sibling payment to the
                    same payee (one-click group assignment). */}
                {hasHypothesis && c.hypothesis ? (
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
                        {c.hypothesis.proposedAccount.code}
                      </span>
                      <span style={{ color: "var(--text)" }}>
                        — {c.hypothesis.proposedAccount.nameAr ?? c.hypothesis.proposedAccount.name}
                      </span>
                    </div>
                    <div
                      className="mt-1 text-[12px]"
                      style={{ color: "var(--text-2)" }}
                    >
                      {c.hypothesis.reason}
                    </div>
                    {c.hypothesis.detectedPattern?.summary ? (
                      <div
                        className="mt-1.5 text-[11.5px] italic"
                        style={{ color: "var(--text-3)" }}
                      >
                        {c.hypothesis.detectedPattern.summary}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {isAnswered ? (
                  <div
                    className="mt-3 text-[12px]"
                    style={{ color: "var(--good)" }}
                  >
                    {isSettled
                      ? tr("✓ Thank you — the group has been categorized. Every transaction to this payee is now posted to {account}.", {
                          account:
                            c.hypothesis?.proposedAccount.code ?? tr("the suggested account"),
                        })
                      : tr("✓ Thank you — your answer has been recorded.")}
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={answers[c.id] ?? ""}
                      onChange={(e) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [c.id]: e.target.value,
                        }))
                      }
                      rows={2}
                      placeholder={tr("Your answer…")}
                      className="field w-full px-3 py-2 text-[12px]"
                    />
                    <div className="flex gap-2 flex-wrap">
                      {hasHypothesis ? (
                        <button
                          disabled={isBusy}
                          onClick={() => submit(c.id, true)}
                          className="btn-accent click-scale px-4 py-2 text-[12px]"
                        >
                          {isBusy ? tr("Sending…") : tr("Yes, that's right")}
                        </button>
                      ) : null}
                      <button
                        disabled={isBusy || !(answers[c.id] ?? "").trim()}
                        onClick={() => submit(c.id)}
                        className="btn-primary click-scale px-4 py-2 text-[12px]"
                      >
                        {isBusy ? tr("Sending…") : tr("Send answer")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div
          className="mt-10 text-center text-[12.5px]"
          style={{ color: "var(--text-2)" }}
        >
          {tr("Generated by AccountTech — the firm you work with uses it to prepare your accounting. Nothing you see here is shared with anyone else.")}
        </div>
      </div>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
