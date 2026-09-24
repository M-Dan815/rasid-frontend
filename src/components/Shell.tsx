"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookMarked,
  FileText,
  ArrowLeftRight,
  ListFilter,
  LogOut,
  Menu,
  MessageSquareText,
  ScanText,
  Scale,
  SlidersHorizontal,
  TriangleAlert,
  Upload,
  Users,
  X,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import { clearSession, getSessionFirm } from "@/lib/api";
import { Client, Case } from "@/lib/data";
import { useLocale } from "@/lib/i18n";
import { LockupPlate } from "@/components/Logo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Pipeline order matches the backend: classify runs before reconcile, so
 * the review screens appear in the order the accountant actually works:
 * extract → reconcile → exceptions (accountant lane) → clarifications
 * (client lane) → opening balances → adjustments → TB → statements.
 *
 * Opening Balances and Adjustments sit next to the Trial Balance because
 * they feed the readiness checklist that gates TB approval (see
 * modules/trial-balance/readiness.service.ts on the backend).
 */
const NAV: { key: string; en: string; ar: string; Icon: LucideIcon }[] = [
  { key: "upload", en: "Upload", ar: "رفع المستندات", Icon: Upload },
  { key: "extraction", en: "Extraction", ar: "الاستخراج", Icon: ScanText },
  { key: "reconciliation", en: "Reconciliation", ar: "المطابقة", Icon: ArrowLeftRight },
  { key: "exceptions", en: "Exceptions", ar: "الاستثناءات", Icon: TriangleAlert },
  { key: "clarifications", en: "Clarifications", ar: "الاستفسارات", Icon: MessageSquareText },
  { key: "opening-balances", en: "Opening balances", ar: "الأرصدة الافتتاحية", Icon: BookMarked },
  { key: "adjustments", en: "Adjustments", ar: "التسويات", Icon: SlidersHorizontal },
  { key: "trial-balance", en: "Trial Balance", ar: "ميزان المراجعة", Icon: Scale },
  { key: "statements", en: "Statements", ar: "القوائم المالية", Icon: FileText },
];

const ON_NAVY = "#C8D3E0"; // 9:1 on navy
const HOVER_BG = "rgba(255,255,255,.07)";

function NavLink({
  href,
  active,
  Icon,
  children,
}: {
  href: string;
  active: boolean;
  Icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="nav-link click-scale flex items-center gap-3 rounded-full px-3.5 py-2 text-[13.5px] transition-colors"
      style={{
        background: active ? "var(--teal)" : "transparent",
        color: active ? "var(--navy-deep)" : ON_NAVY,
        fontWeight: active ? 600 : 500,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = HOVER_BG;
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      <Icon size={18} strokeWidth={2} aria-hidden />
      <span className="truncate">{children}</span>
    </Link>
  );
}

function SidebarBody({
  client,
  kase,
  firmName,
  onSignOut,
}: {
  client?: Client;
  kase?: Case;
  firmName: string | null;
  onSignOut: () => void;
}) {
  const pathname = usePathname();
  const { t, locale } = useLocale();
  const activeStep = pathname.split("/").pop();
  const onRules = pathname.startsWith("/settings/rules");

  return (
    <div className="on-navy flex h-full flex-col" style={{ color: "#fff" }}>
      <Link href="/dashboard" className="flex items-center gap-3 px-5 pt-5 pb-4" aria-label="AccountTech">
        <LockupPlate height={34} />
      </Link>

      {client && kase && (
        <div className="mx-4 mb-2 rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,.07)" }}>
          <div className="text-[12px]" style={{ color: "#AFC0D6" }}>
            {t("Active case", "الحالة الحالية")}
          </div>
          <div className="mt-0.5 text-[14px] font-semibold leading-snug">
            {locale === "ar" && client.nameAr ? client.nameAr : client.name}
          </div>
          <div className="text-[13px]" style={{ color: "var(--mint)" }}>
            {kase.label}
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label={t("Main", "التنقل الرئيسي")}>
        <NavLink href="/dashboard" active={pathname === "/dashboard"} Icon={Users}>
          {t("Clients", "العملاء")}
        </NavLink>

        {client && kase && (
          <>
            <div className="mx-3 mt-5 mb-1.5 text-[12px]" style={{ color: "#9FB2CC" }}>
              {t("Case workflow", "مسار الحالة")}
            </div>
            <div className="space-y-0.5">
              {NAV.map(({ key, en, ar, Icon }) => (
                <NavLink key={key} href={`/case/${kase.id}/${key}`} active={activeStep === key} Icon={Icon}>
                  {t(en, ar)}
                </NavLink>
              ))}
            </div>
          </>
        )}

        <div className="mx-3 my-4 h-px" style={{ background: "rgba(255,255,255,.14)" }} />
        <NavLink href="/settings/rules" active={onRules} Icon={ListFilter}>
          {t("Classification rules", "قواعد التصنيف")}
        </NavLink>
      </nav>

      <div className="space-y-3 px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,.14)" }}>
        <div className="flex items-center gap-2">
          <LanguageToggle tone="navy" />
          <ThemeToggle tone="navy" />
        </div>
        <Link
          href="/"
          className="back-link flex w-fit items-center gap-2 text-[13px]"
          style={{ color: ON_NAVY }}
        >
          <ArrowLeft size={15} strokeWidth={2} className="rtl-flip" aria-hidden />
          {t("Back to homepage", "العودة إلى الموقع")}
        </Link>
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-2 text-start text-[13px]"
          style={{ color: ON_NAVY }}
        >
          <LogOut size={15} strokeWidth={2} className="rtl-flip shrink-0" aria-hidden />
          <span className="truncate">
            {t("Sign out", "تسجيل الخروج")}
            {firmName ? ` · ${firmName}` : ""}
          </span>
        </button>
      </div>
    </div>
  );
}

export function Shell({
  children,
  client,
  kase,
}: {
  children: React.ReactNode;
  client?: Client;
  kase?: Case;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLocale();
  const [firmName, setFirmName] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setFirmName(getSessionFirm()?.name ?? null);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const signOut = () => {
    clearSession();
    router.push("/login");
  };

  const body = <SidebarBody client={client} kase={kase} firmName={firmName} onSignOut={signOut} />;

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className="sticky top-0 hidden h-screen w-[248px] shrink-0 md:block"
        style={{ background: "var(--sidebar)" }}
      >
        {body}
      </aside>

      {/* Mobile top bar + drawer */}
      <div
        className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between px-4 md:hidden"
        style={{ background: "var(--sidebar)" }}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5 text-white" aria-label="AccountTech">
          <LockupPlate height={26} />
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label={t("Open menu", "فتح القائمة")}
          className="on-navy rounded-lg p-2 text-white"
        >
          <Menu size={22} strokeWidth={2} />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div className="fade absolute inset-0" style={{ background: "var(--scrim)" }} onClick={() => setOpen(false)} />
          <div
            className="rise absolute inset-y-0 start-0 w-[288px] max-w-[86vw]"
            style={{ background: "var(--sidebar)" }}
          >
            <button
              onClick={() => setOpen(false)}
              aria-label={t("Close menu", "إغلاق القائمة")}
              className="on-navy absolute end-3 top-4 rounded-lg p-1.5 text-white"
            >
              <X size={20} strokeWidth={2} />
            </button>
            {body}
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 pt-14 md:pt-0">{children}</main>
    </div>
  );
}
