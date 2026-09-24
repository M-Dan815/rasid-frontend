import type { Metadata } from "next";
import { cookies } from "next/headers";
import "@fontsource/figtree/latin-400.css";
import "@fontsource/figtree/latin-500.css";
import "@fontsource/figtree/latin-600.css";
import "@fontsource/figtree/latin-700.css";
import "@fontsource/noto-sans-arabic/arabic-400.css";
import "@fontsource/noto-sans-arabic/arabic-500.css";
import "@fontsource/noto-sans-arabic/arabic-600.css";
import "@fontsource/noto-sans-arabic/arabic-700.css";
import "@fontsource/noto-kufi-arabic/arabic-500.css";
import "@fontsource/noto-kufi-arabic/arabic-700.css";
import "./globals.css";
import { LocaleProvider } from "@/lib/i18n";
import { LOCALE_COOKIE, THEME_COOKIE, type Locale } from "@/lib/locale";

export const metadata: Metadata = {
  title: "AccountTech | أكاونت تك",
  description:
    "Reconciliation and financial statement preparation for accounting firms. Built for accountants. مصممة للمحاسبين.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const store = await cookies();
  const locale: Locale = store.get(LOCALE_COOKIE)?.value === "ar" ? "ar" : "en";
  const cookieTheme = store.get(THEME_COOKIE)?.value;
  const theme = cookieTheme === "dark" ? "dark" : "light";
  // No saved choice: follow the OS setting before first paint (no flash).
  const themeScript = `try{var m=document.cookie.match(/${THEME_COOKIE}=(light|dark)/);var t=m?m[1]:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=t}catch(e){}`;
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} data-theme={theme} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <LocaleProvider initial={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
