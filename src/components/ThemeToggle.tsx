"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { THEME_COOKIE, type Theme } from "@/lib/locale";

export function ThemeToggle({
  tone = "light",
  className = "",
}: {
  tone?: "light" | "navy";
  className?: string;
}) {
  const { t } = useLocale();
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  const onNavy = tone === "navy";
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? t("Switch to light mode", "التبديل إلى الوضع الفاتح") : t("Switch to dark mode", "التبديل إلى الوضع الداكن")}
      aria-pressed={dark}
      className={`click-scale inline-flex h-[34px] w-[34px] items-center justify-center rounded-full transition-colors ${className}`}
      style={{
        color: onNavy ? "#E4EBF5" : "var(--text)",
        border: `1px solid ${onNavy ? "rgba(255,255,255,.28)" : "var(--border)"}`,
      }}
    >
      {dark ? <Sun size={16} strokeWidth={2} aria-hidden /> : <Moon size={16} strokeWidth={2} aria-hidden />}
    </button>
  );
}
