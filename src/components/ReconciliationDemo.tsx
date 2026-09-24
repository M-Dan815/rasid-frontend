"use client";

import { useEffect, useState } from "react";
import { Check, CircleAlert, FileText, Landmark } from "lucide-react";
import { useLocale } from "@/lib/i18n";

/**
 * The hero's one memorable moment: reconciliation, shown as it feels in the
 * product. Documents arrive separately → pairs align → exceptions separate
 * from successful items → the final state settles. (Brand motion principle.)
 * All data here is synthetic and labelled as a sample.
 */
type Row = {
  bank: [string, string];
  amount: number;
  invoice: [string, string, string] | null;
};

const ROWS: Row[] = [
  { bank: ["Riyadh Steel Supply", "مؤسسة الرياض للحديد"], amount: 46750.5, invoice: ["INV-2041", "12 Mar", "١٢ مارس"] },
  { bank: ["Saudi Electricity Co.", "السعودية للكهرباء"], amount: 3200, invoice: ["INV-1187", "02 Mar", "٠٢ مارس"] },
  { bank: ["Warehouse rent, Q1", "إيجار المستودع، الربع الأول"], amount: 27000, invoice: ["INV-0092", "01 Jan", "٠١ يناير"] },
  { bank: ["Transfer, K. Al-Harbi", "تحويل، ك. الحربي"], amount: 8900, invoice: null },
];

const STAGES = [
  { en: "Upload", ar: "رفع" },
  { en: "Match", ar: "مطابقة" },
  { en: "Resolve", ar: "فرز" },
  { en: "Confirm", ar: "تأكيد" },
];
const STAGE_MS = [1500, 1500, 1500, 3600];

