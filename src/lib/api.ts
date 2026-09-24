/**
 * The single API client for the AccountTech backend.
 * Backend URL comes from ONE env var: NEXT_PUBLIC_API_URL (.env.local).
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const TOKEN_KEY = "rasid-token";
const FIRM_KEY = "rasid-firm";
const USER_KEY = "rasid-user";

export type SessionFirm = { id: string; name: string };
export type SessionUser = { id: string; name: string; email: string };

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getSessionFirm(): SessionFirm | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(FIRM_KEY);
    return raw ? (JSON.parse(raw) as SessionFirm) : null;
  } catch {
    return null;
  }
}

export function getSessionUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function setSession(
  token: string,
  firm: SessionFirm,
  user: SessionUser,
) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(FIRM_KEY, JSON.stringify(firm));
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.localStorage.removeItem("rasid-authed"); // legacy mock-auth flag
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(FIRM_KEY);
  window.localStorage.removeItem(USER_KEY);
}

/** True when a JWT exists and its exp claim is still in the future. */
export function hasLiveSession(): boolean {
  const token = getToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? "")) as {
      exp?: number;
    };
    return !payload.exp || payload.exp * 1000 > Date.now();
  } catch {
    return true; // can't parse — let the backend decide
  }
}

type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  formData?: FormData;
};

async function request<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method: opts.method ?? "GET",
      headers,
      body:
        opts.formData ??
        (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    });
  } catch {
    throw new ApiError(
      0,
      `Cannot reach the API at ${API_URL} — is the backend running?`,
    );
  }

  if (res.status === 401 && token) {
    // Session died mid-use (expired/revoked): drop it and bounce to login.
    clearSession();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new ApiError(401, "Session expired — please sign in again");
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message);
  }

  return (await res.json()) as T;
}

/**
 * Public (unauthenticated) request. Used only by the client-facing
 * clarification portal — no bearer token, and a 401 never bounces the user
 * to /login (they aren't logged in to begin with).
 */
async function publicRequest<T>(
  path: string,
  opts: ApiOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(
      0,
      `Cannot reach the API at ${API_URL} — is the backend running?`,
    );
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message);
  }

  return (await res.json()) as T;
}

// ---------------------------------------------------------------- raw shapes
// Prisma Decimal fields serialize as strings — hence Num + num().
export type Num = string | number;
export const num = (v: Num | null | undefined): number =>
  v === undefined || v === null ? 0 : Number(v);

export type ApiClient = {
  id: string;
  name: string;
  nameAr: string | null;
  firmId: string;
  cases?: ApiCase[];
};

export type ApiCase = {
  id: string;
  label: string;
  status: string; // DRAFT | PROCESSING | EXCEPTIONS | IN_REVIEW | TB_APPROVED | COMPLETE
  periodStart: string;
  periodEnd: string;
  clientId: string;
  createdAt: string;
  updatedAt: string;
  client?: ApiClient | null;
  documents?: ApiDocument[];
};

export type ApiDocument = {
  id: string;
  type: "BANK_STATEMENT" | "INVOICE" | "RECEIPT";
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  bankName: string | null;
  status: "UPLOADED" | "EXTRACTING" | "EXTRACTED" | "FAILED";
  extractionMethod: string | null;
  extractionError: string | null;
  storageKey: string;
  storageDriver: string;
  createdAt: string;
};

export type ApiAccount = {
  id: string;
  code: string;
  name: string;
  nameAr: string | null;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  postable: boolean;
  /**
   * Accounts where a missing invoice/receipt is meaningful (receivables,
   * capital, loans). Drives the warning icon in account pickers and
   * explains why some classifications still surface a MISSING_SUPPORTING_DOC
   * exception even after the category is set.
   */
  requiresSupportingDoc: boolean;
};

export type ApiInvoice = {
  id: string;
  invoiceNumber: string | null;
  date: string | null;
  counterparty: string | null;
  amountBeforeVat: Num | null;
  vatAmount: Num | null;
  amountTotal: Num;
  description: string | null;
  direction: "PAYABLE" | "RECEIVABLE";
  document?: { id: string; fileName: string } | null;
};

