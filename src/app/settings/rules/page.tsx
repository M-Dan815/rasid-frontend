"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/Shell";
import {
  ApiAccount,
  ApiClassificationRule,
  ApiError,
  deleteClassificationRule,
  getAccounts,
  getClassificationRules,
  updateClassificationRule,
} from "@/lib/api";
import { Toast } from "@/components/StatusPieces";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { useLocale } from "@/lib/i18n";

/**
 * Firm-level classification rules — the deterministic memory the classifier
 * consults before it ever calls an AI. **Editable**: rules can be edited
 * (matchText / account / kind) or deleted directly from this page. Anas
 * feedback #3 — previously the only way to fix a rule was to re-categorize
 * a transaction that matched it, which created a duplicate rather than
 * updating the existing one.
 */

type KindMeta = { label: string; color: string; hint: string };

const KIND_META: Record<string, KindMeta> = {
  substring: {
    label: "substring",
    color: "var(--text-2)",
    hint: "Matches this text anywhere in the bank description.",
  },
  merchant: {
    label: "merchant",
    color: "var(--accent)",
    hint: "Matches this text against the parsed counterparty name.",
  },
  "amount-pattern": {
    label: "amount-pattern",
    color: "var(--warn)",
    hint: "Matches the description substring AND an exact amount.",
  },
};

const UNKNOWN_KIND: KindMeta = {
  label: "unknown",
  color: "var(--text-2)",
  hint: "Unrecognized rule kind — the classifier may ignore it.",
};

function kindMeta(kind: string): KindMeta {
  return KIND_META[kind] ?? { ...UNKNOWN_KIND, label: kind };
}

/**
 * `createdFrom` is "seed" (no colon) or "<prefix>:<id>". Split defensively —
 * a naive split(":")[0] is fine, but guard against a null/missing value.
 */
