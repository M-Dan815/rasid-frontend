import { LegalPage } from "@/components/LegalPage";

const SECTIONS: [string, string][] = [
  [
    "1. What we collect",
    "Firm registration details (firm name, contact email), user login credentials, and the documents and data a firm uploads on behalf of its clients — bank statements, invoices, receipts, and the transactions, matches and statements generated from them.",
  ],
  [
    "2. Why we collect it",
    "To operate the reconciliation and statement-preparation workflow: authenticating firms, isolating each firm's data, extracting and matching transactions, and generating the Trial Balance and financial statements a firm requests.",
  ],
  [
    "3. AI providers",
    "Where a firm enables AI-assisted extraction or classification, relevant document content or transaction descriptions are sent to the firm's chosen AI provider (e.g. OpenAI, DeepSeek, Gemini) using the firm's own API credentials. That provider's own data handling terms apply to that processing.",
  ],
  [
    "4. Data isolation",
    "Each accounting firm's clients, cases, documents and generated statements are logically separated from other firms' data and are not accessible to other firms on the platform.",
  ],
  [
    "5. Retention",
    "Uploaded documents and generated data are retained for as long as the firm's account remains active, or as required to provide the service, unless a firm requests deletion of a specific case or account.",
  ],
  [
    "6. Your choices",
    "A firm administrator can request export or deletion of their firm's data by contacting support. This is placeholder copy for the Thursday demo and should be reviewed by counsel before handling real client data in production.",
  ],
];

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="November 2024">
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