export type ApiBankTransaction = {
  id: string;
  date: string;
  description: string;
  /**
   * Merchant / counterparty name parsed out of the bank description by the
   * deterministic parser. A first-class field — separate from `description`
   * — because the classifier and rule matcher rely on it being clean.
   */
  counterparty: string | null;
  amount: Num;
  reference: string | null;
  bankLabel: string | null;
  matchStatus: string; // MATCHED | NEEDS_REVIEW | UNMATCHED
  matchConfidence: Num | null;
  matchedInvoiceId: string | null;
  categoryAccountId: string | null;
  categoryConfidence: Num | null;
  categorySource: string | null; // RULE | AI | MANUAL
  /**
   * Human-readable explanation of WHY this category was proposed.
   * Populated by rules ("Matched firm rule: ..."), the AI provider
   * (its cited reason), or a human decision. Rendered next to the
   * category pill in the reconciliation and exceptions screens.
   */
  categoryReason: string | null;
  /** "rule" | "ai" | "manual" | "prior-approval" — drives the pill colour. */
  categoryReasonSource: string | null;
  categoryAccount?: ApiAccount | null;
  matchedInvoice?: ApiInvoice | null;
  documentId: string;
  document?: { id: string; fileName: string } | null;
  // ─── Split + refund-pairing (Anas feedback #2 + #4) ──────────────────
  // `splits` is set when the accountant has split this txn across
  // multiple accounts (e.g. 80% Transport / 20% Hospitality). When null,
  // the journal uses categoryAccountId as before.
  // `pairedWithTxnId` is set when this txn is a refund auto-paired with
  // its original purchase. UI renders this as "Refund of {original}".
  splits?: Array<{ accountId: string; amount: number }> | null;
  pairedWithTxnId?: string | null;
  pairedWithTxn?: {
    id: string;
    date: string;
    description: string;
    counterparty: string | null;
    amount: Num;
  } | null;
};

export type ApiException = {
  id: string;
  /**
   * UNMATCHED_TRANSACTION | LOW_CONFIDENCE_CATEGORY | UNMATCHED_INVOICE |
   * POSSIBLE_DUPLICATE | MISSING_INFO | NEEDS_CLIENT_CLARIFICATION |
   * MISSING_SUPPORTING_DOC
   */
  type: string;
  status: string; // OPEN | RESOLVED | FLAGGED_MISSING_DOC
  note: string | null;
  bankTransactionId: string | null;
  invoiceId: string | null;
  createdAt: string;
  bankTransaction?: ApiBankTransaction | null;
  invoice?: ApiInvoice | null;
};

export type TrialBalanceRow = {
  accountId: string;
  code: string;
  name: string;
  nameAr: string | null;
  type: string;
  debit: number;
  credit: number;
};

export type TrialBalance = {
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
};

export type StatementNode = {
  id: string | null;
  code: string;
  name: string;
  nameAr: string | null;
  amount: number;
  isLeaf: boolean;
  formatted: string;
  children: StatementNode[];
};

export type IncomeStatement = {
  revenue: StatementNode[];
  totalRevenue: number;
  totalRevenueFormatted: string;
  directCosts: StatementNode[];
  totalDirectCosts: number;
  totalDirectCostsFormatted: string;
  grossProfit: number;
  grossProfitFormatted: string;
  operatingCosts: StatementNode[];
  totalOperatingCosts: number;
  totalOperatingCostsFormatted: string;
  netIncomeBeforeZakat: number;
  netIncomeBeforeZakatFormatted: string;
  netProfit: number;
  netProfitFormatted: string;
};

export type BalanceSheet = {
  assets: StatementNode[];
  totalAssets: number;
  totalAssetsFormatted: string;
  liabilities: StatementNode[];
  totalLiabilities: number;
  totalLiabilitiesFormatted: string;
  equity: StatementNode[];
  totalEquity: number;
  totalEquityFormatted: string;
  netIncomeForPeriod: number;
  netIncomeForPeriodFormatted: string;
  balanced: boolean;
};

