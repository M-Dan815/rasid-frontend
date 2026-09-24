"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { useLocale } from "@/lib/i18n";

export function MarketingFooter() {
  const { t } = useLocale();
  return (
    <footer style={{ borderTop: "1px solid var(--rule)", background: "var(--surface)" }}>
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10 md:flex-row md:items-center md:justify-between md:px-10">
        <div className="flex flex-col gap-3">
          <Logo variant="primary" height={44} />
          <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
            © {new Date().getFullYear()} AccountTech.{" "}
            {t("Built for accounting firms in Saudi Arabia.", "مصممة للمكاتب المحاسبية في المملكة العربية السعودية.")}
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-x-7 gap-y-2" aria-label={t("Footer", "التذييل")}>
          {[
            ["/pricing", t("Pricing", "الأسعار")],
            ["/privacy", t("Privacy Policy", "سياسة الخصوصية")],
            ["/terms", t("Terms of Service", "شروط الخدمة")],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="text-[13.5px] font-medium hover:underline" style={{ color: "var(--text)" }}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
