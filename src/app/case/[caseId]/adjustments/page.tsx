"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Adjustment,
  ApiAccount,
  ApiError,
  confirmAdjustments,
  createAdjustment,
  deleteAdjustment,
  getAccounts,
  listAdjustments,
  unconfirmAdjustments,
} from "@/lib/api";
import { fmtSAR } from "@/lib/format";
import { Toast } from "@/components/StatusPieces";
import { useLocale } from "@/lib/i18n";

/**
 * Manual adjustments / accruals — the MVP fallback for non-bank items
 * (depreciation, prepaid expenses, accrued liabilities). Every entry is a
 * debit/credit pair that shares an adjustmentGroupId on the backend.
 *
 * Regenerating the Trial Balance from the reconciliation screen does not
 * wipe these — only bank-derived lines are regenerated.
 */
export default function AdjustmentsPage() {
  const { tr } = useLocale();
  const params = useParams<{ caseId: string }>();
  const caseId = params.caseId;

  const [adjustments, setAdjustments] = useState<Adjustment[] | null>(null);
  const [accounts, setAccounts] = useState<ApiAccount[] | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [debitAccountId, setDebitAccountId] = useState("");
  const [creditAccountId, setCreditAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");

  const load = useCallback(async () => {
    try {
      const [list, accs] = await Promise.all([
        listAdjustments(caseId),
        getAccounts(),
      ]);
      setAdjustments(list);
      setAccounts(accs);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : tr("Failed to load adjustments"),
      );
    }
  }, [caseId]);

  useEffect(() => {
    load();
  }, [load]);

  const postableAccounts = useMemo(
    () => (accounts ?? []).filter((a) => a.postable),
    [accounts],
  );

  async function add() {
    setBusy(true);
    setError(null);
    try {
      const amountNum = Number(amount);
      if (!Number.isFinite(amountNum) || amountNum <= 0) {
        throw new ApiError(0, tr("Amount must be greater than zero"));
      }
      if (debitAccountId === creditAccountId) {
        throw new ApiError(0, tr("Debit and credit accounts must be different"));
      }
      await createAdjustment(caseId, {
        date,
        debitAccountId,
        creditAccountId,
        amount: amountNum,
        memo: memo || undefined,
      });
      setToast(tr("Adjustment posted"));
      setDebitAccountId("");
      setCreditAccountId("");
      setAmount("");
      setMemo("");
      await load();
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : tr("Failed to create adjustment"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    try {
      await deleteAdjustment(caseId, id);
      setToast(tr("Adjustment removed"));
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tr("Delete failed"));
    } finally {
      setBusy(false);
    }
  }

  async function doConfirm() {
    setBusy(true);
    setError(null);
    try {
      await confirmAdjustments(caseId);
      setConfirmed(true);
      setToast(tr("Adjustments confirmed"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tr("Confirm failed"));
    } finally {
      setBusy(false);
    }
  }

  async function doUnconfirm() {
    setBusy(true);
    setError(null);
    try {
      await unconfirmAdjustments(caseId);
      setConfirmed(false);
      setToast(tr("Unconfirmed — new entries will need re-confirmation"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tr("Unconfirm failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-8 md:p-10 max-w-4xl page-enter">
      <div className="rise flex items-end justify-between mb-6">
        <div>
          <h1 className="display text-[32px]">
            {tr("Adjustments & accruals")}{" "}
            <span
              className="ar ar-secondary text-[16px]"
              style={{ color: "var(--text-2)" }}
            >
              التسويات والمستحقات
            </span>
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-2)" }}>
            {tr("Non-bank items the accountant enters manually — depreciation, accrued liabilities, prepaids. Each is a debit/credit pair posted alongside the bank-derived entries.")}
          </p>
        </div>
        {confirmed ? (
          <span
            className="stamp text-[12.5px] px-3 py-1.5"
            style={{ color: "var(--good)" }}
          >
            {tr("CONFIRMED")}
          </span>
        ) : (
          <span
            className="stamp text-[12.5px] px-3 py-1.5"
            style={{ color: "var(--warn)" }}
          >
            {tr("NOT CONFIRMED")}
          </span>
        )}
      </div>

      {error && (
        <div
          className="text-[12px] px-3 py-2 mb-4"
          style={{ color: "var(--bad)", border: "1px solid var(--bad-line)" }}
        >
          {error}
        </div>
      )}

      <div className="card-flat p-5 mb-6 rise">
        <div className="text-[13px] mb-3">{tr("New adjustment")}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="field px-3 py-2 text-[12px]"
          />
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={tr("Amount (SAR)")}
            className="field px-3 py-2 text-[12px]"
          />
          <select
            value={debitAccountId}
            onChange={(e) => setDebitAccountId(e.target.value)}
            className="field px-3 py-2 text-[12px]"
          >
            <option value="">{tr("Debit account…")}</option>
            {postableAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name}
                {a.nameAr ? ` (${a.nameAr})` : ""}
              </option>
            ))}
          </select>
          <select
            value={creditAccountId}
            onChange={(e) => setCreditAccountId(e.target.value)}
            className="field px-3 py-2 text-[12px]"
          >
            <option value="">{tr("Credit account…")}</option>
            {postableAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name}
                {a.nameAr ? ` (${a.nameAr})` : ""}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder={tr("Memo (e.g. Depreciation — Dec)")}
            className="field px-3 py-2 text-[12px] md:col-span-2"
          />
        </div>
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={add}
            disabled={
              busy || !debitAccountId || !creditAccountId || !amount.trim()
            }
            className="btn-primary click-scale px-4 py-2 text-[12px]"
          >
            {busy ? tr("Posting…") : tr("Post adjustment")}
          </button>
        </div>
      </div>

      {adjustments === null && !error && (
        <div className="text-[13px]" style={{ color: "var(--text-2)" }}>
          {tr("Loading adjustments…")}
        </div>
      )}

      {adjustments !== null && adjustments.length === 0 && (
        <div
          className="card-flat p-6 text-center text-[13px]"
          style={{ color: "var(--text-2)" }}
        >
          {tr("No adjustments yet. Post one above if this case needs depreciation, accruals, or other non-bank entries.")}
        </div>
      )}

      {adjustments !== null && adjustments.length > 0 && (
        <div className="card-flat overflow-x-auto rise">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {[tr("Date"), tr("Memo"), tr("Debit"), tr("Credit"), tr("Amount"), ""].map((h) => (
                  <th
                    key={h}
                    className="text-start px-4 py-3 text-[12.5px] font-normal"
                    style={{ color: "var(--text-2)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {adjustments.map((a) => (
                <tr
                  key={a.adjustmentGroupId}
                  className="row-hover align-top"
                  style={{ borderBottom: "1px solid var(--border-soft)" }}
                >
                  <td
                    className="px-4 py-3 mono"
                    style={{ color: "var(--text-2)" }}
                  >
                    {a.date.slice(0, 10)}
                  </td>
                  <td className="px-4 py-3">{a.memo ?? "—"}</td>
                  <td className="px-4 py-3 text-[12px]">
                    <div>{a.debit.name}</div>
                    <div
                      className="mono text-[12.5px]"
                      style={{ color: "var(--text-2)" }}
                    >
                      {a.debit.code}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12px]">
                    <div>{a.credit.name}</div>
                    <div
                      className="mono text-[12.5px]"
                      style={{ color: "var(--text-2)" }}
                    >
                      {a.credit.code}
                    </div>
                  </td>
                  <td className="px-4 py-3 mono text-end">
                    {fmtSAR(a.debit.amount)}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <button
                      onClick={() => remove(a.adjustmentGroupId)}
                      disabled={busy}
                      className="text-[12.5px]"
                      style={{ color: "var(--bad)" }}
                    >
                      {tr("Delete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adjustments !== null && adjustments.length > 0 && (
        <div className="mt-5 flex items-center gap-3">
          {!confirmed ? (
            <button
              onClick={doConfirm}
              disabled={busy}
              className="btn-primary click-scale px-4 py-2 text-[12px]"
            >
              {tr("Confirm adjustments")}
            </button>
          ) : (
            <button
              onClick={doUnconfirm}
              disabled={busy}
              className="btn-ghost click-scale px-4 py-2 text-[12px]"
            >
              {tr("Unconfirm to edit")}
            </button>
          )}
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