// ─── Cash Flow — INDIRECT METHOD ────────────────────────────────────────
export type CashFlowLine = {
  label: string;
  labelAr: string;
  amount: number;
  formatted: string;
};

export type CashFlowSection = {
  lines: CashFlowLine[];
  total: number;
  totalFormatted: string;
};

export type CashFlow = {
  method: "indirect";
  operating: CashFlowSection;
  investing: CashFlowSection;
  financing: CashFlowSection;
  netCashMovement: number;
  netCashMovementFormatted: string;
};

export type DrilldownLine = {
  date: string;
  debit: number;
  credit: number;
  memo: string | null;
  sourceTransaction: {
    id: string;
    description: string;
    amount: number;
    date: string;
  } | null;
  sourceDocument: { id: string; fileName: string } | null;
};

/**
 * Rule-scope: how far the accountant's decision should reach.
 *   none        — one-off decision, no rule written
 *   description — substring rule on the transaction description (default)
 *   merchant    — substring rule on `counterparty` (recommended when set)
 * `ruleText` overrides the auto-derived match text (used for "Custom pattern").
 */
export type RuleScope = "none" | "description" | "merchant";

export type ResolveBody = {
  action: "approve" | "flag_missing_doc" | "manual_category" | "manual_match";
  accountId?: string;
  invoiceId?: string;
  ruleScope?: RuleScope;
  ruleText?: string;
};

// ─── Readiness checklist ────────────────────────────────────────────────
export type ReadinessStatus = "complete" | "in_progress" | "blocked";

export type ReadinessItem = {
  key: string;
  label: string;
  labelAr: string;
  status: ReadinessStatus;
  done: number;
  total: number;
  detail?: string;
};

export type ReadinessReport = {
  items: ReadinessItem[];
  readyForStatements: boolean;
  blockingSummary: string | null;
};

// ─── Clarifications (accountant side) ───────────────────────────────────
export type ClarificationStatus = "OPEN" | "ANSWERED";

/**
 * The detected-pattern block produced by patternDetector.ts on the backend.
 * Persisted on the Clarification row so the UI can show "why did the AI
 * think this was salaries?" — same audit-trail principle as
 * BankTransaction.categoryReason.
 */
export type DetectedPattern = {
  recurring: boolean;
  cadence: "monthly" | "weekly" | "quarterly" | null;
  dayOfMonth: { min: number; max: number; allSame: boolean } | null;
  amountRange: {
    min: number;
    max: number;
    variancePct: number;
    allSimilar: boolean;
  } | null;
  counterpartyType: string | null;
  occurrenceCount: number;
  firstDate: string;
  lastDate: string;
  totalAbsAmount: number;
  summary: string;
};

export type Clarification = {
  id: string;
  caseId: string;
  bankTransactionId: string | null;
  invoiceId: string | null;
  question: string;
  questionAr: string | null;
  answer: string | null;
  answeredAt: string | null;
  answeredBy: string | null;
  status: ClarificationStatus;
  createdAt: string;
  bankTransaction?: {
    id: string;
    date: string;
    description: string;
    amount: Num;
    reference: string | null;
  } | null;
  // ─── AI pattern hypothesis (null when no hypothesis was generated) ─────
  // When the pattern detector found a recurring group + the AI returned a
  // confident account hypothesis (confidence ≥ 0.5, needsClientConfirm),
  // these fields are populated. The client portal renders a one-click
  // "Yes, that's right" button; the accountant side shows the proposed
  // account above the answer box. See processing.service.ts →
  // raiseExceptions.
  proposedAccount?: {
    id: string;
    code: string;
    name: string;
    nameAr: string | null;
  } | null;
  hypothesisReason?: string | null;
  detectedPattern?: DetectedPattern | null;
};

export type ClarificationsBundle = {
  open: Clarification[];
  answered: Clarification[];
};

// ─── Adjustments ────────────────────────────────────────────────────────
export type AdjustmentSide = {
  accountId: string;
  code: string;
  name: string;
  nameAr: string | null;
  amount: number;
};

export type Adjustment = {
  adjustmentGroupId: string;
  date: string;
  memo: string | null;
  createdAt: string;
  debit: AdjustmentSide;
  credit: AdjustmentSide;
};

