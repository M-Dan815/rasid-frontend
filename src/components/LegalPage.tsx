"use client";

import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { useLocale } from "@/lib/i18n";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  const { t } = useLocale();
  return (
    <div className="page-enter">
      <MarketingHeader />
      <section className="mx-auto max-w-3xl px-5 pb-24 pt-14 md:px-10 md:pt-20">
        <h1 className="display text-[34px] sm:text-[40px]" style={{ color: "var(--text)" }}>
          {title}
        </h1>
        <p className="mb-6 mt-3 text-[13px]" style={{ color: "var(--text-2)" }}>
          {t("Last updated", "آخر تحديث")} {updated}.{" "}
          {t(
            "Placeholder text to be replaced with counsel-reviewed copy before launch.",
            "نص مؤقت يُستبدل بنص راجعه مستشار قانوني قبل الإطلاق.",
          )}
        </p>
        <div className="rule-navy mb-10" />
        <div className="max-w-[68ch] space-y-8 text-[15px] leading-relaxed" style={{ color: "var(--text-2)" }}>
          {children}
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
