import { GuideShell, GuideSection, Callout, FaqBlock, GuideCta, CheckItem } from "@/components/editorial";

export const metadata = {
  title: "The Investor-Readiness Roadmap — SEIS/EIS to First Cheque (2026–27)",
  description:
    "A practical UK investor-readiness roadmap for founders: company foundations, the story and the numbers, SEIS/EIS advance assurance with current 2026–27 limits, the readiness checklist, and where introductions actually happen.",
  alternates: { canonical: "/guides/investor-readiness" },
};

export default function InvestorReadinessGuide() {
  return (
    <GuideShell
      kicker="Investment · Roadmap"
      hero={{ src: "/images/summit-2023-roundtable.jpg", alt: "Founders and investors in discussion at a Summit table", caption: "Investor tables · UK Investors Summit 2023" }}
      title={<>The investor-readiness roadmap: <span className="text-gold-grad">SEIS/EIS to first cheque</span></>}
      dek="Most companies don't fail to raise because the business is bad — they fail because they arrive in the room unprepared. This is the roadmap we work through with enterprise members, with the SEIS/EIS numbers current for the 2026–27 tax year."
      updated="July 2026 · figures per gov.uk guidance for the 2026–27 tax year"
      backHref="/guides"
      backLabel="All guides"
    >
      <Callout tone="note">
        General information, not advice. Nothing here is financial, tax, investment or legal advice, and the
        consortium does not arrange or promote investment in any particular company. Scheme eligibility is
        decided by HMRC case by case — take advice from a qualified accountant and, where relevant,
        FCA-authorised advisers on your own circumstances.
      </Callout>

      <GuideSection title="Stage 1 — Foundations investors expect to find">
        <p>
          Before any conversation about valuation, an investor&rsquo;s counsel will look for boring things done
          properly: a clean limited company with up-to-date Companies House filings; a cap table without
          surprises (founder vesting agreed, any advisor equity documented, no forgotten option promises); IP
          assigned to the company, not sitting with a founder or an old agency contract; and statutory registers
          and shareholder agreements that match reality. Fixing these mid-negotiation is expensive — fixing them
          now is administrative.
        </p>
      </GuideSection>

      <GuideSection title="Stage 2 — The story and the numbers">
        <p>
          Investment materials do three jobs: a <strong className="text-ivory-50">business plan</strong> that
          explains the problem, the wedge and why your team wins; <strong className="text-ivory-50">financial
          forecasts</strong> that show you understand your own unit economics (investors forgive optimism, not
          incoherence); and a <strong className="text-ivory-50">data room</strong> — accounts, contracts, key
          metrics — assembled before anyone asks. HMRC asks for the first two in an advance-assurance
          application anyway, so this work pays twice.
        </p>
      </GuideSection>

      <GuideSection title="Stage 3 — SEIS and EIS: the numbers that matter in 2026–27">
        <p>
          The UK&rsquo;s venture capital schemes are why early-stage cheques get written here.
          <strong className="text-ivory-50"> SEIS</strong> gives investors 50% income-tax relief on up to
          £200,000 invested per tax year; a company can raise up to <strong className="text-ivory-50">£250,000</strong> under
          SEIS if its gross assets are no more than £350,000 at issue, it has fewer than 25 full-time-equivalent
          employees, and the qualifying trade is less than 3 years old.
        </p>
        <p>
          <strong className="text-ivory-50">EIS</strong> gives investors 30% relief on up to £1&nbsp;million per
          year (£2&nbsp;million where at least half is in knowledge-intensive companies). Following the Autumn
          2025 Budget, the company limits doubled for shares issued from 6 April 2026: most companies can raise
          up to <strong className="text-ivory-50">£10&nbsp;million in any 12 months</strong> and
          <strong className="text-ivory-50"> £24&nbsp;million lifetime</strong>, with gross assets up to £30&nbsp;million
          before the raise (£35&nbsp;million after), fewer than 250 employees, and normally within 7 years of
          first commercial sale. Knowledge-intensive companies get higher ceilings again (£20&nbsp;million /
          £40&nbsp;million, up to 500 employees, 10-year window).
        </p>
        <p>
          In both schemes investors must hold the shares for at least three years, gains on qualifying exits can
          be free of Capital Gains Tax, and loss relief softens the downside — which is precisely why
          experienced UK angels ask &ldquo;is this SEIS/EIS eligible?&rdquo; before almost anything else. Note
          the exclusions: property development, most financial activities, hotels, energy generation and other
          listed trades don&rsquo;t qualify, and every raise must satisfy HMRC&rsquo;s risk-to-capital condition
          — genuine growth intent, genuine risk.
        </p>
      </GuideSection>

      <GuideSection title="Stage 4 — Advance assurance">
        <p>
          Advance assurance is HMRC&rsquo;s written indication, before you issue shares, that a proposed
          investment is likely to qualify. It is optional — but in practice most angels expect to see it. The
          application wants your business plan, forecasts, how much you plan to raise and how it will fund
          growth, your articles and register of members, the draft investor proposal, and details of at least
          one potential investor. HMRC publishes no service-level commitment; complete, straightforward
          applications commonly come back in a few weeks, incomplete ones take much longer. Two cautions worth
          engraving: it must be obtained <em>before</em> the shares are issued, and it is
          <strong className="text-ivory-50"> not an HMRC endorsement</strong> of your company or the
          investment&rsquo;s prospects.
        </p>
      </GuideSection>

      <GuideSection title="The readiness checklist">
        <ul className="mt-2! space-y-3">
          <CheckItem>Companies House filings current; statutory registers match the cap table</CheckItem>
          <CheckItem>Cap table clean — founder vesting, advisor equity and options all documented</CheckItem>
          <CheckItem>IP assigned to the company (founders, contractors, agencies)</CheckItem>
          <CheckItem>Business plan and 3-year forecasts that reconcile with each other</CheckItem>
          <CheckItem>Data room assembled: accounts, contracts, metrics, key hires</CheckItem>
          <CheckItem>SEIS/EIS eligibility sense-checked against the current limits and excluded activities</CheckItem>
          <CheckItem>Advance assurance application drafted — with a named potential investor</CheckItem>
          <CheckItem>The 60-second and 10-minute versions of the pitch, rehearsed on strangers</CheckItem>
          <CheckItem>A target list of rooms and introducers — capital follows relationships</CheckItem>
        </ul>
      </GuideSection>

      <GuideSection title="Stage 5 — The room">
        <p>
          Preparation converts only when it meets an audience. Warm introductions outperform cold outreach for
          one reason: someone credible has pre-underwritten your seriousness. That is the part the consortium
          was built for — enterprise members work through investor-readiness with senior mentors (five hours a
          month), and present finished propositions at the UK Investors Summit before an assembled investor
          panel, with interest captured on the platform rather than lost in a stack of business cards.
        </p>
      </GuideSection>

      <FaqBlock
        faqs={[
          {
            q: "How much can a UK company raise under EIS in 2026?",
            a: "For shares issued from 6 April 2026, most companies can raise up to £10 million in any 12-month period and £24 million over the company's lifetime under EIS, subject to the gross-assets (£30m/£35m), employee (<250 FTE) and age conditions. Knowledge-intensive companies have higher limits of £20 million annually and £40 million lifetime. Always confirm the current figures on gov.uk.",
          },
          {
            q: "What is the difference between SEIS and EIS?",
            a: "SEIS is for the earliest stage: up to £250,000 raised, gross assets up to £350,000, under 25 employees, trade under 3 years old — investors get 50% income-tax relief. EIS is the follow-on scheme with much larger company limits and 30% investor relief. Both require a 3-year holding period and genuine risk to the investor's capital.",
          },
          {
            q: "Is advance assurance an HMRC approval of my company?",
            a: "No. HMRC states advance assurance only indicates a proposed investment may qualify for scheme relief — it is not an endorsement of the company or its prospects, and final eligibility is only confirmed through the compliance process after shares are issued.",
          },
          {
            q: "How long does EIS advance assurance take?",
            a: "HMRC publishes no guaranteed timescale. Practitioners typically see straightforward, complete applications answered within several weeks; incomplete applications and edge cases take substantially longer. Applying with a named potential investor and a full document pack is the single biggest accelerator.",
          },
          {
            q: "Do all trades qualify for SEIS/EIS?",
            a: "No — excluded activities include property development, dealing in land or financial instruments, banking and insurance, legal and accountancy services, hotels, care homes, farming, shipbuilding, coal and steel, and energy generation. A company can still qualify if excluded activities are an insubstantial part (broadly under 20%) of its trade — and every raise must meet HMRC's risk-to-capital condition.",
          },
        ]}
      />

      <GuideCta
        heading="Become investor-ready with the people who host the room"
        sub="The Enterprise Investor Ready membership pairs monthly investment mentoring and EIS-readiness guidance with a slot at the UK Investors Summit — preparation and audience in one place."
        href="/join/ENT_INVESTOR"
        label="Explore Enterprise Investor Ready"
      />
    </GuideShell>
  );
}
