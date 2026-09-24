export type CaseStatus =
  | "in-review"
  | "exceptions"
  | "complete"
  | "uploading"
  | "processing"
  | "tb-approved";

export type Case = {
  id: string;
  label: string;
  status: CaseStatus;
  updated: string;
};

export type Client = {
  id: string;
  name: string;
  nameAr: string;
  cases: Case[];
};

export type MatchStatus = "matched" | "needs-review" | "unmatched";
export type CategorySource = "rule" | "ai" | "manual";

export type Transaction = {
  id: string;
  date: string;
  desc: string;
  descAr: string;
  amount: number;
  type: "debit" | "credit";
  bank: string;
  matchStatus: MatchStatus;
  matchConf: number;
  invoiceRef: string | null;
  category: string | null;
  categoryEn: string | null;
  catConf: number;
  catSource: CategorySource;
  duplicate?: boolean;
};

export type TBRow = {
  code: string;
  name: string;
  nameAr: string;
  debit: number;
  credit: number;
};

/**
 * Exception types that GATE Trial Balance generation. Mirrors
 * BLOCKING_EXCEPTIONS in the backend's readiness.service.ts and
 * trial-balance.service.ts — keep in sync.
 *
 * Everything else (MISSING_SUPPORTING_DOC, UNMATCHED_INVOICE,
 * POSSIBLE_DUPLICATE, UNMATCHED_TRANSACTION) is informational: it
 * surfaces in the accountant's queue but does NOT block the TB.
 */
export const BLOCKING_EXCEPTION_TYPES = [
  "LOW_CONFIDENCE_CATEGORY",
  "NEEDS_CLIENT_CLARIFICATION",
  "MISSING_INFO",
] as const;

export function isBlockingExceptionType(t: string): boolean {
  return (BLOCKING_EXCEPTION_TYPES as readonly string[]).includes(t);
}

export const STATUS_META: Record<
  CaseStatus,
  { label: string; labelAr: string; color: string; bg: string }
> = {
  "in-review": { label: "In review", labelAr: "قيد المراجعة", color: "var(--warn)", bg: "var(--warn-bg)" },
  exceptions: { label: "Needs exceptions", labelAr: "بها استثناءات", color: "var(--bad)", bg: "var(--bad-bg)" },
  complete: { label: "Complete", labelAr: "مكتملة", color: "var(--good)", bg: "var(--good-bg)" },
  uploading: { label: "Uploading", labelAr: "قيد الرفع", color: "var(--text-2)", bg: "var(--surface-2)" },
  processing: { label: "Processing", labelAr: "قيد المعالجة", color: "var(--text-2)", bg: "var(--surface-2)" },
  "tb-approved": { label: "TB approved", labelAr: "اعتماد الميزان", color: "var(--accent)", bg: "var(--good-bg)" },
};

export const CLIENTS: Client[] = [
  {
    id: "c1",
    name: "Al Fanar Trading Co.",
    nameAr: "شركة الفنار التجارية",
    cases: [
      {
        id: "k1",
        label: "FY 2024",
        status: "in-review",
        updated: "2 hours ago",
      },
      {
        id: "k0",
        label: "FY 2023",
        status: "complete",
        updated: "4 months ago",
      },
    ],
  },
  {
    id: "c2",
    name: "Najd Logistics LLC",
    nameAr: "شركة نجد للخدمات اللوجستية",
    cases: [
      {
        id: "k2",
        label: "FY 2024",
        status: "exceptions",
        updated: "yesterday",
      },
    ],
  },
  {
    id: "c3",
    name: "Zahra Contracting Est.",
    nameAr: "مؤسسة زهرة للمقاولات",
    cases: [
      { id: "k3", label: "FY 2024", status: "uploading", updated: "just now" },
    ],
  },
];

export function findCase(
  caseId: string,
): { client: Client; kase: Case } | null {
  for (const client of CLIENTS) {
    const kase = client.cases.find((k) => k.id === caseId);
    if (kase) return { client, kase };
  }
  return null;
}

