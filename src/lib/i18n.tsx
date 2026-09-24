"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { LOCALE_COOKIE, type Locale } from "@/lib/locale";
import { AR } from "@/lib/ar";
export type { Locale };

type Ctx = {
  locale: Locale;
  dir: "ltr" | "rtl";
  setLocale: (l: Locale) => void;
  /** Pick the string for the active language: t("Upload", "رفع") */
  t: (en: string, ar: string) => string;
  /** Translate an English source string via the dictionary (falls back to English). */
  tr: (en: string, vars?: Record<string, string | number>) => string;
  /** Format a number using the numeral style of the active language. */
  n: (v: number, opts?: Intl.NumberFormatOptions) => string;
};

const LocaleContext = createContext<Ctx | null>(null);

export function LocaleProvider({
  initial,
  children,
}: {
  initial: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initial);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = l;
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
  }, []);

  const value = useMemo<Ctx>(() => {
    const dir = locale === "ar" ? "rtl" : "ltr";
    return {
      locale,
      dir,
      setLocale,
      t: (en, ar) => (locale === "ar" ? ar : en),
      tr: (en, vars) => {
        let out = locale === "ar" ? (AR[en] ?? en) : en;
        if (vars) for (const k in vars) out = out.split(`{${k}}`).join(String(vars[k]));
        return out;
      },
      n: (v, opts) =>
        new Intl.NumberFormat(locale === "ar" ? "ar-SA-u-nu-arab" : "en-US", opts).format(v),
    };
  }, [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Ctx {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside <LocaleProvider>");
  return ctx;
}