// ─── Opening balances ───────────────────────────────────────────────────
export type OpeningBalanceAccount = {
  id: string;
  code: string;
  name: string;
  nameAr: string | null;
  type: string;
  postable: boolean;
  openingBalance: number;
};

export type OpeningBalancesBundle = {
  confirmed: boolean;
  accounts: OpeningBalanceAccount[];
};

export type OpeningBalanceImportPreview = {
  matched: {
    accountId: string;
    code: string;
    name: string;
    previousBalance: number;
    newBalance: number;
  }[];
  unmatchedCodes: {
    code: string;
    nameFromFile?: string;
    balance: number;
  }[];
  missingAccounts: {
    accountId: string;
    code: string;
    name: string;
    currentBalance: number;
  }[];
};

// ─── Public clarifications portal (no auth) ─────────────────────────────
export type PublicClarificationCase = {
  id: string;
  label: string;
  clientName: string;
  clientNameAr: string | null;
  periodStart: string;
  periodEnd: string;
  firmName: string;
  firmNameAr: string | null;
};

export type PublicClarification = {
  id: string;
  transaction: {
    date: string;
    description: string;
    amount: number;
    reference: string | null;
  } | null;
  question: string;
  questionAr: string | null;
  /**
   * AI hypothesis block — null when no hypothesis was generated for this
   * group. When present, the portal renders a one-click "Yes, that's right"
   * button alongside the free-text answer box. Confirming the hypothesis
   * sends `confirmHypothesis: true` to the backend, which applies the
   * proposed account to the underlying transaction AND every other
   * unresolved payment to the same payee (see classification/learning.ts
   * → propagateToPayeeSiblings). That's the spec's "one click assigns
   * all statements in the group to a particular account" requirement,
   * delivered on the client-portal side.
   */
  hypothesis: {
    proposedAccount: {
      id: string;
      code: string;
      name: string;
      nameAr: string | null;
    };
    reason: string;
    detectedPattern: DetectedPattern | null;
  } | null;
};

export type PublicClarificationsResponse = {
  case: PublicClarificationCase;
  clarifications: PublicClarification[];
};

// ---------------------------------------------------------------- endpoints
export type AuthResponse = {
  token: string;
  firm: SessionFirm;
  user: SessionUser;
};

export const registerFirm = (input: {
  firmName: string;
  firmNameAr?: string;
  name: string;
  email: string;
  password: string;
}) => request<AuthResponse>("/auth/register", { method: "POST", body: input });

export const login = (email: string, password: string) =>
  request<AuthResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
  });

export const getClients = () => request<ApiClient[]>("/clients");
export const createClient = (body: { name: string; nameAr?: string }) =>
  request<ApiClient>("/clients", { method: "POST", body });
export const createCase = (
  clientId: string,
  body: { label: string; periodStart: string; periodEnd: string },
) => request<ApiCase>(`/clients/${clientId}/cases`, { method: "POST", body });

export const getCase = (caseId: string) => request<ApiCase>(`/cases/${caseId}`);
export const getTransactions = (caseId: string) =>
  request<ApiBankTransaction[]>(`/cases/${caseId}/transactions`);
export const getInvoices = (caseId: string) =>
  request<ApiInvoice[]>(`/cases/${caseId}/invoices`);
export const getExceptions = (caseId: string) =>
  request<ApiException[]>(`/cases/${caseId}/exceptions`);
export const resolveException = (
  caseId: string,
  exceptionId: string,
  body: ResolveBody,
) =>
  request<ApiException>(`/cases/${caseId}/exceptions/${exceptionId}/resolve`, {
    method: "POST",
    body,
  });

export const getAccounts = () => request<ApiAccount[]>("/accounts");

export const getClassificationRules = () =>
  request<ApiClassificationRule[]>("/accounts/classification-rules");

export const getTrialBalance = (caseId: string) =>
  request<TrialBalance>(`/cases/${caseId}/trial-balance`);
