"use client";

import { useRef, useState } from "react";
import { FileText, UploadCloud, X } from "lucide-react";
import { useLocale } from "@/lib/i18n";

export function UploadZone({
  label,
  hint,
  accept,
  files,
  onFiles,
  onRemove,
}: {
  label: string;
  hint: string;
  accept: string;
  files: File[];
  onFiles: (files: File[]) => void;
  onRemove: (index: number) => void;
}) {
  const { t, n } = useLocale();
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(incoming: FileList | null) {
    if (!incoming || incoming.length === 0) return;
    onFiles(Array.from(incoming));
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        addFiles(e.dataTransfer.files);
      }}
      className="flex flex-col rounded-2xl p-5 transition-colors"
      style={{
        border: `1.5px dashed ${drag ? "var(--accent)" : "#b8c6d3"}`,
        background: drag ? "var(--teal-tint)" : "var(--surface)",
      }}
    >
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="click-scale flex flex-col items-center rounded-xl px-2 py-6 text-center"
      >
        <span
          className="mb-3 flex h-11 w-11 items-center justify-center rounded-full"
          style={{ background: "var(--good-bg)", color: "var(--accent)" }}
        >
          <UploadCloud size={22} strokeWidth={2} aria-hidden />
        </span>
        <span className="text-[15.5px] font-bold" style={{ color: "var(--text)" }}>
          {label}
        </span>
        <span className="mt-1 text-[13.5px]" style={{ color: "var(--text-2)" }}>
          {hint}
        </span>
        <span className="mt-3 text-[13.5px] font-semibold" style={{ color: "var(--accent)" }}>
          {t("Drag and drop or choose files", "اسحب الملفات أو اخترها")}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        tabIndex={-1}
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {files.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${f.size}-${i}`}
              className="rise flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-[13.5px]"
              style={{ background: "var(--surface-2)" }}
            >
              <span className="flex min-w-0 items-center gap-2">
                <FileText size={16} strokeWidth={2} className="shrink-0" style={{ color: "var(--text)" }} aria-hidden />
                <span className="truncate" dir="auto">
                  {f.name}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="num text-[12.5px]" style={{ color: "var(--text-2)" }}>
                  {n(Math.round(f.size / 1024))} KB
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="rounded p-1 hover:bg-[var(--surface)]"
                  style={{ color: "var(--text-2)" }}
                  aria-label={t(`Remove ${f.name}`, `إزالة ${f.name}`)}
                >
                  <X size={15} strokeWidth={2.2} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
