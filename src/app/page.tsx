"use client";

import Link from "next/link";
import { ArrowRight, GitCompareArrows, ListChecks, ScanSearch, ShieldCheck, Sparkles } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { ReconciliationDemo } from "@/components/ReconciliationDemo";
import { AngledForms } from "@/components/AngledForms";
import { useLocale } from "@/lib/i18n";

export default function HomePage() {
  const { t, n } = useLocale();

  const steps = [
    {
      title: t("Upload", "ارفع"),
      body: t(
        "Bank statements, invoices and receipts, as PDF, Excel, CSV or image. One bank or many, in one go.",
        "كشوف الحساب والفواتير والإيصالات بصيغة PDF أو Excel أو CSV أو صورة. بنك واحد أو عدة بنوك دفعة واحدة.",
      ),
    },
    {
      title: t("Reconcile", "طابِق"),
      body: t(
        "AI reads the documents. Deterministic code matches invoices to bank transactions and scores each match.",
        "يقرأ الذكاء الاصطناعي المستندات، ويطابق المنطق المحاسبي الفواتير مع المعاملات البنكية مع درجة ثقة لكل مطابقة.",
      ),
    },
    {
      title: t("Review", "راجِع"),
      body: t(
        "Your team sees only what needs a decision: unmatched items, low-confidence categories, possible duplicates.",
        "يرى فريقك ما يحتاج إلى قرار فقط: البنود غير المطابقة والتصنيفات منخفضة الثقة والتكرارات المحتملة.",
      ),
    },
    {
      title: t("Deliver", "سلِّم"),
      body: t(
        "A balanced Trial Balance and financial statements, every figure traceable to its source document.",
        "ميزان مراجعة متوازن وقوائم مالية، وكل رقم قابل للتتبع إلى مستنده الأصلي.",
      ),
    },
  ];

  const principles = [
    {
      Icon: ShieldCheck,
      title: t("Unexplained differences stay visible", "الفروقات غير المفسّرة تبقى ظاهرة"),
      body: t(
        "If a difference can't be explained, it goes to the accountant as an exception. It is never smoothed over automatically.",
        "إذا تعذّر تفسير أي فرق فإنه يصل إلى المحاسب كاستثناء، ولا تتم تسويته تلقائياً.",
      ),
    },
    {
      Icon: ScanSearch,
      title: t("Every figure traces to its source", "كل رقم يعود إلى مصدره"),
      body: t(
        "Click any figure on any statement to see the exact transactions, and the original document, behind it.",
        "اضغط على أي رقم في أي قائمة لترى المعاملات الدقيقة والمستند الأصلي خلفه.",
      ),
    },
    {
      Icon: ListChecks,
      title: t("Rules that learn from your firm", "قواعد تتعلم من مكتبك"),
      body: t(
        "Every correction your firm makes is saved and reused automatically on the next case.",
        "كل تصحيح يجريه مكتبك يُحفظ ويُعاد استخدامه تلقائياً في الحالة التالية.",
      ),
    },
    {
      Icon: Sparkles,
      title: t("Your choice of AI provider", "اختيارك لمزوّد الذكاء الاصطناعي"),
      body: t(
        "OpenAI, DeepSeek, Gemini or another. Extraction and classification aren't locked to one vendor.",
        "OpenAI أو DeepSeek أو Gemini أو غيرها. الاستخراج والتصنيف غير مرتبطين بمزوّد واحد.",
      ),
    },
  ];

  return (
    <div className="page-enter" style={{ background: "var(--surface)" }}>
      <MarketingHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-5 pb-20 pt-14 md:px-10 md:pb-28 md:pt-20 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <h1
              className="display text-[clamp(38px,5.4vw,64px)]"
              style={{ color: "var(--text)", letterSpacing: "-0.03em" }}
            >
              {t("Less repetitive work.", "عمل متكرر أقل.")}
              <br />
              <span style={{ color: "var(--accent)" }}>{t("More review capacity.", "وقت أكبر للمراجعة.")}</span>
            </h1>
            <p className="mt-7 max-w-[54ch] text-[17px] leading-relaxed" style={{ color: "var(--text-2)" }}>
              {t(
                "Upload bank statements and invoices. AccountTech extracts, matches and classifies the transactions, builds a balanced Trial Balance, and prepares the income statement, balance sheet and cash flow statement.",
                "ارفع كشوف الحساب والفواتير. تستخرج أكاونت تك المعاملات وتطابقها وتصنّفها، وتبني ميزان مراجعة متوازناً، وتجهّز قائمة الدخل والمركز المالي والتدفقات النقدية.",
              )}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/login" className="btn-primary click-scale inline-flex items-center gap-2 px-6 py-3.5 text-[15px]">
                {t("Get started", "ابدأ الآن")}
                <ArrowRight size={17} strokeWidth={2.2} className="rtl-flip" aria-hidden />
              </Link>
              <Link href="/pricing" className="btn-ghost click-scale px-6 py-3.5 text-[15px]">
                {t("See pricing", "الأسعار")}
              </Link>
            </div>
            <p className="mt-6 text-[14px]" style={{ color: "var(--text-2)" }}>
              {t("Built for accountants. Designed for accounting firms in Saudi Arabia.", "مصممة للمحاسبين. ومبنية للمكاتب المحاسبية في المملكة العربية السعودية.")}
            </p>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <AngledForms className="pointer-events-none absolute -bottom-6 -end-44 hidden w-[520px] lg:block" />
            <div className="relative z-10 w-full">
              <div className="flex justify-center lg:justify-end">
                <ReconciliationDemo />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow: a real sequence, so numbering carries information */}
      <section style={{ background: "var(--canvas)", borderTop: "1px solid var(--border-soft)", borderBottom: "1px solid var(--border-soft)" }}>
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-10 md:py-24">
          <h2 className="display max-w-[20ch] text-[clamp(30px,4.2vw,46px)]" style={{ color: "var(--text)" }}>
            {t("Upload. Reconcile. Review. Deliver.", "ارفع. طابِق. راجِع. سلِّم.")}
          </h2>
          <ol className="mt-14 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className="pt-5" style={{ borderTop: "2px solid var(--rule)" }}>
                <div className="flex items-baseline gap-3">
                  <span className="num text-[15px] font-semibold" style={{ color: "var(--accent)" }}>
                    {n(i + 1)}
                  </span>
                  <h3 className="text-[21px] font-bold" style={{ color: "var(--text)" }}>
                    {s.title}
                  </h3>
                </div>
                <p className="mt-3 max-w-[36ch] text-[15px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Positioning: technology with restraint */}
      <section>
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-14 px-5 py-20 md:px-10 md:py-28 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <h2 className="display text-[clamp(30px,4.2vw,46px)]" style={{ color: "var(--text)" }}>
              {t("AI interprets. Accounting logic calculates.", "الذكاء الاصطناعي يفسّر. والمنطق المحاسبي يحسب.")}
            </h2>
            <p className="mt-6 max-w-[46ch] text-[17px] leading-relaxed" style={{ color: "var(--text-2)" }}>
              {t(
                "AccountTech is not a replacement for the accountant. It is the system that makes the repetitive production layer faster, more structured and auditable, so professional judgment goes where it matters.",
                "أكاونت تك ليست بديلاً عن المحاسب، بل هي النظام الذي يجعل طبقة التنفيذ المتكررة أسرع وأكثر تنظيماً وقابلية للتدقيق، ليتجه الحكم المهني إلى حيث يهم.",
              )}
            </p>
            <div className="mt-8 flex items-center gap-3 text-[14.5px] font-semibold" style={{ color: "var(--text)" }}>
              <GitCompareArrows size={20} strokeWidth={2} style={{ color: "var(--accent)" }} aria-hidden />
              {t("Every total comes from deterministic code, not AI.", "كل إجمالي يأتي من منطق حتمي وليس من الذكاء الاصطناعي.")}
            </div>
          </div>

          <ul className="lg:pt-2" style={{ borderTop: "1px solid var(--rule)" }}>
            {principles.map(({ Icon, title, body }) => (
              <li key={title} className="flex gap-5 py-7" style={{ borderBottom: "1px solid var(--border)" }}>
                <Icon size={24} strokeWidth={2} className="mt-0.5 shrink-0" style={{ color: "var(--text)" }} aria-hidden />
                <div>
                  <h3 className="text-[18px] font-bold leading-snug" style={{ color: "var(--text)" }}>
                    {title}
                  </h3>
                  <p className="mt-2 max-w-[52ch] text-[15px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                    {body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Close */}
      <section className="relative overflow-hidden" style={{ background: "var(--inverse-bg)" }}>
        <AngledForms onDark className="pointer-events-none absolute -end-20 -bottom-28 w-[560px]" />
        <div className="relative mx-auto max-w-6xl px-5 py-20 md:px-10 md:py-24">
          <div className="max-w-[640px]">
            
            <h2 className="display text-[clamp(32px,4.6vw,52px)]" style={{ color: "#fff" }}>
              {t("A smarter way for a clearer tomorrow.", "طريقة أذكى لمستقبل أكثر وضوحاً.")}
            </h2>
            <p className="mt-5 max-w-[46ch] text-[17px] leading-relaxed" style={{ color: "#C8D3E0" }}>
              {t(
                "Bring one client's documents and see the reconciliation, the Trial Balance and the statements for yourself.",
                "أحضر مستندات عميل واحد وشاهد المطابقة وميزان المراجعة والقوائم المالية بنفسك.",
              )}
            </p>
            <div className="on-navy mt-9 flex flex-wrap gap-3">
              <Link href="/login" className="btn-accent click-scale inline-flex items-center gap-2 px-6 py-3.5 text-[15px]">
                {t("Get started", "ابدأ الآن")}
                <ArrowRight size={17} strokeWidth={2.2} className="rtl-flip" aria-hidden />
              </Link>
              <Link
                href="/pricing"
                className="click-scale rounded-[10px] px-6 py-3.5 text-[15px] font-medium text-white"
                style={{ border: "1px solid rgba(255,255,255,.35)" }}
              >
                {t("See pricing", "الأسعار")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