export function ReconciliationDemo() {
  const { t, n, locale } = useLocale();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setStage((s) => (s + 1) % STAGES.length), STAGE_MS[stage]);
    return () => clearTimeout(id);
  }, [stage]);

  const matched = ROWS.filter((r) => r.invoice).length;
  const dur = "0.32s";
  const ease = "cubic-bezier(.16,1,.3,1)";

  return (
    <div
      role="img"
      aria-label={t(
        "Illustration: a sample reconciliation where three bank transactions match invoices and one needs review.",
        "توضيح: مطابقة تجريبية تتطابق فيها ثلاث معاملات بنكية مع الفواتير وتحتاج واحدة إلى مراجعة.",
      )}
      className="relative w-full max-w-[560px] rounded-2xl"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-soft)",
        boxShadow: "0 24px 48px -28px rgba(11,45,91,.35), 0 2px 6px rgba(11,45,91,.05)",
      }}
    >
      {/* Header: sample label + stage line */}
      <div className="px-5 pt-4 pb-3 sm:px-6" style={{ borderBottom: "1px solid var(--border-soft)" }}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>
            {t("Sample case · FY 2024", "حالة تجريبية · السنة المالية 2024")}
          </span>
          <span className="text-[12px]" style={{ color: "var(--text-3)" }}>
            {t("Illustrative data", "بيانات توضيحية")}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2" aria-hidden>
          {STAGES.map((s, i) => (
            <div key={s.en}>
              <div
                className="h-[3px] rounded-full"
                style={{
                  background: i <= stage ? "var(--teal)" : "var(--track)",
                  transition: `background ${dur} ease`,
                }}
              />
              <div
                className="mt-1.5 text-[12px]"
                style={{
                  color: i === stage ? "var(--text)" : "var(--text-3)",
                  fontWeight: i === stage ? 600 : 500,
                }}
              >
                {locale === "ar" ? s.ar : s.en}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Column labels */}
      <div
        className="grid grid-cols-[1fr_36px_1fr] items-center px-5 pt-3 text-[12px] font-semibold sm:px-6"
        style={{ color: "var(--text-2)" }}
        aria-hidden
      >
        <span className="flex items-center gap-1.5">
          <Landmark size={14} strokeWidth={2} /> {t("Bank statement", "كشف الحساب")}
        </span>
        <span />
        <span className="flex items-center gap-1.5">
          <FileText size={14} strokeWidth={2} /> {t("Invoices", "الفواتير")}
        </span>
      </div>

      {/* Rows */}
      <div className="px-5 pb-2 pt-1 sm:px-6" aria-hidden>
        {ROWS.map((r, i) => {
          const unmatched = !r.invoice;
          const arrived = stage >= 1;
          const resolved = stage >= 2;
          const bankOffset = stage === 0 ? (i % 2 ? 10 : -6) : 0;
          return (
            <div
              key={r.bank[0]}
              className="grid grid-cols-[1fr_36px_1fr] items-center py-3"
              style={{
                borderTop: i === 0 ? "none" : "1px solid var(--border-soft)",
                background: resolved && unmatched ? "var(--warn-bg)" : "transparent",
                margin: resolved && unmatched ? "0 -12px" : undefined,
                padding: resolved && unmatched ? "12px 12px" : undefined,
                borderRadius: resolved && unmatched ? 10 : 0,
                transition: `background ${dur} ease`,
              }}
            >
              {/* Bank side: arrives first, slightly misaligned */}
              <div
                style={{
                  transform: `translateY(${bankOffset}px)`,
                  opacity: 1,
                  transition: `transform .32s ${ease}`,
                  transitionDelay: `${i * 40}ms`,
                }}
              >
                <div className="text-[13.5px] font-semibold leading-tight" style={{ color: "var(--text)" }}>
                  {locale === "ar" ? r.bank[1] : r.bank[0]}
                </div>
                <div className="num ltr-num text-[13px]" style={{ color: "var(--text-2)" }}>
                  {n(r.amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* Connector draws when pairs align */}
              <div className="flex justify-center">
                <span
                  className="block h-[2px] w-full origin-left rounded-full"
                  style={{
                    background: unmatched ? "transparent" : "var(--teal)",
                    borderTop: unmatched ? "2px dashed var(--warn)" : undefined,
                    transform: arrived ? "scaleX(1)" : "scaleX(0)",
                    transition: `transform .32s ${ease}`,
                    transitionDelay: `${i * 70}ms`,
                  }}
                />
              </div>

              {/* Invoice side: slides in to align */}
              <div
                style={{
                  opacity: arrived ? 1 : 0,
                  transform: arrived ? "translateX(0)" : "translateX(14px)",
                  transition: `opacity .32s ease, transform .32s ${ease}`,
                  transitionDelay: `${i * 70}ms`,
                }}
              >
                {r.invoice ? (
                  <div className="text-[13.5px] leading-tight" style={{ color: "var(--text)" }}>
                    <span className="font-semibold">{r.invoice[0]}</span>{" "}
                    <span style={{ color: "var(--text-3)" }}>{locale === "ar" ? r.invoice[2] : r.invoice[1]}</span>
                  </div>
                ) : (
                  <div className="text-[13.5px] leading-tight" style={{ color: "var(--text-2)" }}>
                    {t("No document", "لا يوجد مستند")}
                  </div>
                )}
                <div
                  className="mt-1"
                  style={{
                    opacity: resolved ? 1 : 0,
                    transform: resolved ? "none" : "translateY(3px)",
                    transition: `opacity .24s ease, transform .24s ${ease}`,
                    transitionDelay: `${i * 60}ms`,
                  }}
                >
                  {unmatched ? (
                    <span className="chip" style={{ background: "var(--surface)", color: "var(--warn)", border: "1px solid color-mix(in srgb, var(--warn) 35%, white)" }}>
                      <CircleAlert size={13} strokeWidth={2.5} /> {t("Needs review", "بحاجة للمراجعة")}
                    </span>
                  ) : (
                    <span className="chip" style={{ background: "var(--good-bg)", color: "var(--good)" }}>
                      <Check size={13} strokeWidth={3} /> {t("Matched", "تمت المطابقة")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm state */}
      <div
        className="flex items-center justify-between gap-4 rounded-b-2xl px-5 py-4 sm:px-6"
        style={{ background: "var(--surface-2)", borderTop: "1px solid var(--border-soft)" }}
      >
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold" style={{ color: "var(--text)" }}>
            {stage >= 3
              ? t(`${matched} of ${ROWS.length} matched. 1 waiting for you.`, `تمت مطابقة ${n(matched)} من ${n(ROWS.length)}. واحدة بانتظارك.`)
              : t("Reconciling…", "جارٍ المطابقة…")}
          </div>
          <div className="mt-2 h-[4px] w-full max-w-[220px] overflow-hidden rounded-full" style={{ background: "var(--track)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: "100%",
                transformOrigin: locale === "ar" ? "right" : "left",
                transform: `scaleX(${stage >= 3 ? matched / ROWS.length : (stage * 22) / 100})`,
                background: "var(--teal)",
                transition: `transform .32s ${ease}`,
              }}
            />
          </div>
        </div>
        <span
          className="shrink-0 text-[13px] font-semibold"
          style={{ color: "var(--accent)", opacity: stage >= 3 ? 1 : 0, transition: "opacity .24s ease" }}
        >
          {t("Ready for review", "جاهزة للمراجعة")}
        </span>
      </div>
    </div>
  );
}
