import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GlassCard } from "@/components/ui";

export const metadata = { title: "Privacy Policy — 193 Countries Consortium" };

/** UK GDPR / DPA 2018 privacy notice with documented lawful bases (§7.1). */
export default function PrivacyPage() {
  const rows: [string, string, string, string][] = [
    ["Account & profile (name, email, company)", "Provide membership services", "Contract (Art. 6(1)(b))", "Life of membership + 6 years"],
    ["Signed membership agreements", "Evidence of the contract", "Contract / Legal obligation", "6 years after membership ends"],
    ["Payment ledger & Direct Debit plans", "Fee collection, accounting", "Contract / Legal obligation (financial records)", "6 years (HMRC)"],
    ["Card / bank details", "Payment collection", "Handled by PCI-DSS payment providers — never stored on this platform", "n/a"],
    ["Mentoring sessions & notes", "Deliver the mentoring benefit", "Contract", "Life of membership + 12 months"],
    ["Summit applications & intent letters", "Event administration", "Contract", "12 months after the event"],
    ["Investor-visibility pitches", "Introductions you request", "Consent (Art. 6(1)(a)) — withdraw any time in your dashboard", "Until consent withdrawn"],
    ["Audit logs", "Security & accountability", "Legitimate interests (Art. 6(1)(f))", "6 years"],
  ];
  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-mist hover:text-ivory-100">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="mt-6 font-display text-4xl text-ivory-50">Privacy <span className="text-gold-grad">Policy</span></h1>
      <p className="mt-3 text-sm leading-7 text-mist">
        193 Countries Consortium Ltd (Companies House 14499310, Level 30, The Leadenhall Building, 122 Leadenhall Street, London EC3V 4AB)
        is the data controller for this membership platform. We process personal data under UK GDPR and the Data Protection Act 2018.
        Data is hosted in the UK. This notice is a working draft for client legal review before go-live.
      </p>
      <GlassCard className="mt-8 overflow-x-auto p-2">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead><tr className="border-b hairline">
            {["What we hold", "Why", "Lawful basis", "Retention"].map((h) => (
              <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-mist">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-gold-500/8">
            {rows.map((r) => (
              <tr key={r[0]}>{r.map((c, i) => <td key={i} className="px-4 py-3 align-top text-ivory-200/85">{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
      <div className="mt-8 space-y-4 text-sm leading-7 text-mist">
        <p><strong className="text-ivory-100">Your rights.</strong> Access, rectification, erasure, restriction, portability and objection. Erasure requests are actioned by an administrator: your identity is anonymised while financial records are retained under legal obligation. Contact the membership office to exercise any right; you may also complain to the ICO (ico.org.uk).</p>
        <p><strong className="text-ivory-100">Processors.</strong> Payment collection (Stripe / GoCardless), e-signature, transactional email (Postmark) and UK-region cloud hosting act as processors under Article 28 agreements once live.</p>
        <p><strong className="text-ivory-100">No marketing without consent. No card data on our servers. No data sold — ever.</strong></p>
      </div>
    </main>
  );
}
