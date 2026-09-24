"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { StatusPill } from "@/components/StatusPieces";
import {
  ApiClient,
  ApiError,
  createCase,
  createClient,
  deleteCase,
  getClients,
} from "@/lib/api";
import { uiClient } from "@/lib/adapters";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { useLocale } from "@/lib/i18n";
import { ChevronRight, Plus, Search, Trash2 } from "lucide-react";
import type { Client } from "@/lib/data";

type Modal =
  | { kind: "client" }
  | { kind: "case"; clientId: string; clientName: string }
  | null;

type DeleteTarget = {
  id: string;
  label: string;
  clientId: string;
  clientName: string;
};

export default function DashboardPage() {
  const ready = useAuthGuard();
  const router = useRouter();
  const { t, n, locale } = useLocale();
  const [clients, setClients] = useState<Client[] | null>(null);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [label, setLabel] = useState(`FY ${new Date().getFullYear()}`);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  const load = useCallback(async () => {
    try {
      const raw: ApiClient[] = await getClients();
      setClients(raw.map(uiClient));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("Could not load clients. Check your connection and try again.", "تعذّر تحميل العملاء. تحقق من الاتصال وحاول مرة أخرى."));
    }
  }, []);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  if (!ready) return null;

  const filtered = (clients ?? []).filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()),
  );

  async function submitModal() {
    if (!modal) return;
    setBusy(true);
    setError(null);
    try {
      if (modal.kind === "client") {
        await createClient({ name, nameAr: nameAr || undefined });
      } else {
        await createCase(modal.clientId, { label, periodStart, periodEnd });
      }
      setModal(null);
      setName("");
      setNameAr("");
      setPeriodStart("");
      setPeriodEnd("");
      setLabel(`FY ${new Date().getFullYear()}`);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("Something went wrong. Please try again.", "حدث خطأ ما. يرجى المحاولة مرة أخرى."));
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    setError(null);
    try {
      await deleteCase(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("Could not delete the case. Please try again.", "تعذّر حذف الحالة. يرجى المحاولة مرة أخرى."));
    } finally {
      setBusy(false);
    }
  }

  const ago = (v: string) => {
    if (locale !== "ar") return v;
    if (v === "just now") return "الآن";
    const m = v.match(/^(\d+) (min|hour|day|month)s? ago$/);
    if (!m) return v;
    const u = { min: "دقيقة", hour: "ساعة", day: "يوم", month: "شهر" }[m[2] as "min"];
    return `منذ ${n(Number(m[1]))} ${u}`;
  };
  const allCases = (clients ?? []).flatMap((c) => c.cases);
  const openCases = allCases.filter((k) => k.status !== "complete").length;
  const waiting = allCases.filter((k) => k.status === "exceptions" || k.status === "in-review").length;

  const tiles: [string, number][] = [
    [t("Clients", "العملاء"), (clients ?? []).length],
    [t("Open cases", "الحالات المفتوحة"), openCases],
    [t("Waiting for review", "بانتظار المراجعة"), waiting],
  ];

  const labelCls = "mb-1.5 block text-[13.5px] font-semibold";
  const canSubmit =
    !busy &&
    (modal?.kind === "client"
      ? !!name.trim()
      : !!label.trim() && !!periodStart && !!periodEnd && new Date(periodEnd) > new Date(periodStart));

  return (
    <Shell>
      <div className="page-enter mx-auto max-w-5xl p-5 sm:p-8 md:p-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="display text-[32px]" style={{ color: "var(--text)" }}>
              {t("Clients and cases", "العملاء والحالات")}
            </h1>
            <p className="mt-1.5 text-[15px]" style={{ color: "var(--text-2)" }}>
              {t("Open a case to continue where you left off.", "افتح حالة لتكمل من حيث توقفت.")}
            </p>
          </div>
          <button
            onClick={() => setModal({ kind: "client" })}
            className="btn-primary click-scale inline-flex items-center gap-2 px-4 py-2.5 text-[14.5px]"
          >
            <Plus size={17} strokeWidth={2.4} aria-hidden />
            {t("New client", "عميل جديد")}
          </button>
        </div>

        {clients !== null && (
          <div className="mb-8 grid grid-cols-3 gap-3">
            {tiles.map(([label, value]) => (
              <div key={label} className="rounded-xl px-4 py-3.5 sm:px-5 sm:py-4" style={{ background: "var(--tile)" }}>
                <div className="text-[13px]" style={{ color: "var(--text-2)" }}>
                  {label}
                </div>
                <div className="num display mt-0.5 text-[30px] sm:text-[34px]" style={{ color: "var(--text)" }}>
                  {n(value)}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-[10px] px-3.5 py-2.5 text-[14px]"
            style={{ color: "var(--bad)", background: "var(--bad-bg)", border: "1px solid var(--bad-line)" }}
          >
            {error}
          </div>
        )}

        <div className="relative mb-7 max-w-sm">
          <Search
            size={17}
            strokeWidth={2}
            className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-3)" }}
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search clients", "ابحث عن عميل")}
            aria-label={t("Search clients", "ابحث عن عميل")}
            className="field w-full py-2.5 pe-3 ps-10 text-[15px]"
          />
        </div>

        {clients !== null && filtered.length === 0 && (
          <div className="rounded-2xl p-10 text-center" style={{ border: "1px dashed var(--border)", background: "var(--surface)" }}>
            <p className="text-[16px] font-semibold" style={{ color: "var(--text)" }}>
              {query
                ? t("No clients match your search.", "لا يوجد عملاء مطابقون للبحث.")
                : t("No clients yet.", "لا يوجد عملاء بعد.")}
            </p>
            {!query && (
              <>
                <p className="mt-1 text-[14.5px]" style={{ color: "var(--text-2)" }}>
                  {t("Add your first client to open a case.", "أضف أول عميل لفتح حالة.")}
                </p>
                <button onClick={() => setModal({ kind: "client" })} className="btn-primary click-scale mt-5 px-5 py-2.5 text-[14.5px]">
                  {t("New client", "عميل جديد")}
                </button>
              </>
            )}
          </div>
        )}

        <div className="space-y-8">
          {filtered.map((c) => (
            <section key={c.id} aria-label={c.name}>
              <div className="mb-2.5 flex flex-wrap items-baseline gap-x-3">
                <h2 className="text-[18px] font-bold" style={{ color: "var(--text)" }}>
                  {locale === "ar" && c.nameAr ? c.nameAr : c.name}
                </h2>
                {c.nameAr && (
                  <span className={locale === "ar" ? "text-[14px]" : "ar text-[14px]"} style={{ color: "var(--text-2)" }} lang={locale === "ar" ? "en" : "ar"}>
                    {locale === "ar" ? c.name : c.nameAr}
                  </span>
                )}
              </div>
              <div className="card-flat overflow-hidden">
                {c.cases.map((k, ki) => (
                  <div
                    key={k.id}
                    className="row-hover flex items-center"
                    style={{ borderTop: ki === 0 ? "none" : "1px solid var(--border-soft)" }}
                  >
                    <button
                      onClick={() => router.push(`/case/${k.id}/upload`)}
                      className="flex min-w-0 flex-1 items-center justify-between gap-4 px-5 py-4 text-start"
                    >
                      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5">
                        <span className="text-[15.5px] font-semibold" style={{ color: "var(--text)" }}>
                          {k.label}
                        </span>
                        <StatusPill status={k.status} />
                      </div>
                      <span className="flex shrink-0 items-center gap-2 text-[13.5px]" style={{ color: "var(--text-2)" }}>
                        <span className="hidden sm:inline">{ago(k.updated)}</span>
                        <ChevronRight size={18} strokeWidth={2} className="rtl-flip" aria-hidden />
                      </span>
                    </button>
                    <button
                      onClick={() =>
                        setDeleteTarget({ id: k.id, label: k.label, clientId: c.id, clientName: c.name })
                      }
                      className="click-scale me-3 shrink-0 rounded-lg p-2 transition-colors hover:bg-[var(--bad-bg)]"
                      style={{ color: "var(--text-3)" }}
                      aria-label={t(`Delete case ${k.label}`, `حذف الحالة ${k.label}`)}
                      title={t("Delete this case", "حذف هذه الحالة")}
                    >
                      <Trash2 size={17} strokeWidth={2} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setModal({ kind: "case", clientId: c.id, clientName: c.name })}
                  className="flex w-full items-center gap-2 px-5 py-3.5 text-start text-[14px] font-semibold transition-colors hover:bg-[var(--surface-2)]"
                  style={{
                    color: "var(--accent)",
                    borderTop: c.cases.length ? "1px solid var(--border-soft)" : "none",
                  }}
                >
                  <Plus size={16} strokeWidth={2.5} aria-hidden />
                  {t("New case", "حالة جديدة")}
                </button>
              </div>
            </section>
          ))}
        </div>
      </div>

      {modal && (
        <div
          className="fade fixed inset-0 z-40 flex items-center justify-center p-4"
          style={{ background: "var(--scrim)" }}
          onClick={() => setModal(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="rise card-flat w-[440px] max-w-full p-6 sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="display text-[22px]" style={{ color: "var(--text)" }}>
              {modal.kind === "client"
                ? t("New client", "عميل جديد")
                : t(`New case for ${modal.clientName}`, `حالة جديدة لـ ${modal.clientName}`)}
            </h3>
            <div className="mt-5">
              {modal.kind === "client" ? (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="cn" className={labelCls}>{t("Client name", "اسم العميل")}</label>
                    <input id="cn" autoFocus value={name} onChange={(e) => setName(e.target.value)} className="field w-full px-3.5 py-2.5 text-[15px]" />
                  </div>
                  <div>
                    <label htmlFor="cna" className={labelCls}>{t("Client name in Arabic (optional)", "اسم العميل بالعربية (اختياري)")}</label>
                    <input id="cna" dir="rtl" value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="field ar w-full px-3.5 py-2.5 text-[15px]" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="cl" className={labelCls}>{t("Case label", "اسم الحالة")}</label>
                    <input id="cl" autoFocus value={label} onChange={(e) => setLabel(e.target.value)} placeholder="FY 2024" className="field w-full px-3.5 py-2.5 text-[15px]" />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label htmlFor="ps" className={labelCls}>{t("Period start", "بداية الفترة")}</label>
                      <input id="ps" required type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="field w-full px-3 py-2.5 text-[15px]" />
                    </div>
                    <div className="flex-1">
                      <label htmlFor="pe" className={labelCls}>{t("Period end", "نهاية الفترة")}</label>
                      <input id="pe" required type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="field w-full px-3 py-2.5 text-[15px]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-7 flex gap-3">
              <button disabled={!canSubmit} onClick={submitModal} className="btn-primary click-scale flex-1 py-2.5 text-[15px]">
                {busy ? t("Saving…", "جارٍ الحفظ…") : t("Create", "إنشاء")}
              </button>
              <button onClick={() => setModal(null)} className="btn-ghost click-scale flex-1 py-2.5 text-[15px]">
                {t("Cancel", "إلغاء")}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fade fixed inset-0 z-40 flex items-center justify-center p-4"
          style={{ background: "var(--scrim)" }}
          onClick={() => !busy && setDeleteTarget(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="rise card-flat w-[440px] max-w-full p-6 sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="display text-[22px]" style={{ color: "var(--text)" }}>
              {t("Delete this case?", "حذف هذه الحالة؟")}
            </h3>
            <p className="mt-3 text-[14.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
              <strong style={{ color: "var(--text)" }}>
                {deleteTarget.clientName} · {deleteTarget.label}
              </strong>{" "}
              {t(
                "and everything inside it (transactions, invoices, journal entries, exceptions and clarifications) will be permanently deleted. This cannot be undone.",
                "وكل ما بداخلها (المعاملات والفواتير وقيود اليومية والاستثناءات والاستفسارات) سيُحذف نهائياً. لا يمكن التراجع عن ذلك.",
              )}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                disabled={busy}
                onClick={confirmDelete}
                className="click-scale flex-1 rounded-[10px] py-2.5 text-[15px] font-semibold disabled:opacity-60"
                style={{ background: "var(--bad)", color: "var(--on-bad)" }}
              >
                {busy ? t("Deleting…", "جارٍ الحذف…") : t("Delete case", "حذف الحالة")}
              </button>
              <button disabled={busy} onClick={() => setDeleteTarget(null)} className="btn-ghost click-scale flex-1 py-2.5 text-[15px]">
                {t("Cancel", "إلغاء")}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