export const generateTrialBalance = (caseId: string) =>
  request<TrialBalance>(`/cases/${caseId}/trial-balance/generate`, {
    method: "POST",
  });
export const approveTrialBalance = (caseId: string) =>
  request<TrialBalance>(`/cases/${caseId}/trial-balance/approve`, {
    method: "POST",
  });

export const getIncomeStatement = (caseId: string) =>
  request<IncomeStatement>(`/cases/${caseId}/statements/income-statement`);
export const getBalanceSheet = (caseId: string) =>
  request<BalanceSheet>(`/cases/${caseId}/statements/balance-sheet`);
export const getCashFlow = (caseId: string) =>
  request<CashFlow>(`/cases/${caseId}/statements/cash-flow`);
export const getDrilldown = (caseId: string, accountId: string) =>
  request<DrilldownLine[]>(`/cases/${caseId}/accounts/${accountId}/drilldown`);

export const uploadDocument = (
  caseId: string,
  file: File,
  type: string,
  bankName?: string,
) => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("type", type);
  if (bankName) fd.append("bankName", bankName);
  return request<ApiDocument>(`/cases/${caseId}/documents`, {
    method: "POST",
    formData: fd,
  });
};

export const processCase = (caseId: string) =>
  request<ApiCase>(`/cases/${caseId}/process`, { method: "POST" });

// ─── Readiness ─────────────────────────────────────────────────────────
export const getReadiness = (caseId: string) =>
  request<ReadinessReport>(`/cases/${caseId}/readiness`);

// ─── Clarifications (accountant) ───────────────────────────────────────
export const getClarifications = (caseId: string) =>
  request<ClarificationsBundle>(`/cases/${caseId}/clarifications`);

export const answerClarification = (
  caseId: string,
  clarificationId: string,
  body: { answer: string; proposedAccountId?: string },
) =>
  request<Clarification>(
    `/cases/${caseId}/clarifications/${clarificationId}/answer`,
    { method: "POST", body },
  );

export const requestClientClarificationLink = (caseId: string) =>
  request<{ token: string; expiresAt: string; publicPath: string }>(
    `/cases/${caseId}/clarifications/request`,
    { method: "POST" },
  );

export const revokeClientClarificationLink = (caseId: string) =>
  request<{ ok: boolean }>(`/cases/${caseId}/clarifications/request`, {
    method: "DELETE",
  });

// ─── Adjustments ───────────────────────────────────────────────────────
export const listAdjustments = (caseId: string) =>
  request<Adjustment[]>(`/cases/${caseId}/adjustments`);

export const createAdjustment = (
  caseId: string,
  body: {
    date: string;
    debitAccountId: string;
    creditAccountId: string;
    amount: number;
    memo?: string;
  },
) =>
  request<Adjustment>(`/cases/${caseId}/adjustments`, {
    method: "POST",
    body,
  });

export const deleteAdjustment = (caseId: string, adjustmentGroupId: string) =>
  request<{ ok: boolean }>(
    `/cases/${caseId}/adjustments/${adjustmentGroupId}`,
    { method: "DELETE" },
  );

export const confirmAdjustments = (caseId: string) =>
  request<{ ok: boolean; confirmed: boolean }>(
    `/cases/${caseId}/adjustments/confirm`,
    { method: "POST" },
  );

export const unconfirmAdjustments = (caseId: string) =>
  request<{ ok: boolean; confirmed: boolean }>(
    `/cases/${caseId}/adjustments/unconfirm`,
    { method: "POST" },
  );

// ─── Opening balances ──────────────────────────────────────────────────
export const getOpeningBalances = (caseId: string) =>
  request<OpeningBalancesBundle>(`/cases/${caseId}/opening-balances`);

export const previewOpeningBalances = (caseId: string, file: File) => {
  const fd = new FormData();
  fd.append("file", file);
  return request<OpeningBalanceImportPreview>(
    `/cases/${caseId}/opening-balances/preview`,
    { method: "POST", formData: fd },
  );
};

export const importOpeningBalances = (caseId: string, file: File) => {
  const fd = new FormData();
  fd.append("file", file);
  return request<OpeningBalanceImportPreview>(
    `/cases/${caseId}/opening-balances/import`,
    { method: "POST", formData: fd },
  );
};

