"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { useLocale } from "@/lib/i18n";

type Plan = {
  name: [string, string];
  price: [string, string];
  cadence: [string, string];
  blurb: [string, string];
  features: [string, string][];
  cta: [string, string];
  featured?: boolean;
};

const PLANS: Plan[] = [
  {
    name: ["Starter", "الأساسية"],
    price: ["SAR 1,200", "١٬٢٠٠ ر.س"],
    cadence: ["per month, per firm", "شهرياً لكل مكتب"],
    blurb: [
      "For a small firm piloting the workflow on a handful of clients.",
      "لمكتب صغير يجرّب مسار العمل على عدد قليل من العملاء.",
    ],
    features: [
      ["Up to 5 active cases per month", "حتى ٥ حالات نشطة شهرياً"],
      ["Bank statement and invoice extraction", "استخراج كشوف الحساب والفواتير"],
      ["Reconciliation and exception review", "المطابقة ومراجعة الاستثناءات"],
      ["Trial Balance and Income Statement", "ميزان المراجعة وقائمة الدخل"],
      ["Excel and PDF export", "تصدير Excel وPDF"],
    ],
    cta: ["Start free trial", "ابدأ التجربة المجانية"],
  },
  {
    name: ["Practice", "المكاتب"],
    price: ["SAR 3,500", "٣٬٥٠٠ ر.س"],
    cadence: ["per month, per firm", "شهرياً لكل مكتب"],
    blurb: [
      "For firms running multiple clients and case years in parallel.",
      "للمكاتب التي تدير عدة عملاء وسنوات مالية بالتوازي.",
    ],
    features: [
      ["Unlimited active cases", "حالات نشطة غير محدودة"],
      ["All three financial statements", "القوائم المالية الثلاث"],
      ["Custom statement templates", "قوالب قوائم مخصصة"],
      ["Reusable firm-wide classification rules", "قواعد تصنيف تُستخدم على مستوى المكتب"],
      ["Priority document processing", "أولوية في معالجة المستندات"],
      ["Choice of AI provider (OpenAI, DeepSeek, Gemini)", "اختيار مزوّد الذكاء الاصطناعي (OpenAI وDeepSeek وGemini)"],
    ],
    cta: ["Start free trial", "ابدأ التجربة المجانية"],
    featured: true,
  },
  {
    name: ["Enterprise", "المؤسسات"],
    price: ["Custom", "حسب الطلب"],
    cadence: ["volume pricing", "تسعير حسب الحجم"],
    blurb: [
      "For larger firms and networks with firm-wide rollout needs.",
      "للمكاتب الكبرى والشبكات التي تحتاج إلى تطبيق شامل.",
    ],
    features: [
      ["Everything in Practice", "كل ما في باقة المكاتب"],
      ["Multi-branch and multi-partner accounts", "حسابات متعددة الفروع والشركاء"],
      ["Dedicated onboarding on historical cases", "تأهيل مخصص للحالات السابقة"],
      ["SLA-backed support", "دعم بضمان مستوى الخدمة"],
      ["Custom integrations", "تكاملات مخصصة"],
    ],
    cta: ["Talk to us", "تواصل معنا"],
  },
];

export default function PricingPage() {
  const { t, locale } = useLocale();
  const pick = (p: [string, string]) => (locale === "ar" ? p[1] : p[0]);

  return (
    <div className="page-enter" style={{ background: "var(--surface)" }}>
      <MarketingHeader />

      <section className="mx-auto max-w-6xl px-5 pb-6 pt-14 md:px-10 md:pt-20">
        <h1 className="display max-w-[18ch] text-[clamp(34px,5vw,54px)]" style={{ color: "var(--text)" }}>
          {t("Simple pricing, per firm.", "أسعار بسيطة، لكل مكتب.")}
        </h1>
        <p className="mt-5 max-w-[58ch] text-[17px] leading-relaxed" style={{ color: "var(--text-2)" }}>
          {t(
            "Every plan includes full traceability, exception-first review, and a Trial Balance that can't be finalised out of balance.",
            "تشمل كل باقة التتبع الكامل، والمراجعة التي تبدأ بالاستثناءات، وميزان مراجعة لا يمكن اعتماده وهو غير متوازن.",
          )}
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-10 pt-10 md:px-10">
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3 lg:gap-0">
          {PLANS.map((plan) => {
            const f = !!plan.featured;
            return (
              <div
                key={plan.name[0]}
                className="flex flex-col p-7 lg:p-9"
                style={{
                  background: f ? "var(--inverse-bg)" : "var(--surface)",
                  color: f ? "#fff" : "var(--text)",
                  border: f ? "none" : "1px solid var(--border)",
                  borderRadius: f ? 18 : 14,
                  boxShadow: f ? "0 26px 50px -30px rgba(11,45,91,.6)" : undefined,
                  position: "relative",
                  zIndex: f ? 1 : 0,
                }}
              >
                <h2 className="text-[20px] font-bold">{pick(plan.name)}</h2>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="display num text-[38px]">{pick(plan.price)}</span>
                </div>
                <div className="text-[14px]" style={{ color: f ? "#C8D3E0" : "var(--text-2)" }}>
                  {pick(plan.cadence)}
                </div>
                <p className="mt-5 max-w-[40ch] text-[15px] leading-relaxed" style={{ color: f ? "#C8D3E0" : "var(--text-2)" }}>
                  {pick(plan.blurb)}
                </p>
                <div className="my-6 h-px" style={{ background: f ? "rgba(255,255,255,.2)" : "var(--border)" }} />
                <ul className="flex-1 space-y-3">
                  {plan.features.map((ft) => (
                    <li key={ft[0]} className="flex items-start gap-3 text-[14.5px] leading-snug">
                      <Check
                        size={18}
                        strokeWidth={2.5}
                        className="mt-px shrink-0"
                        style={{ color: f ? "var(--mint)" : "var(--accent)" }}
                        aria-hidden
                      />
                      <span>{pick(ft)}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`${f ? "btn-accent" : "btn-primary"} click-scale mt-8 block py-3 text-center text-[15px]`}
                >
                  {pick(plan.cta)}
                </Link>
              </div>
            );
          })}
        </div>

        <p className="mt-10 max-w-[70ch] text-[14px]" style={{ color: "var(--text-2)" }}>
          {t(
            "AI provider costs (OpenAI, DeepSeek, Gemini and others) are billed at your own usage. AccountTech does not mark up model pricing.",
            "تُحاسَب تكاليف مزوّدي الذكاء الاصطناعي (OpenAI وDeepSeek وGemini وغيرهم) حسب استخدامك الفعلي، ولا تضيف أكاونت تك أي هامش على أسعار النماذج.",
          )}
        </p>
      </section>

      <MarketingFooter />
    </div>
  );
}