function describeOrigin(
  createdFrom: string | null,
  tr: (en: string) => string,
): {
  label: string;
  color: string;
} {
  if (!createdFrom) return { label: "—", color: "var(--text-2)" };
  if (createdFrom === "seed" || createdFrom.startsWith("seed:"))
    return { label: tr("Seeded"), color: "var(--text-2)" };
  const prefix = createdFrom.split(":", 1)[0];
  switch (prefix) {
    case "accountant-approval":
      return { label: tr("From your approval"), color: "var(--good)" };
    case "manual-category":
      return { label: tr("Manual categorization"), color: "var(--accent)" };
    case "clarification":
      return { label: tr("From client clarification"), color: "var(--good)" };
    default:
      return { label: prefix, color: "var(--text-2)" };
  }
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function RulesPage() {
  const { tr } = useLocale();
  const ready = useAuthGuard();
  const [rules, setRules] = useState<ApiClassificationRule[] | null>(null);
  const [accounts, setAccounts] = useState<ApiAccount[] | null>(null);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Inline-edit state. Null = not editing. The form tracks the rule being
  // edited + a draft of the new matchText / accountId / ruleKind.
  const [editing, setEditing] = useState<{
    ruleId: string;
    matchText: string;
    accountId: string;
    ruleKind: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    getClassificationRules()
      .then((r) => alive && setRules(r))
      .catch((e) => {
        if (!alive) return;
        setError(
          e instanceof ApiError
            ? e.message
            : tr("Failed to load classification rules"),
        );
      });
    // Also load accounts so the edit dropdown has options.
    getAccounts()
      .then((a) => alive && setAccounts(a))
      .catch(() => {
        /* non-fatal — edit dropdown just won't have account options */
      });
    return () => {
      alive = false;
    };
  }, [ready]);

  function startEdit(r: ApiClassificationRule) {
    setEditing({
      ruleId: r.id,
      matchText: r.matchText,
      accountId: r.accountId,
      ruleKind: r.ruleKind,
    });
  }
  function cancelEdit() {
    setEditing(null);
  }
  async function saveEdit() {
    if (!editing) return;
    if (!editing.matchText.trim()) {
      setError("Match text cannot be empty");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await updateClassificationRule(editing.ruleId, {
        matchText: editing.matchText.trim(),
        accountId: editing.accountId,
        ruleKind: editing.ruleKind as
          | "substring"
          | "merchant"
          | "amount-pattern"
          | "beneficiary",
      });
      setRules((prev) =>
        prev ? prev.map((r) => (r.id === updated.id ? updated : r)) : prev,
      );
      setToast(tr("Rule updated"));
      setEditing(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tr("Update failed"));
    } finally {
      setBusy(false);
    }
  }
  async function deleteRule(r: ApiClassificationRule) {
    if (!confirm(tr("Delete this rule? Future transactions matching it will no longer be auto-classified."))) return;
    setBusy(true);
    setError(null);
    try {
      await deleteClassificationRule(r.id);
      setRules((prev) => (prev ? prev.filter((x) => x.id !== r.id) : prev));
      setToast(tr("Rule deleted"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tr("Delete failed"));
    } finally {
      setBusy(false);
    }
  }

  const kinds = useMemo(() => {
    const set = new Set<string>();
    for (const r of rules ?? []) set.add(r.ruleKind);
    return Array.from(set).sort();
  }, [rules]);

  const kindCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rules ?? [])
      counts.set(r.ruleKind, (counts.get(r.ruleKind) ?? 0) + 1);
    return counts;
  }, [rules]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rules ?? []).filter((r) => {
      if (kindFilter !== "all" && r.ruleKind !== kindFilter) return false;
      if (!q) return true;
      return (
        r.matchText.toLowerCase().includes(q) ||
        r.account.code.toLowerCase().includes(q) ||
        r.account.name.toLowerCase().includes(q) ||
        (r.account.nameAr ?? "").toLowerCase().includes(q)
      );
    });
  }, [rules, query, kindFilter]);

  if (!ready) return null;

  return (
    <Shell>
      <div className="p-8 md:p-10 max-w-5xl page-enter">
        <div className="rise mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard"
              className="text-[12px]"
              style={{ color: "var(--text-2)" }}
            >
              {tr("← Back to clients")}
            </Link>
          </div>
          <h1 className="display text-[24px]">
            {tr("Classification rules")}{" "}
            <span
              className="ar ar-secondary text-[16px]"
              style={{ color: "var(--text-2)" }}
            >
              قواعد التصنيف
            </span>
          </h1>
          <p
            className="text-sm mt-1 max-w-2xl"
            style={{ color: "var(--text-2)" }}
          >
            {tr("Deterministic rules the classifier checks")} <em>{tr("before")}</em> {tr("it calls an AI. Every rule here was either seeded with the firm or written from one of your own approvals. Read-only — to change what a rule says, override a transaction again on the reconciliation screen.")}
          </p>
        </div>

        {error && (
          <div
            className="text-[12px] px-3 py-2 mb-4"
            style={{ color: "var(--bad)", border: "1px solid var(--bad-line)" }}
          >
            {error}
          </div>
        )}

        {rules !== null && rules.length > 0 && (
          <div className="card-flat p-4 mb-6 flex items-center gap-6 flex-wrap rise">
            <div>
              <div
                className="text-[12px] "
                style={{ color: "var(--text-2)" }}
              >
                {tr("Total")}
              </div>
              <div className="mono text-[18px]">{rules.length}</div>
            </div>
            {kinds.map((k) => {
              const meta = kindMeta(k);
              return (
                <div key={k}>
                  <div
                    className="text-[12px] "
                    style={{ color: meta.color }}
                  >
                    {tr(meta.label)}
                  </div>
                  <div className="mono text-[18px]">
                    {kindCounts.get(k) ?? 0}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tr("Search match text or account…")}
            className="field flex-1 max-w-sm px-3 py-2 text-[12px]"
          />
          <div className="flex gap-1">
            {(["all", ...kinds] as string[]).map((k) => {
              const active = kindFilter === k;
              const label = k === "all" ? tr("All") : tr(kindMeta(k).label);
              return (
                <button
                  key={k}
                  onClick={() => setKindFilter(k)}
                  className="click-scale px-3 py-1.5 text-[12.5px]"
                  style={{
              borderRadius: 999,
                    background: active ? "var(--accent)" : "var(--surface)",
                    color: active ? "var(--on-accent)" : "var(--text-2)",
                    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {rules === null && !error && (
          <div className="text-[13px]" style={{ color: "var(--text-2)" }}>
            {tr("Loading rules…")}
          </div>
        )}

        {rules !== null && rules.length === 0 && (
          <div
            className="card-flat p-8 text-center text-[13px]"
            style={{ color: "var(--text-2)" }}
          >
            {tr("No rules yet. Rules appear here as you approve classifications on the reconciliation and exceptions screens.")}
          </div>
        )}

        {rules !== null && rules.length > 0 && filtered.length === 0 && (
          <div
            className="card-flat p-6 text-center text-[13px]"
            style={{ color: "var(--text-2)" }}
          >
            {tr("No rules match the current filter.")}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="card-flat overflow-x-auto rise">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {[tr("Match text"), tr("Kind"), tr("Account"), tr("Origin"), tr("Created"), tr("Actions")].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-start px-4 py-3 text-[12.5px] font-normal"
                        style={{ color: "var(--text-2)" }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const meta = kindMeta(r.ruleKind);
                  const origin = describeOrigin(r.createdFrom, tr);
                  const isEditing = editing?.ruleId === r.id;
                  return (
                    <tr
                      key={r.id}
                      className="row-hover align-top"
                      style={{ borderBottom: "1px solid var(--border-soft)" }}
                    >
                      <td className="px-4 py-3 mono text-[12px] max-w-[280px]">
                        {isEditing ? (
                          <input
                            value={editing!.matchText}
                            onChange={(e) =>
                              setEditing({
                                ...editing!,
                                matchText: e.target.value,
                              })
                            }
                            className="field w-full px-2 py-1 text-[12px]"
                          />
                        ) : (
                          <span className="break-all">{r.matchText}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select
                            value={editing!.ruleKind}
                            onChange={(e) =>
                              setEditing({
                                ...editing!,
                                ruleKind: e.target.value,
                              })
                            }
                            className="field px-2 py-1 text-[12px]"
                          >
                            <option value="substring">substring</option>
                            <option value="merchant">merchant</option>
                            <option value="beneficiary">beneficiary</option>
                            <option value="amount-pattern">amount-pattern</option>
                          </select>
                        ) : (
                          <span
                            className="text-[12px] px-2 py-0.5"
                            style={{
                              color: meta.color,
                              border: `1px solid color-mix(in srgb, ${meta.color} 35%, transparent)`,
                            }}
                            title={tr(meta.hint)}
                          >
                            {tr(meta.label)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[12px]">
                        {isEditing ? (
                          <select
                            value={editing!.accountId}
                            onChange={(e) =>
                              setEditing({
                                ...editing!,
                                accountId: e.target.value,
                              })
                            }
                            className="field w-full px-2 py-1 text-[12px]"
                          >
                            {(accounts ?? [])
                              .filter((a) => a.postable)
                              .map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.code} — {a.name}
                                  {a.nameAr ? ` (${a.nameAr})` : ""}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5">
                              <span
                                className="mono text-[12.5px]"
                                style={{ color: "var(--text-2)" }}
                              >
                                {r.account.code}
                              </span>
                              <span>{r.account.name}</span>
                              {r.account.requiresSupportingDoc && (
                                <span
                                  title={tr("This account requires a supporting document")}
                                  style={{ color: "var(--warn)" }}
                                >
                                  ⚠
                                </span>
                              )}
                            </div>
                            {r.account.nameAr && (
                              <div
                                className="ar text-[12.5px] mt-0.5"
                                style={{ color: "var(--text-2)" }}
                              >
                                {r.account.nameAr}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[12px]">
                        <span style={{ color: origin.color }}>
                          {origin.label}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 mono text-[12.5px] whitespace-nowrap"
                        style={{ color: "var(--text-2)" }}
                      >
                        {shortDate(r.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-[12px] whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex gap-1.5">
                            <button
                              disabled={busy}
                              onClick={saveEdit}
                              className="btn-primary click-scale px-2 py-1 text-[12px]"
                            >
                              {busy ? "…" : tr("Save")}
                            </button>
                            <button
                              disabled={busy}
                              onClick={cancelEdit}
                              className="btn-ghost click-scale px-2 py-1 text-[12px]"
                            >
                              {tr("Cancel")}
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1.5">
                            <button
                              disabled={busy}
                              onClick={() => startEdit(r)}
                              className="btn-ghost click-scale px-2 py-1 text-[12px]"
                            >
                              {tr("Edit")}
                            </button>
                            <button
                              disabled={busy}
                              onClick={() => deleteRule(r)}
                              className="btn-ghost click-scale px-2 py-1 text-[12px]"
                              style={{ color: "var(--bad)" }}
                            >
                              {tr("Delete")}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <div
            className="mt-4 text-[12.5px]"
            style={{ color: "var(--text-2)" }}
          >
            {rules?.length === 1
              ? tr("Showing {a} of {b} rule", { a: filtered.length, b: 1 })
              : tr("Showing {a} of {b} rules", { a: filtered.length, b: rules?.length ?? 0 })}.
          </div>
        )}
      </div>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </Shell>
  );
}
