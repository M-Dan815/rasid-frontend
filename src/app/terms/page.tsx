import { LegalPage } from "@/components/LegalPage";

const SECTIONS: [string, string][] = [
  [
    "1. What AccountTech is",
    "AccountTech is a web-based tool that helps accounting firms extract, reconcile and classify transactions from bank statements and invoices, and prepare a Trial Balance and financial statements from the results. AccountTech assists the review process — the accounting firm and its licensed accountants remain responsible for reviewing, correcting and approving all outputs before they are relied upon.",
  ],
  [
    "2. Accounts & firm data",
    "Each accounting firm registers its own account. Data uploaded or generated under one firm's account is logically isolated from other firms and is not visible to other firms using AccountTech.",
  ],
  [
    "3. Client documents",
    "Firms are responsible for having the right to upload their clients' bank statements, invoices and receipts to AccountTech, and for complying with any confidentiality obligations owed to their clients.",
  ],
  [
    "4. AI-assisted extraction",
    "Document extraction and ambiguous-category suggestions may be produced with the help of a third-party AI provider selected by the firm. Calculations — matching confidence aside — such as debit/credit totals, the Trial Balance and financial statement figures are produced by deterministic accounting logic, not by the AI model.",
  ],
  [
    "5. No professional advice",
    "AccountTech does not provide accounting, audit, tax or legal advice. Outputs must be reviewed and approved by a qualified accountant before being filed, submitted to authorities, or relied upon by any third party.",
  ],
  [
    "6. Subscriptions & billing",
    "Plans are billed monthly per firm as described on the Pricing page. Usage of third-party AI providers is billed separately at the firm's own account with that provider.",
  ],
  [
    "7. Changes",
    "We may update these terms from time to time. Continued use of AccountTech after an update constitutes acceptance of the revised terms.",
  ],
];

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="November 2024">
      {SECTIONS.map(([heading, body]) => (
        <div key={heading}>
          <h2 className="text-[17px] font-bold mb-2" style={{ color: "var(--text)" }}>
            {heading}
          </h2>
          <p>{body}</p>
        </div>
      ))}
    </LegalPage>
  );
}
