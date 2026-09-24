import type {
  ApiBankTransaction,
  ApiCase,
  ApiClient,
  ApiException,
} from "./api";
import type {
  Case,
  CaseStatus,
  CategorySource,
  Client,
  MatchStatus,
  Transaction,
} from "./data";

export type UiTransaction = Transaction & {
  documentId?: string;
  documentName?: string | null;
  reference: string | null;
};

/** Backend case status → the pill statuses the UI already knows. */
export function uiStatus(s: string): CaseStatus {
  switch (s) {
    case "PROCESSING":
      return "processing";
    case "EXCEPTIONS":
      return "exceptions";
    case "IN_REVIEW":
      return "in-review";
    case "TB_APPROVED":
      return "tb-approved";
    case "COMPLETE":
      return "complete";
    default:
      return "uploading"; // DRAFT / anything pre-processing
  }
}

function uiMatchStatus(s: string): MatchStatus {
  if (s === "MATCHED") return "matched";
  if (s === "NEEDS_REVIEW") return "needs-review";
  return "unmatched";
}

function uiCatSource(s: string | null): CategorySource {
  if (s === "AI") return "ai";
  if (s === "MANUAL") return "manual";
  return "rule";
}

export function uiCase(k: ApiCase): Case {
  return {
    id: k.id,
    label: k.label,
    status: uiStatus(k.status),
    updated: timeAgo(k.updatedAt),
  };
}

export function uiClient(c: ApiClient): Client {
  return {
    id: c.id,
    name: c.name,
    nameAr: c.nameAr ?? "",
    cases: (c.cases ?? []).map(uiCase),
  };
}

export function uiTransaction(
  t: ApiBankTransaction,
  duplicateInvoiceIds: Set<string> = new Set(),
): UiTransaction {
  return {
    id: t.id,
    date: t.date.slice(0, 10),
    desc: t.description,
    descAr: t.reference ?? "", // secondary line: the bank reference
    amount: Number(t.amount),
    type: Number(t.amount) < 0 ? "debit" : "credit",
    bank: t.bankLabel ?? "—",
    matchStatus: uiMatchStatus(t.matchStatus),
    matchConf: Number(t.matchConfidence ?? 0),
    invoiceRef: t.matchedInvoice?.invoiceNumber ?? null,
    category: t.categoryAccount?.nameAr ?? t.categoryAccount?.name ?? null,
    categoryEn: t.categoryAccount?.name ?? null,
    catConf: Number(t.categoryConfidence ?? 0),
    catSource: uiCatSource(t.categorySource),
    duplicate: t.matchedInvoiceId
      ? duplicateInvoiceIds.has(t.matchedInvoiceId)
      : false,
    documentId: t.documentId,
    documentName: t.document?.fileName ?? null,
    reference: t.reference ?? null,
  };
}

/** Invoice ids flagged by POSSIBLE_DUPLICATE exceptions — feeds the `duplicate` badge. */
export function duplicateInvoiceIdsFrom(
  exceptions: ApiException[],
): Set<string> {
  return new Set(
    exceptions
      .filter((e) => e.type === "POSSIBLE_DUPLICATE" && e.invoiceId)
      .map((e) => e.invoiceId!),
  );
}

export function timeAgo(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const h = Math.round(diffMin / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  const mo = Math.round(d / 30);
  return `${mo} month${mo === 1 ? "" : "s"} ago`;
}