export const TRANSACTIONS: Transaction[] = [
  {
    id: "t1",
    date: "2024-11-02",
    desc: "GOSI Payment — SAMBA transfer",
    descAr: "دفعة التأمينات الاجتماعية",
    amount: -18420.0,
    type: "debit",
    bank: "Al Rajhi ****4471",
    matchStatus: "matched",
    matchConf: 0.98,
    invoiceRef: null,
    category: "التأمينات الاجتماعية",
    categoryEn: "Social Insurance",
    catConf: 1.0,
    catSource: "rule",
  },
  {
    id: "t2",
    date: "2024-11-03",
    desc: "Muqeem Gov Fee — MOI portal",
    descAr: "رسوم مقيم",
    amount: -3200.0,
    type: "debit",
    bank: "Al Rajhi ****4471",
    matchStatus: "matched",
    matchConf: 0.95,
    invoiceRef: null,
    category: "رسوم حكومية",
    categoryEn: "Government Fees",
    catConf: 1.0,
    catSource: "rule",
  },
  {
    id: "t3",
    date: "2024-11-04",
    desc: "INV-2291 — Al Bassami Steel Supply",
    descAr: "فاتورة حديد البسامي",
    amount: -46750.5,
    type: "debit",
    bank: "SNB ****1183",
    matchStatus: "matched",
    matchConf: 0.91,
    invoiceRef: "INV-2291",
    category: "مشتريات",
    categoryEn: "Purchases — Materials",
    catConf: 0.88,
    catSource: "ai",
  },
  {
    id: "t4",
    date: "2024-11-05",
    desc: 'Wire — unknown descriptor "TRF 0044219"',
    descAr: "حوالة غير معروفة",
    amount: -9100.0,
    type: "debit",
    bank: "SNB ****1183",
    matchStatus: "needs-review",
    matchConf: 0.42,
    invoiceRef: null,
    category: null,
    categoryEn: null,
    catConf: 0.31,
    catSource: "ai",
  },
  {
    id: "t5",
    date: "2024-11-06",
    desc: "Client payment — Rawafed Group",
    descAr: "دفعة من روافد جروب",
    amount: 112000.0,
    type: "credit",
    bank: "SNB ****1183",
    matchStatus: "matched",
    matchConf: 0.97,
    invoiceRef: "INV-OUT-0117",
    category: "إيرادات المبيعات",
    categoryEn: "Sales Revenue",
    catConf: 0.99,
    catSource: "rule",
  },
  {
    id: "t6",
    date: "2024-11-07",
    desc: "POS — Jarir Bookstore (office supplies?)",
    descAr: "مشتريات جرير",
    amount: -640.0,
    type: "debit",
    bank: "Al Rajhi ****4471",
    matchStatus: "unmatched",
    matchConf: 0.15,
    invoiceRef: null,
    category: "مصاريف مكتبية",
    categoryEn: "Office Supplies",
    catConf: 0.58,
    catSource: "ai",
  },
  {
    id: "t7",
    date: "2024-11-08",
    desc: "INV-2291 — Al Bassami Steel Supply (duplicate?)",
    descAr: "فاتورة مكررة محتملة",
    amount: -46750.5,
    type: "debit",
    bank: "SNB ****1183",
    matchStatus: "needs-review",
    matchConf: 0.55,
    invoiceRef: "INV-2291",
    category: "مشتريات",
    categoryEn: "Purchases — Materials",
    catConf: 0.88,
    catSource: "ai",
    duplicate: true,
  },
  {
    id: "t8",
    date: "2024-11-09",
    desc: "Rent — Al Fanar Warehouse Q4",
    descAr: "إيجار المستودع",
    amount: -27000.0,
    type: "debit",
    bank: "Al Rajhi ****4471",
    matchStatus: "matched",
    matchConf: 0.99,
    invoiceRef: "LEASE-118",
    category: "إيجارات",
    categoryEn: "Rent Expense",
    catConf: 1.0,
    catSource: "rule",
  },
];

export const EXCEPTIONS: Transaction[] = TRANSACTIONS.filter(
  (t) => t.matchStatus !== "matched" || t.catConf < 0.7 || t.duplicate,
);

export const TB: TBRow[] = [
  {
    code: "1010",
    name: "Cash & Bank",
    nameAr: "النقدية وما في حكمها",
    debit: 284100,
    credit: 0,
  },
  {
    code: "1200",
    name: "Accounts Receivable",
    nameAr: "ذمم مدينة",
    debit: 112000,
    credit: 0,
  },
  {
    code: "2010",
    name: "Accounts Payable",
    nameAr: "ذمم دائنة",
    debit: 0,
    credit: 46750.5,
  },
  {
    code: "2400",
    name: "GOSI Payable",
    nameAr: "التأمينات الاجتماعية",
    debit: 0,
    credit: 0,
  },
  {
    code: "4000",
    name: "Sales Revenue",
    nameAr: "إيرادات المبيعات",
    debit: 0,
    credit: 112000,
  },
  {
    code: "5100",
    name: "Purchases — Materials",
    nameAr: "مشتريات",
    debit: 46750.5,
    credit: 0,
  },
  {
    code: "5300",
    name: "Rent Expense",
    nameAr: "إيجارات",
    debit: 27000,
    credit: 0,
  },
  {
    code: "5400",
    name: "Government Fees",
    nameAr: "رسوم حكومية",
    debit: 3200,
    credit: 0,
  },
  {
    code: "5500",
    name: "Social Insurance",
    nameAr: "التأمينات الاجتماعية",
    debit: 18420,
    credit: 0,
  },
];
