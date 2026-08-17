import { GuideShell, GuideSection, Callout, FaqBlock, GuideCta } from "@/components/editorial";
import { GlassCard } from "@/components/ui";
import { Reveal } from "@/components/motion";

export const metadata = {
  title: "FSB vs IoD vs Chambers vs Private Clubs — UK Business Membership Compared",
  description:
    "What UK business memberships actually cost and include in 2026 — FSB, Institute of Directors, Chambers of Commerce, founder clubs like Helm, and the 193 Countries Consortium — compared honestly, with prices as checked and sources.",
  alternates: { canonical: "/guides/uk-business-membership-compared" },
};

const ROWS: { org: string; price: string; bestFor: string; core: string }[] = [
  {
    org: "FSB (Federation of Small Businesses)",
    price: "£195–£1,295/yr by employee count",
    bestFor: "Small businesses that want protection",
    core: "24/7 legal, tax & employment advice line, HMRC investigation protection, legal document library, debt recovery",
  },
  {
    org: "Institute of Directors",
    price: "£494/yr (full membership)",
    bestFor: "Individual directors — governance & development",
    core: "116 Pall Mall member areas, director training discounts, advice-line call allowances, professional community",
  },
  {
    org: "Chambers of Commerce (local, accredited)",
    price: "Set by each chamber — e.g. London from £590+VAT, Manchester from £649+VAT",
    bestFor: "Local trade, export documentation",
    core: "Local networking programme, trade documents, advice lines, regional voice (BCC sells no direct national membership)",
  },
  {
    org: "Founder clubs (e.g. Helm)",
    price: "e.g. £495 joining + £495/month (per Helm's own comparison page; VAT unstated)",
    bestFor: "Scale-up founders wanting a curated peer group",
    core: "Chaired peer forums, curated member introductions, events; entry criteria apply",
  },
  {
    org: "Members' club workspaces (e.g. Home Grown, now Home House Studio)",
    price: "£3,000/yr inc VAT + £499 joining (full Studio tier)",
    bestFor: "A physical London base with a social layer",
    core: "Clubhouse access, workspace, events programme",
  },
  {
    org: "193 Countries Consortium",
    price: "£500–£9,000/yr (published on every tier page)",
    bestFor: "Enterprises seeking investors, profile and the room",
    core: "House of Lords event programme, UK Investors Summit slots, investor deal-flow by consent, 2–5 hrs/month mentoring, branding video & article",
  },
];

