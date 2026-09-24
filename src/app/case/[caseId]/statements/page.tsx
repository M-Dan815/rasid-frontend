"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ApiError,
  BalanceSheet,
  CashFlow,
  CashFlowSection,
  IncomeStatement,
  StatementNode,
  downloadExport,
  getBalanceSheet,
  getCase,
  getCashFlow,
  getIncomeStatement,
  openDocument,
} from "@/lib/api";
import { LedgerDrilldown, DrillAccount } from "@/components/LedgerDrilldown";
import { Toast } from "@/components/StatusPieces";
import { useLocale } from "@/lib/i18n";

type Tab = "income" | "balance" | "cashflow";

function TreeRows({
  nodes,
  depth,
  onDrill,
}: {
  nodes: StatementNode[];
  depth: number;
  onDrill: (n: StatementNode) => void;
}) {
  const { tr, locale } = useLocale();
  return (
    <>
      {nodes.map((n) => {
        const hasKids = n.children.length > 0;
        const indent = { paddingInlineStart: 16 + depth * 22 };
        return (
          <Fragment key={`${n.code}-${n.id ?? "section"}`}>
            {hasKids ? (
              <div
                className="px-4 py-2.5 text-[13px] font-medium"
                style={{ borderTop: "1px solid var(--border)", ...indent }}
              >
                {n.code} - {locale === "ar" && n.nameAr ? n.nameAr : n.name}
                <span
                  className={`${locale === "ar" ? "" : "ar "}text-[12.5px] ms-2`}
                  style={{ color: "var(--text-2)" }}
                >
                  {locale === "ar" ? n.name : n.nameAr}
                </span>
              </div>
            ) : (
              <button
                onClick={() => n.id && onDrill(n)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-start text-[13px] ${n.id ? "row-hover click-scale cursor-pointer" : "cursor-default"}`}
                style={{ borderTop: "1px solid var(--border-soft)", ...indent }}
              >
                <span>
                  {locale === "ar" && n.nameAr ? n.nameAr : n.name}{" "}
                  <span
                    className={`${locale === "ar" ? "" : "ar "}text-[12.5px] ms-1`}
                    style={{ color: "var(--text-2)" }}
                  >
                    {locale === "ar" ? n.name : n.nameAr}
                  </span>
                  {n.id && (
                    <span
                      className="text-[12px] ms-2 underline decoration-dotted"
                      style={{ color: "var(--accent)" }}
                    >
                      {tr("trace")} <span className="arrow-nudge">→</span>
                    </span>
                  )}
                </span>
                <span className="mono">{n.formatted}</span>
              </button>
            )}
            {hasKids && (
              <TreeRows
                nodes={n.children}
                depth={depth + 1}
                onDrill={onDrill}
              />
            )}
            {hasKids && (
              <div
                className="flex items-center justify-between px-4 py-2 text-[12px] italic"
                style={{
                  borderTop: "1px solid var(--border-soft)",
                  ...indent,
                  color: "var(--text-2)",
                }}
              >
                <span>
                  {locale === "ar" ? "مجموع" : "Total"} {n.code} - {locale === "ar" && n.nameAr ? n.nameAr : n.name}
                </span>
                <span className="mono">{n.formatted}</span>
              </div>
            )}
          </Fragment>
        );
      })}
    </>
  );
}

function TotalRow({
  label,
  labelAr,
  value,
  strong,
  accent,
}: {
  label: string;
  labelAr: string;
  value: string;
  strong?: boolean;
  accent?: boolean;
}) {
  const { locale } = useLocale();
  return (
    <div
      className="flex items-center justify-between px-4 py-3"
      style={{
        borderTop: "1px solid var(--border)",
        background: accent ? "var(--teal-tint)" : "transparent",
      }}
    >
      <span className={strong ? "font-medium text-[13px]" : "text-[13px]"}>
        {locale === "ar" ? labelAr : label}{" "}
        <span
          className={`${locale === "ar" ? "" : "ar "}text-[12.5px] ms-1`}
          style={{ color: "var(--text-2)" }}
        >
          {locale === "ar" ? label : labelAr}
        </span>
      </span>
      <span
        className={`mono ${strong ? "font-medium" : ""}`}
        style={{ color: accent ? "var(--accent)" : "var(--text)" }}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * One indirect-method cash-flow section (operating / investing / financing).
 * Renders the section's line items, then its total. Matches the shape
 * returned by buildCashFlowStatement() on the backend.
 */
function CashFlowSectionView({
  title,
  titleAr,
  section,
  accent,
}: {
  title: string;
  titleAr: string;
  section: CashFlowSection;
  accent?: boolean;
}) {
  const { tr, locale } = useLocale();
  const empty = section.lines.length === 0;
  return (
    <>
      <div
        className="px-4 pt-3 pb-1 text-[12px] "
        style={{ color: "var(--text-2)" }}
      >
        {locale === "ar" ? titleAr : title} — <span className={locale === "ar" ? "" : "ar"}>{locale === "ar" ? title : titleAr}</span>
      </div>
      {empty ? (
        <div
          className="px-4 py-2.5 text-[13px] italic"
          style={{
            borderTop: "1px solid var(--border-soft)",
            color: "var(--text-2)",
          }}
        >
          {tr("No movement in this section.")}
        </div>
      ) : (
        section.lines.map((l, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-4 py-2.5 text-[13px]"
            style={{ borderTop: "1px solid var(--border-soft)" }}
          >
            <span>
              {locale === "ar" ? l.labelAr : l.label}{" "}
              <span
                className={`${locale === "ar" ? "" : "ar "}text-[12.5px] ms-1`}
                style={{ color: "var(--text-2)" }}
              >
                {locale === "ar" ? l.label : l.labelAr}
              </span>
            </span>
            <span
              className="mono"
              style={{ color: l.amount < 0 ? "var(--text)" : "var(--good)" }}
            >
              {l.formatted}
            </span>
          </div>
        ))
      )}
      <TotalRow
        label={`Net cash from ${title.toLowerCase()}`}
        labelAr={`صافي النقد من ${titleAr}`}
        value={section.totalFormatted}
        strong
        accent={accent}
      />
    </>
  );
}

export default function StatementsPage() {
  const { tr, locale } = useLocale();
  const params = useParams<{ caseId: string }>();
  const caseId = params.caseId;

  const [tab, setTab] = useState<Tab>("income");
  const [income, setIncome] = useState<IncomeStatement | null>(null);
  const [balance, setBalance] = useState<BalanceSheet | null>(null);
  const [cash, setCash] = useState<CashFlow | null>(null);
  const [docKeys, setDocKeys] = useState<Map<string, string>>(new Map());
  const [drill, setDrill] = useState<DrillAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyExport, setBusyExport] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [inc, bal, cf, kase] = await Promise.all([
        getIncomeStatement(caseId),
        getBalanceSheet(caseId),
        getCashFlow(caseId),
        getCase(caseId),
      ]);
      setIncome(inc);
      setBalance(bal);
      setCash(cf);
      setDocKeys(
        new Map((kase.documents ?? []).map((d) => [d.id, d.storageKey])),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tr("Failed to load statements"));
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    load();
  }, [load]);

  function openDrill(n: StatementNode) {
    if (!n.id) return;
    setDrill({ id: n.id, code: n.code, name: n.name, nameAr: n.nameAr });
  }

  async function doExport(format: "xlsx" | "pdf") {
    setBusyExport(true);
    try {
      const kind =
        tab === "income"
          ? "income-statement"
          : tab === "balance"
            ? "balance-sheet"
            : "cash-flow";
      await downloadExport(caseId, kind, `accounttech-${kind}.${format}`, format);
      setToast(format === "pdf" ? tr("PDF exported") : tr("Excel exported"));
    } catch (e) {
      setToast(e instanceof ApiError ? e.message : tr("Export failed"));
    } finally {
      setBusyExport(false);
    }
  }

  const tabs: [Tab, string, string][] = [
    ["income", "Income Statement", "قائمة الدخل"],
    ["balance", "Balance Sheet", "قائمة المركز المالي"],
    ["cashflow", "Cash Flow", "قائمة التدفقات النقدية"],
  ];

  return (
    <div className="p-8 md:p-10 max-w-3xl page-enter">
      <div className="rise mb-6">
        <h1 className="display text-[32px]">{tr("Financial Statements")}</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-2)" }}>
          {tr("Generated from the approved trial balance. Click any line to see its source. Cash Flow uses the indirect method.")}
        </p>
      </div>

      <div
        className="flex gap-6 mb-7 rise"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {tabs.map(([k, en, ar]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`tab-underline click-scale pb-3 text-start ${tab === k ? "active" : ""}`}
          >
            <div
              className="text-[13px]"
              style={{ color: tab === k ? "var(--text)" : "var(--text-2)" }}
            >
              {locale === "ar" ? ar : en}
            </div>
            <div
              className={`${locale === "ar" ? "" : "ar "}text-[12.5px]`}
              style={{ color: tab === k ? "var(--accent)" : "var(--text-2)" }}
            >
              {locale === "ar" ? en : ar}
            </div>
          </button>
        ))}
      </div>

      {error && (
        <div className="card-flat p-6 rise">
          <div className="text-[13px] mb-3" style={{ color: "var(--bad)" }}>
            {error}
          </div>
          <button
            onClick={load}
            className="btn-ghost click-scale px-4 py-2 text-[12px]"
          >
            {tr("Retry")}
          </button>
        </div>
      )}

      {loading && !error && (
        <div
          className="card-flat p-8 text-center rise text-[13px]"
          style={{ color: "var(--text-2)" }}
        >
          {tr("Preparing statements…")}
        </div>
      )}

      {!loading && !error && income && tab === "income" && (
        <div className="card-flat p-2 rise">
          <TreeRows nodes={income.revenue} depth={0} onDrill={openDrill} />
          <TotalRow
            label="Total Revenue"
            labelAr="إجمالي الإيرادات"
            value={income.totalRevenueFormatted}
            strong
          />
          <div className="h-2" />
          <TreeRows nodes={income.directCosts} depth={0} onDrill={openDrill} />
          <TotalRow
            label="Total Direct Costs"
            labelAr="إجمالي التكاليف المباشرة"
            value={income.totalDirectCostsFormatted}
          />
          <TotalRow
            label="Gross Profit"
            labelAr="مجمل الربح"
            value={income.grossProfitFormatted}
            strong
          />
          <div className="h-2" />
          <TreeRows
            nodes={income.operatingCosts}
            depth={0}
            onDrill={openDrill}
          />
          <TotalRow
            label="Total Operating Costs"
            labelAr="إجمالي المصاريف التشغيلية"
            value={income.totalOperatingCostsFormatted}
          />
          <TotalRow
            label="Net Income before Zakat"
            labelAr="صافي الدخل قبل الزكاة"
            value={income.netIncomeBeforeZakatFormatted}
            strong
          />
          <TotalRow
            label="Net Profit"
            labelAr="صافي الربح"
            value={income.netProfitFormatted}
            strong
            accent
          />
        </div>
      )}

      {!loading && !error && balance && tab === "balance" && (
        <>
          <div className="card-flat p-2 rise">
            <TreeRows nodes={balance.assets} depth={0} onDrill={openDrill} />
            <TotalRow
              label="Total Assets"
              labelAr="مجموع الأصول"
              value={balance.totalAssetsFormatted}
              strong
            />
            <div className="h-2" />
            <TreeRows
              nodes={balance.liabilities}
              depth={0}
              onDrill={openDrill}
            />
            <TotalRow
              label="Total Liabilities"
              labelAr="مجموع الالتزامات"
              value={balance.totalLiabilitiesFormatted}
              strong
            />
            <div className="h-2" />
            <TreeRows nodes={balance.equity} depth={0} onDrill={openDrill} />
            <TotalRow
              label="Total Equity"
              labelAr="مجموع حقوق الملكية"
              value={balance.totalEquityFormatted}
              strong
            />
          </div>
          <div className="flex items-center gap-2 mt-4 rise">
            <span
              className="status-dot"
              style={{
                background: balance.balanced ? "var(--good)" : "var(--bad)",
              }}
            />
            <span
              className="text-[12px]"
              style={{ color: balance.balanced ? "var(--good)" : "var(--bad)" }}
            >
              {balance.balanced
                ? tr("Assets = Liabilities + Equity — balanced (net income {amt} folded into retained earnings)", { amt: balance.netIncomeForPeriodFormatted })
                : tr("Out of balance — check the trial balance")}
            </span>
          </div>
        </>
      )}

      {!loading && !error && cash && tab === "cashflow" && (
        <div className="card-flat p-2 rise">
          <CashFlowSectionView
            title={tr("Operating activities")}
            titleAr="الأنشطة التشغيلية"
            section={cash.operating}
          />
          <div className="h-2" />
          <CashFlowSectionView
            title={tr("Investing activities")}
            titleAr="الأنشطة الاستثمارية"
            section={cash.investing}
          />
          <div className="h-2" />
          <CashFlowSectionView
            title={tr("Financing activities")}
            titleAr="الأنشطة التمويلية"
            section={cash.financing}
          />
          <TotalRow
            label="Net Cash Movement"
            labelAr="صافي التغير في النقدية"
            value={cash.netCashMovementFormatted}
            strong
            accent
          />
          <div
            className="px-4 pb-3 pt-1 text-[12.5px]"
            style={{ color: "var(--text-2)" }}
          >
            {tr("Indirect method — derived from the approved Trial Balance.")}
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="mt-6 flex gap-3 rise">
          <button
            disabled={busyExport}
            onClick={() => doExport("xlsx")}
            className="btn-primary click-scale px-4 py-2 text-sm"
          >
            {busyExport ? tr("Exporting…") : tr("Export Excel")}
          </button>
          <button
            disabled={busyExport}
            onClick={() => doExport("pdf")}
            className="btn-ghost click-scale px-4 py-2 text-sm"
          >
            {tr("Export PDF")}
          </button>
        </div>
      )}

      <LedgerDrilldown
        caseId={caseId}
        account={drill}
        onOpenDoc={(docId) => {
          const key = docKeys.get(docId);
          if (key)
            openDocument(key).catch(() =>
              setToast(tr("Could not open the source document")),
            );
        }}
        onClose={() => setDrill(null)}
      />
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
