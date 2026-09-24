"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  ApiError,
  OpeningBalanceAccount,
  OpeningBalancesBundle,
  OpeningBalanceImportPreview,
  confirmOpeningBalances,
  getOpeningBalances,
  importOpeningBalances,
  patchOpeningBalance,
  unconfirmOpeningBalances,
} from "@/lib/api";
import { fmtSAR } from "@/lib/format";
import { Toast } from "@/components/StatusPieces";
import { useLocale } from "@/lib/i18n";
import { Bi } from "@/components/Bi";

/**
 * Opening balances — import from a prior Trial Balance or set one account
 * at a time. Backs the client's "we shouldn't expect an accountant to hand-
 * enter 98 accounts" requirement.
 *
 * Nothing here touches the ledger. It only populates Account.openingBalance
 * and flips Case.openingBalancesConfirmed, which the readiness checklist
 * reads. Importing invalidates any prior confirmation (backend enforces),
 * so re-confirming after a new import is required.
 */
export default function OpeningBalancesPage() {
  const { tr } = useLocale();
  const params = useParams<{ caseId: string }>();
  const caseId = params.caseId;

  const [data, setData] = useState<OpeningBalancesBundle | null>(null);
  const [preview, setPreview] = useState<OpeningBalanceImportPreview | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setData(await getOpeningBalances(caseId));
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : tr("Failed to load opening balances"),
      );
    }
  }, [caseId]);

  useEffect(() => {
    load();
  }, [load]);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const p = await importOpeningBalances(caseId, file);
      setPreview(p);
      setToast(
        tr("Imported {n} balances — review below and confirm.", { n: p.matched.length }),
      );
      await load();
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : tr("Opening balance import failed"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function editOne(accountId: string, current: number) {
    const next = window.prompt(tr("New opening balance (SAR)"), String(current));
    if (next === null) return;
    const val = Number(next);
    if (!Number.isFinite(val)) {
      setError(tr("Not a number"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await patchOpeningBalance(caseId, accountId, val);
      setToast(tr("Opening balance updated"));
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tr("Update failed"));
    } finally {
      setBusy(false);
    }
  }

  async function doConfirm() {
    setBusy(true);
    setError(null);
    try {
      await confirmOpeningBalances(caseId);
      setToast(tr("Opening balances confirmed"));
      await load();
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
      await unconfirmOpeningBalances(caseId);
      setToast(tr("Opening balances unconfirmed — edit and re-confirm."));
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tr("Unconfirm failed"));
    } finally {
      setBusy(false);
    }
  }

  const filtered = (data?.accounts ?? []).filter((a) => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return (
      a.code.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      (a.nameAr ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-8 md:p-10 max-w-4xl page-enter">
      <div className="rise flex items-end justify-between mb-6">
        <div>
          <h1 className="display text-[32px]">
            {tr("Opening balances")}{" "}
            <span
              className="ar ar-secondary text-[16px]"
              style={{ color: "var(--text-2)" }}
            >
              الأرصدة الافتتاحية
            </span>
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-2)" }}>
            {tr("Import a prior Trial Balance or set individual accounts. Feeds the readiness checklist that gates TB approval.")}
          </p>
        </div>
        {data && (
          <span
            className="stamp text-[12.5px] px-3 py-1.5"
            style={{
              color: data.confirmed ? "var(--good)" : "var(--warn)",
            }}
          >
            {data.confirmed ? tr("CONFIRMED") : tr("NOT CONFIRMED")}
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
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[13px] mb-1">
              {tr("Import from prior Trial Balance")}
            </div>
            <div className="text-[12.5px]" style={{ color: "var(--text-2)" }}>
              {tr("Accepts .xlsx / .xls. Expected a Code column and either a Balance column or Debit + Credit columns. Rows matching a CoA code are applied; unmatched codes are reported for review.")}
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) upload(f);
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="btn-primary click-scale px-4 py-2 text-[12px] shrink-0"
          >
            {busy ? tr("Importing…") : tr("Choose file…")}
          </button>
        </div>

        {preview && (
          <div className="mt-4 text-[12px] space-y-1 fade">
            <div style={{ color: "var(--good)" }}>
              ✓ {preview.matched.length} {tr("matched and applied")}
            </div>
            {preview.unmatchedCodes.length > 0 && (
              <div style={{ color: "var(--bad)" }}>
                ✕ {preview.unmatchedCodes.length} {tr("code(s) in the file didn't match any account in this firm's CoA:")}
                <div
                  className="mono mt-1"
                  style={{ color: "var(--text-2)" }}
                >
                  {preview.unmatchedCodes
                    .slice(0, 8)
                    .map((u) => u.code)
                    .join(", ")}
                  {preview.unmatchedCodes.length > 8 ? " …" : ""}
                </div>
              </div>
            )}
            {preview.missingAccounts.length > 0 && (
              <div style={{ color: "var(--text-2)" }}>
                {preview.missingAccounts.length} {tr("account(s) were not in the file and kept their existing balance.")}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={tr("Filter by code or name…")}
          className="field flex-1 max-w-sm px-3 py-2 text-[12px]"
        />
        {data && !data.confirmed && (
          <button
            onClick={doConfirm}
            disabled={busy}
            className="btn-primary click-scale px-4 py-2 text-[12px]"
          >
            {tr("Confirm opening balances")}
          </button>
        )}
        {data && data.confirmed && (
          <button
            onClick={doUnconfirm}
            disabled={busy}
            className="btn-ghost click-scale px-4 py-2 text-[12px]"
          >
            {tr("Unconfirm to edit")}
          </button>
        )}
      </div>

      {data === null && !error && (
        <div className="text-[13px]" style={{ color: "var(--text-2)" }}>
          {tr("Loading…")}
        </div>
      )}

      {data !== null && (
        <div className="card-flat overflow-x-auto rise">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {[tr("Code"), tr("Account"), tr("Type"), tr("Opening balance"), ""].map((h) => (
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
              {filtered.map((a) => (
                <tr
                  key={a.id}
                  className="row-hover"
                  style={{ borderBottom: "1px solid var(--border-soft)" }}
                >
                  <td
                    className="px-4 py-2 mono"
                    style={{ color: "var(--text-2)" }}
                  >
                    {a.code}
                  </td>
                  <td className="px-4 py-2">
                    <Bi en={a.name} ar={a.nameAr} />
                  </td>
                  <td
                    className="px-4 py-2 text-[12.5px]"
                    style={{ color: "var(--text-2)" }}
                  >
                    {a.type}
                  </td>
                  <td className="px-4 py-2 mono text-end">
                    {a.openingBalance ? fmtSAR(a.openingBalance) : "—"}
                  </td>
                  <td className="px-4 py-2 text-end">
                    <button
                      onClick={() => editOne(a.id, a.openingBalance)}
                      disabled={busy}
                      className="btn-ghost click-scale px-2.5 py-1 text-[12.5px]"
                    >
                      {tr("Edit")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