export const patchOpeningBalance = (
  caseId: string,
  accountId: string,
  balance: number,
) =>
  request<{ ok: boolean }>(`/cases/${caseId}/opening-balances/${accountId}`, {
    method: "PATCH",
    body: { balance },
  });

export const confirmOpeningBalances = (caseId: string) =>
  request<{ ok: boolean; confirmed: boolean }>(
    `/cases/${caseId}/opening-balances/confirm`,
    { method: "POST" },
  );

export const unconfirmOpeningBalances = (caseId: string) =>
  request<{ ok: boolean; confirmed: boolean }>(
    `/cases/${caseId}/opening-balances/unconfirm`,
    { method: "POST" },
  );

// ─── Public clarifications portal (no auth header, no 401 redirect) ────
export const getPublicClarifications = (token: string) =>
  publicRequest<PublicClarificationsResponse>(
    `/public/clarifications/${encodeURIComponent(token)}`,
  );

export const answerPublicClarification = (
  token: string,
  clarificationId: string,
  answer: string,
  confirmHypothesis?: boolean,
) =>
  publicRequest<{
    ok: boolean;
    clarification: Clarification;
    /** True iff the backend applied the proposed account and settled every
     * sibling transaction to the same payee. Drives the success toast. */
    groupSettled?: boolean;
  }>(
    `/public/clarifications/${encodeURIComponent(token)}/answer/${encodeURIComponent(clarificationId)}`,
    {
      method: "POST",
      body: confirmHypothesis ? { answer, confirmHypothesis: true } : { answer },
    },
  );

// ------------------------------------------------------------ binary helpers
/**
 * Opens a stored document (local disk or S3) in a new tab, auth header
 * attached. Uses an <a download> element with a programmatic click instead
 * of window.open() — pop-up blockers were silently swallowing the open.
 * Anas feedback: "View original produced no visible document when tested".
 */
export async function openDocument(storageKey: string) {
  const path = storageKey.split("/").map(encodeURIComponent).join("/");
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/documents/file/${path}`, {
      headers: { Authorization: `Bearer ${getToken() ?? ""}` },
    });
  } catch {
    throw new ApiError(
      0,
      `Cannot reach the API at ${API_URL} — is the backend running?`,
    );
  }
  if (!res.ok) {
    let message = `Could not open the source document (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message);
  }
  // Use an <a download> element with a programmatic click — this is the
  // reliable way to trigger a file open/download that survives pop-up
  // blockers. window.open(blob, "_blank") was being silently blocked.
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  // Try to extract a filename from the Content-Disposition header; if
  // absent, fall back to a generic "document" name.
  const cd = res.headers.get("Content-Disposition") ?? "";
  const match = cd.match(/filename\*?=UTF-8''([^;]+)/i) ?? cd.match(/filename="?([^";]+)"?/i);
  a.download = match ? decodeURIComponent(match[1]) : "document";
  a.target = "_blank";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke the blob URL after a small delay so the browser has time to
  // start the navigation.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Downloads an xlsx/pdf export (auth header attached — can't be a plain <a href>). */
