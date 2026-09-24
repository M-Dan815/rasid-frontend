"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLocale } from "@/lib/i18n";

export function MarketingHeader() {
  const pathname = usePathname();
  const { t } = useLocale();
  const links: [string, string][] = [
    ["/", t("Home", "الرئيسية")],
    ["/pricing", t("Pricing", "الأسعار")],
  ];
  return (
    <header
      className="sticky top-0 z-30"
      style={{
        borderBottom: "1px solid var(--border-soft)",
        background: "var(--header-bg)",
        backdropFilter: "saturate(1.4) blur(10px)",
      }}
    >
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-5 md:px-10">
        <Link href="/" aria-label="AccountTech" className="shrink-0">
          <Logo variant="primary" height={46} priority />
        </Link>

        <nav className="hidden items-center gap-8 sm:flex" aria-label={t("Main", "التنقل الرئيسي")}>
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={`tab-underline pb-1 text-[14px] font-medium ${pathname === href ? "active" : ""}`}
              style={{ color: pathname === href ? "var(--text)" : "var(--text-2)" }}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <ThemeToggle />
          <LanguageToggle />
          <Link
            href="/login"
            className="hidden px-2 text-[14px] font-medium md:inline"
            style={{ color: "var(--text)" }}
          >
            {t("Firm login", "دخول المكاتب")}
          </Link>
          <Link href="/login" className="btn-primary click-scale px-4 py-2.5 text-[14px]">
            {t("Get started", "ابدأ الآن")}
          </Link>
        </div>
      </div>
    </header>
  );
}
