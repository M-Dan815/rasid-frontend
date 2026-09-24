"use client";

import { Languages } from "lucide-react";
import { useLocale } from "@/lib/i18n";

export function LanguageToggle({
  tone = "light",
  className = "",
}: {
  tone?: "light" | "navy";
  className?: string;
}) {
  const { locale, setLocale } = useLocale();
  const next = locale === "ar" ? "en" : "ar";
  const onNavy = tone === "navy";
  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      lang={next}
      aria-label={next === "ar" ? "التبديل إلى العربية" : "Switch to English"}
      className={`click-scale inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${className}`}
      style={{
        color: onNavy ? "#E4EBF5" : "var(--text)",
        border: `1px solid ${onNavy ? "rgba(255,255,255,.28)" : "var(--border)"}`,
      }}
    >
      <Languages size={15} strokeWidth={2} aria-hidden />
      {next === "ar" ? "العربية" : "English"}
    </button>
  );
}
