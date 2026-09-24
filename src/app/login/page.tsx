"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ApiError, login, registerFirm, setSession } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { AngledForms } from "@/components/AngledForms";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLocale } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firmName, setFirmName] = useState("");
  const [firmNameAr, setFirmNameAr] = useState("");
  const [yourName, setYourName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res =
        mode === "login"
          ? await login(email, password)
          : await registerFirm({
              firmName,
              firmNameAr: firmNameAr || undefined,
              name: yourName,
              email,
              password,
            });
      setSession(res.token, res.firm, res.user);
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : t("Something went wrong. Please try again.", "حدث خطأ ما. يرجى المحاولة مرة أخرى."),
      );
      setLoading(false);
    }
  }

  const label = "mb-1.5 block text-[13.5px] font-semibold";
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]" style={{ background: "var(--surface)" }}>
      {/* Brand panel */}
      <aside className="on-navy relative hidden overflow-hidden lg:block" style={{ background: "var(--inverse-bg)" }}>
        <AngledForms className="pointer-events-none absolute -end-32 -bottom-20 w-[600px]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link href="/" aria-label="AccountTech">
            <span className="inline-block rounded-xl bg-white px-4 py-3">
              <Logo variant="primary" height={46} plate={false} />
            </span>
          </Link>
          <div className="max-w-[440px] pb-24">
            <h2 className="display text-[44px]" style={{ color: "#fff" }}>
              {t("Precision made clear.", "دقة تُصمَّم بوضوح.")}
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed" style={{ color: "#C8D3E0" }}>
              {t(
                "Reconciliation and financial statement preparation, built around trust, clarity, precision and progress.",
                "مطابقة وإعداد قوائم مالية، مبنيان على الثقة والوضوح والدقة والتقدم.",
              )}
            </p>
          </div>
        </div>
      </aside>

      {/* Form */}
      <main className="flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 sm:px-10">
          <Link href="/" className="lg:invisible" aria-label="AccountTech">
            <Logo variant="primary" height={42} />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
          <div className="rise w-full max-w-[420px]">
            <h1 className="display text-[32px]" style={{ color: "var(--text)" }}>
              {mode === "login" ? t("Sign in to your firm", "تسجيل الدخول إلى مكتبك") : t("Create your firm account", "إنشاء حساب المكتب")}
            </h1>
            <p className="mt-2 text-[15px]" style={{ color: "var(--text-2)" }}>
              {t("Each firm's data stays fully isolated.", "بيانات كل مكتب معزولة تماماً.")}
            </p>

            <div className="mb-7 mt-8 flex gap-7" style={{ borderBottom: "1px solid var(--border)" }} role="tablist">
              {(["login", "register"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => {
                    setMode(m);
                    setError(null);
                  }}
                  className={`tab-underline pb-3 text-[14.5px] font-semibold ${mode === m ? "active" : ""}`}
                  style={{ color: mode === m ? "var(--text)" : "var(--text-2)" }}
                >
                  {m === "login" ? t("Firm login", "دخول المكتب") : t("Register firm", "تسجيل مكتب")}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-4">
              {mode === "register" && (
                <>
                  <div className="fade">
                    <label htmlFor="firmName" className={label}>{t("Firm name", "اسم المكتب")}</label>
                    <input
                      id="firmName"
                      required
                      minLength={2}
                      value={firmName}
                      onChange={(e) => setFirmName(e.target.value)}
                      className="field w-full px-3.5 py-3 text-[15px]"
                      placeholder={t("e.g. Al Fanar Accounting Partners", "مثال: مؤسسة الفنار للمحاسبة")}
                    />
                  </div>
                  <div className="fade">
                    <label htmlFor="firmNameAr" className={label}>{t("Firm name in Arabic (optional)", "اسم المكتب بالعربية (اختياري)")}</label>
                    <input
                      id="firmNameAr"
                      dir="rtl"
                      value={firmNameAr}
                      onChange={(e) => setFirmNameAr(e.target.value)}
                      className="field ar w-full px-3.5 py-3 text-[15px]"
                      placeholder="مثال: مؤسسة الفنار للمحاسبة"
                    />
                  </div>
                  <div className="fade">
                    <label htmlFor="yourName" className={label}>{t("Your name", "اسمك")}</label>
                    <input
                      id="yourName"
                      required
                      value={yourName}
                      onChange={(e) => setYourName(e.target.value)}
                      className="field w-full px-3.5 py-3 text-[15px]"
                      placeholder={t("e.g. Sarah Al-Otaibi", "مثال: سارة العتيبي")}
                    />
                  </div>
                </>
              )}
              <div>
                <label htmlFor="email" className={label}>{t("Work email", "البريد الإلكتروني للعمل")}</label>
                <input
                  id="email"
                  required
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field w-full px-3.5 py-3 text-[15px] text-start"
                  placeholder="you@firm.sa"
                />
              </div>
              <div>
                <label htmlFor="password" className={label}>{t("Password", "كلمة المرور")}</label>
                <input
                  id="password"
                  required
                  type="password"
                  dir="ltr"
                  minLength={mode === "register" ? 8 : 1}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field w-full px-3.5 py-3 text-[15px] text-start"
                  placeholder="••••••••••"
                />
                {mode === "register" && (
                  <p className="mt-1.5 text-[13px]" style={{ color: "var(--text-2)" }}>
                    {t("At least 8 characters.", "٨ أحرف على الأقل.")}
                  </p>
                )}
              </div>
              {error && (
                <div
                  role="alert"
                  className="rounded-[10px] px-3.5 py-2.5 text-[14px]"
                  style={{ color: "var(--bad)", background: "var(--bad-bg)", border: "1px solid var(--bad-line)" }}
                >
                  {error}
                </div>
              )}
              <button
                disabled={loading}
                className="btn-primary click-scale mt-2 flex w-full items-center justify-center gap-2.5 py-3.5 text-[15px]"
              >
                {loading ? (
                  <>
                    <span className="spin" aria-hidden />
                    {t("Verifying…", "جارٍ التحقق…")}
                  </>
                ) : mode === "login" ? (
                  t("Enter firm workspace", "دخول مساحة عمل المكتب")
                ) : (
                  t("Create firm account", "إنشاء حساب المكتب")
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