export async function downloadExport(
  caseId: string,
  kind: "trial-balance" | "income-statement" | "balance-sheet" | "cash-flow",
  filename: string,
  format: "xlsx" | "pdf" = "xlsx",
) {
  const res = await fetch(
    `${API_URL}/api/cases/${caseId}/export/${kind}.${format}`,
    {
      headers: { Authorization: `Bearer ${getToken() ?? ""}` },
    },
  );
  if (!res.ok) throw new ApiError(res.status, "Export failed");
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Direct transaction categorization. `ruleScope` defaults server-side to
 * "description" when omitted; pass "none" to skip writing a reusable rule,
 * or "merchant" to scope the rule on `counterparty` (recommended when set).
 * `ruleText` overrides the auto-derived match text.
 */
export const setTransactionCategory = (
  caseId: string,
  txnId: string,
  accountId: string,
  ruleScope?: RuleScope,
  ruleText?: string,
) =>
  request<{ ok: boolean }>(`/cases/${caseId}/transactions/${txnId}/category`, {
    method: "POST",
    body: { accountId, ruleScope, ruleText },
  });

export const setTransactionMatch = (
  caseId: string,
  txnId: string,
  invoiceId?: string,
) =>
  request<{ ok: boolean }>(`/cases/${caseId}/transactions/${txnId}/match`, {
    method: "POST",
    body: invoiceId ? { invoiceId } : {},
  });

// ─── Similar transactions + bulk categorize (Anas feedback #1) ──────────
export type SimilarTransaction = {
  id: string;
  date: string;
  amount: number;
  description: string;
  counterparty: string | null;
  categoryAccountId: string | null;
  categoryAccount?: ApiAccount | null;
  categoryConfidence: number;
  categorySource: string | null;
};

export const getSimilarTransactions = (caseId: string, txnId: string) =>
  request<SimilarTransaction[]>(
    `/cases/${caseId}/transactions/${txnId}/similar`,
  );

export const bulkCategorize = (
  caseId: string,
  body: {
    accountId: string;
    txnIds: string[];
    reason?: string;
    ruleScope?: RuleScope;
    ruleText?: string;
  },
) =>
  request<{ ok: boolean; applied: number }>(
    `/cases/${caseId}/transactions/bulk-categorize`,
    { method: "POST", body },
  );

// ─── Split categorization (Anas feedback #2) ─────────────────────────────
export type SplitEntry = { accountId: string; amount: number };

export const setTransactionSplit = (
  caseId: string,
  txnId: string,
  splits: SplitEntry[],
  reason?: string,
) =>
  request<{ ok: boolean }>(`/cases/${caseId}/transactions/${txnId}/split`, {
    method: "POST",
    body: { splits, reason },
  });

export const clearTransactionSplit = (caseId: string, txnId: string) =>
  request<{ ok: boolean }>(`/cases/${caseId}/transactions/${txnId}/split`, {
    method: "DELETE",
  });

// ─── Direct rule maintenance (Anas feedback #3) ───────────────────────────
export const updateClassificationRule = (
  ruleId: string,
  body: {
    matchText?: string;
    accountId?: string;
    ruleKind?: "substring" | "merchant" | "amount-pattern" | "beneficiary";
  },
) =>
  request<ApiClassificationRule>(
    `/accounts/classification-rules/${ruleId}`,
    { method: "PATCH", body },
  );

export const deleteClassificationRule = (ruleId: string) =>
  request<{ ok: boolean }>(`/accounts/classification-rules/${ruleId}`, {
    method: "DELETE",
  });

// ─── Statement extraction verification (Anas feedback #8) ────────────────
export type VerificationIssueWithContext = {
  code?: string;
  index?: number;
  message?: string;
  gap?: number;
  context: Array<{
    id: string;
    rawRowIndex: number | null;
    date: string;
    description: string;
    amount: number;
    kind: string | null;
  }>;
};

export type VerificationReport = {
  document: {
    id: string;
    fileName: string;
    extractionMethod: string | null;
  };
  status: "VERIFIED" | "UNVERIFIED" | "FAILED";
  issues: VerificationIssueWithContext[];
  totalRows: number;
};

export const getDocumentVerification = (
  caseId: string,
  documentId: string,
) =>
  request<VerificationReport>(
    `/cases/${caseId}/documents/${documentId}/verification`,
  );

export const deleteCase = (caseId: string) =>
  request<{ ok: boolean }>(`/cases/${caseId}`, { method: "DELETE" });

export type ApiClassificationRule = {
  id: string;
  firmId: string;
  matchText: string;
  accountId: string;
  /** "substring" | "merchant" | "amount-pattern" — the latter documented but not yet emitted by the backend. */
  ruleKind: string;
  /**
   * "seed" (no colon) or "<prefix>:<id>" where prefix is one of:
   * "accountant-approval" | "manual-category" | "clarification".
   * Parse defensively — do not assume a colon is always present.
   */
  createdFrom: string | null;
  createdAt: string;
  account: ApiAccount;
};