export default function MembershipComparedGuide() {
  return (
    <GuideShell
      kicker="Membership · Honest comparison"
      title={<>FSB vs IoD vs Chambers vs private clubs — <span className="text-gold-grad">compared plainly</span></>}
      dek="The organisations in this comparison do different jobs, and the right answer is often more than one of them. Here is what each actually costs and includes — our own tiers held to the same standard."
      updated="Prices as checked on official sites, 31 July 2026 — always confirm current pricing before joining anything"
      backHref="/guides"
      backLabel="All guides"
    >
      <Callout tone="note">
        Fair-comparison notes: some prices are quoted ex-VAT by the organisation (marked), others inclusive;
        member counts are the organisations&rsquo; own figures; all names and trademarks belong to their owners
        and no affiliation or endorsement is implied. Chambers of Commerce pricing is set by each local,
        independently owned chamber — the figures shown are named examples, not national rates.
      </Callout>

      <Reveal>
        <section>
          <h2 className="font-display text-2xl leading-snug text-ivory-50 md:text-3xl">The comparison</h2>
          {/* The old mask was anchored to the container, not the scroll
              position, so the last column stayed faded even at maximum scroll —
              the table read as broken rather than scrolled-to-the-end. A
              background with `local` attachment travels with the content and
              disappears when there is nothing left to reveal. */}
          <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-mist md:hidden">Swipe to compare &rarr;</p>
          {/* The scroll container must NOT be the .glass element: .glass sets the
              `background` SHORTHAND, which resets background-image/-size/
              -attachment, and it is emitted after Tailwind's utilities — so a cue
              applied to the card itself is silently wiped. */}
          <GlassCard className="mt-6 rounded-2xl">
            <div
              role="region"
              aria-label="UK business membership comparison — scrolls sideways"
              tabIndex={0}
              className="overflow-x-auto rounded-2xl bg-[linear-gradient(to_left,rgba(255,255,255,0.96),transparent)] bg-right bg-no-repeat [background-attachment:local] [background-size:48px_100%] md:bg-none"
            >
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b hairline">
                  {["Organisation", "Indicative cost", "Best for", "Core of the offer"].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-widest text-mist">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {ROWS.map((r) => (
                  <tr key={r.org} className={r.org.startsWith("193") ? "bg-gold-500/5" : undefined}>
                    <td className="px-5 py-4 align-top font-medium text-ivory-50">{r.org}</td>
                    <td className="px-5 py-4 align-top text-ivory-200">{r.price}</td>
                    <td className="px-5 py-4 align-top text-ivory-200">{r.bestFor}</td>
                    <td className="px-5 py-4 align-top text-mist">{r.core}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </GlassCard>
        </section>
      </Reveal>

      <GuideSection title="How to choose — the honest version">
        <p>
          <strong className="text-ivory-50">If you employ people and worry about employment law or HMRC</strong>,
          FSB&rsquo;s advice lines and protections are the pragmatic buy, and nothing on this page replaces them.
          <strong className="text-ivory-50"> If you sit on boards</strong>, the IoD is the professional home for
          directorship itself — governance, training, a Pall Mall base.
          <strong className="text-ivory-50"> If your business trades locally or exports</strong>, your local
          Chamber earns its fee in documents and connections.
          <strong className="text-ivory-50"> If you want a curated peer group</strong>, the founder clubs are
          genuinely good at it — Helm&rsquo;s chaired forums are the reference model.
        </p>
        <p>
          What none of them lists as a published core benefit — as at our check date — is the specific job the
          consortium was built for: <strong className="text-ivory-50">putting an enterprise in front of
          investors and recognition</strong>. A House of Lords event programme, a structured Summit with
          investor-panel pitches, consent-based deal-flow visibility, and the brand assets (film, article,
          public profile) to arrive looking like you belong. Many of our enterprise members hold an FSB or IoD
          card too; the memberships do different jobs.
        </p>
      </GuideSection>

      <FaqBlock
        faqs={[
          {
            q: "Is business club or membership organisation cost tax deductible in the UK?",
            a: "It depends on the membership and how it is used, and you should ask your accountant. Broadly, HMRC allows expenses incurred wholly and exclusively for the trade, subscriptions to certain professional bodies on HMRC's approved list can be deductible for employees, and client entertaining is generally not deductible. Membership with mixed business and personal benefit is judged on the facts — get advice on your own circumstances before assuming a deduction.",
          },
          {
            q: "What does UK business membership cost in 2026?",
            a: "As checked in July 2026 on official sites: FSB from £195 to £1,295 a year depending on employee count; IoD full membership £494 a year; accredited local Chambers typically from around £590–£650 plus VAT for small firms; founder clubs like Helm around £495 a month plus a joining fee; the 193 Countries Consortium from £500 to £9,000 a year depending on tier. Prices change — confirm on each organisation's site.",
          },
          {
            q: "Can I join more than one business organisation?",
            a: "Yes, and many businesses do — a protective membership (like FSB) covering legal and tax risk alongside a growth membership (like the consortium) covering investor access and profile is a common, sensible pairing. They do different jobs.",
          },
          {
            q: "Which membership gets me in front of investors?",
            a: "Structured investor access is not a published core benefit of FSB, the IoD, Chambers of Commerce or the clubs compared here as at our check date. The consortium's enterprise tiers are built around it: consent-based deal-flow visibility to investor members, and the UK Investors Summit, where members present before an assembled investor panel.",
          },
        ]}
      />

      <GuideCta
        heading="See the tiers, priced in the open"
        sub="Every consortium tier is published with its full fee and benefit list — £500 Individual to £9,000 Enterprise Investor Ready. No enquiry forms to see a price."
        href="/join"
        label="Compare our tiers"
      />
    </GuideShell>
  );
}
