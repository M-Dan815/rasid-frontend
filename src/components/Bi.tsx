"use client";

import { useLocale } from "@/lib/i18n";

/**
 * Bilingual account/label pair. The active language leads; the other sits
 * beside it in a quieter tone, so Arabic users read Arabic first.
 */
export function Bi({
  en,
  ar,
  className = "text-[12.5px]",
}: {
  en: string;
  ar?: string | null;
  className?: string;
}) {
  const { locale } = useLocale();
  const primary = locale === "ar" && ar ? ar : en;
  const secondary = locale === "ar" ? (ar ? en : null) : ar;
  return (
    <>
      {primary}
      {secondary ? (
        <>
          {" "}
          <span
            className={`${locale === "ar" ? "" : "ar "}${className}`}
            style={{ color: "var(--text-2)" }}
          >
            {secondary}
          </span>
        </>
      ) : null}
    </>
  );
}
