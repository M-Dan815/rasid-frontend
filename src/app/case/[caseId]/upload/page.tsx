"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { UploadZone } from "@/components/UploadZone";
import { useLocale } from "@/lib/i18n";
import { Check, X as XIcon } from "lucide-react";
import {
  ApiCase,
  ApiDocument,
  ApiError,
  getCase,
  processCase,
  uploadDocument,
} from "@/lib/api";

const DOC_STATUS: Record<string, { label: string; ar: string; color: string }> = {
  UPLOADED: { label: "Uploaded", ar: "تم الرفع", color: "var(--text-2)" },
  EXTRACTING: { label: "Extracting", ar: "جارٍ الاستخراج", color: "var(--warn)" },
  EXTRACTED: { label: "Extracted", ar: "تم الاستخراج", color: "var(--good)" },
  FAILED: { label: "Failed", ar: "فشل", color: "var(--bad)" },
};

export default function UploadPage() {
  const params = useParams<{ caseId: string }>();
  const router = useRouter();
  const { t, locale } = useLocale();

  const [kase, setKase] = useState<ApiCase | null>(null);
  const [bank, setBank] = useState<File[]>([]);
  const [inv, setInv] = useState<File[]>([]);
  const [bankName, setBankName] = useState("");
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [log, setLog] = useState<
    { name: string; ok: boolean; message?: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setKase(await getCase(params.caseId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("Could not load the case. Try again.", "تعذّر تحميل الحالة. حاول مرة أخرى."));
    }
  }, [params.caseId]);

  useEffect(() => {
    load();
  }, [load]);

  const existing: ApiDocument[] = kase?.documents ?? [];
  const hasNew = bank.length > 0 || inv.length > 0;

  async function run() {
    setBusy(true);
    setError(null);
    setLog([]);

    // Cosmetic: one backend call does the whole pipeline, so there's no real
    // per-file progress. Climb toward 90% while it's in flight, snap to 100%
    // when it actually returns.
    let p = 0;
    const iv = setInterval(() => {
      p = Math.min(90, p + Math.random() * 10 + 4);
      setPct(p);
    }, 300);

    let failures = 0;

    for (const f of bank) {
      try {
        await uploadDocument(
          params.caseId,
          f,
          "BANK_STATEMENT",
          bankName || undefined,
        );
        setLog((l) => [...l, { name: f.name, ok: true }]);
      } catch (e) {
        failures++;
        setLog((l) => [
          ...l,
          {
            name: f.name,
            ok: false,
            message: e instanceof ApiError ? e.message : "Upload failed",
          },
        ]);
      }
    }
    for (const f of inv) {
      const type = f.type.startsWith("image/") ? "RECEIPT" : "INVOICE";
      try {
        await uploadDocument(params.caseId, f, type);
        setLog((l) => [...l, { name: f.name, ok: true }]);
      } catch (e) {
        failures++;
        setLog((l) => [
          ...l,
          {
            name: f.name,
            ok: false,
            message: e instanceof ApiError ? e.message : "Upload failed",
          },
        ]);
      }
    }

    if (failures > 0) {
      clearInterval(iv);
      setBusy(false);
      setPct(0);
      setError(
        `${failures} upload(s) failed — nothing was processed. Fix and retry.`,
      );
      await load();
      setBank([]);
      setInv([]);
      return;
    }

    try {
      await processCase(params.caseId);
      clearInterval(iv);
      setPct(100);
      router.push(`/case/${params.caseId}/extraction`);
    } catch (e) {
      clearInterval(iv);
      setBusy(false);
      setPct(0);
      setError(e instanceof ApiError ? e.message : "Processing failed");
      await load();
      setBank([]);
      setInv([]);
    }
  }

  return (
    <div className="page-enter max-w-3xl p-5 sm:p-8 md:p-10">
      <div className="rise mb-8">
        <h1 className="display text-[32px]" style={{ color: "var(--text)" }}>
          {t("Upload source documents", "رفع المستندات المصدرية")}
        </h1>
        <p className="mt-1.5 text-[15px]" style={{ color: "var(--text-2)" }}>
          {kase ? (
            <>
              {kase.label} ·{" "}
              <span className="num">
                {new Date(kase.periodStart).toLocaleDateString(locale === "ar" ? "ar-SA-u-ca-gregory-nu-arab" : "en-GB")} –{" "}
                {new Date(kase.periodEnd).toLocaleDateString(locale === "ar" ? "ar-SA-u-ca-gregory-nu-arab" : "en-GB")}
              </span>
            </>
          ) : (
            t("Loading case…", "جارٍ تحميل الحالة…")
          )}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-[10px] px-3.5 py-2.5 text-[14px]"
          style={{ color: "var(--bad)", background: "var(--bad-bg)", border: "1px solid var(--bad-line)" }}
        >
          {error}
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <UploadZone
          label={t("Bank statements", "كشوف الحساب البنكية")}
          hint={t("PDF, Excel or CSV. One or more banks.", "PDF أو Excel أو CSV. بنك واحد أو أكثر.")}
          accept=".pdf,.xlsx,.xls,.csv"
          files={bank}
          onFiles={(f) => setBank((prev) => [...prev, ...f])}
          onRemove={(i) => setBank((prev) => prev.filter((_, idx) => idx !== i))}
        />
        <UploadZone
          label={t("Invoices and receipts", "الفواتير والإيصالات")}
          hint={t("PDF or image", "PDF أو صورة")}
          accept=".pdf,image/*"
          files={inv}
          onFiles={(f) => setInv((prev) => [...prev, ...f])}
          onRemove={(i) => setInv((prev) => prev.filter((_, idx) => idx !== i))}
        />
      </div>

      <label className="mb-1.5 mt-6 block text-[13.5px] font-semibold" htmlFor="bankName">
        {t("Bank name for statements (optional)", "اسم البنك للكشوف (اختياري)")}
      </label>
      <input
        id="bankName"
        value={bankName}
        onChange={(e) => setBankName(e.target.value)}
        placeholder={t("e.g. Al Rajhi", "مثال: مصرف الراجحي")}
        className="field mb-6 w-full px-3.5 py-2.5 text-[15px]"
      />

      {log.length > 0 && (
        <ul className="mb-6 space-y-1.5 text-[14px]">
          {log.map((l, i) => (
            <li key={i} className="flex items-center gap-2" style={{ color: l.ok ? "var(--good)" : "var(--bad)" }}>
              {l.ok ? <Check size={16} strokeWidth={2.6} aria-hidden /> : <XIcon size={16} strokeWidth={2.6} aria-hidden />}
              <span dir="auto">
                {l.name}
                {l.message ? `: ${l.message}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}

      {existing.length > 0 && (
        <div className="card-flat rise mb-6 overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                {[t("Already in this case", "موجود في هذه الحالة"), t("Type", "النوع"), t("Status", "الحالة")].map((h) => (
                  <th key={h} className="px-4 py-3 text-start text-[13px]" style={{ color: "var(--text-2)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {existing.map((d) => {
                const st = DOC_STATUS[d.status] ?? { label: d.status, ar: d.status, color: "var(--text-2)" };
                return (
                  <tr key={d.id} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                    <td className="px-4 py-3">
                      <span dir="auto">{d.fileName}</span>
                      {d.bankName ? (
                        <span className="ms-2 text-[13px]" style={{ color: "var(--text-2)" }}>
                          {d.bankName}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-[13.5px]" style={{ color: "var(--text-2)" }}>
                      {d.type === "BANK_STATEMENT"
                        ? t("Statement", "كشف حساب")
                        : d.type === "INVOICE"
                          ? t("Invoice", "فاتورة")
                          : t("Receipt", "إيصال")}
                    </td>
                    <td className="px-4 py-3 text-[13.5px] font-semibold" style={{ color: st.color }}>
                      {locale === "ar" ? st.ar : st.label}
                      {d.status === "FAILED" && d.extractionError ? `: ${d.extractionError}` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {busy ? (
        <div className="card-flat rise p-5" role="status">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[14.5px] font-semibold">
              {t("Reading documents and extracting transactions…", "جارٍ قراءة المستندات واستخراج المعاملات…")}
            </span>
            <span className="num text-[13.5px] font-semibold" style={{ color: "var(--accent)" }}>
              {Math.min(100, Math.round(pct))}%
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
        </div>
      ) : (
        <button
          onClick={run}
          disabled={!hasNew && existing.length === 0}
          className="btn-primary click-scale px-6 py-3 text-[15px]"
        >
          {hasNew ? t("Extract and reconcile", "استخراج ومطابقة") : t("Re-run extraction and reconciliation", "إعادة الاستخراج والمطابقة")}
        </button>
      )}
    </div>
  );
}
