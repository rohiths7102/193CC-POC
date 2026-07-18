import Link from "next/link";
import { Crown, Landmark, Video, Newspaper, Users, TrendingUp, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { db } from "@/server/db";
import { gbp } from "@/lib/utils";
import { GlassCard, LinkButton, SectionTitle, Badge } from "@/components/ui";
import { Reveal, Stagger, StaggerItem, AnimatedNumber, LiftCard } from "@/components/motion";
import { Countdown, KineticTitle, TiltCard, EventFilm, LiquidRibbons } from "@/components/showcase";
import { existsSync } from "fs";
import path from "path";
import { Logo, Crest } from "@/components/logo";

export const dynamic = "force-dynamic";

const TIER_ICONS: Record<string, React.ReactNode> = {
  INDIVIDUAL: <Users className="h-5 w-5" />,
  ENT_STANDARD: <TrendingUp className="h-5 w-5" />,
  ENT_INVESTOR: <Crown className="h-5 w-5" />,
  TEMPORARY: <Sparkles className="h-5 w-5" />,
};

export default async function Landing() {
  const products = await db.product.findMany({
    where: { active: true }, orderBy: { sortOrder: "asc" },
    include: { entitlements: true },
  });
  const summit = await db.event.findFirst({
    where: { kind: "SUMMIT", startsAt: { gte: new Date() } },
    include: { summit: true }, orderBy: { startsAt: "asc" },
  });
  // Real event footage drops in at public/videos/summit-teaser.mp4 — the film
  // block renders only when the client's actual footage exists (no stock fakery).
  const hasFilm = existsSync(path.join(process.cwd(), "public", "videos", "summit-teaser.mp4"));

  return (
    <main className="relative overflow-hidden">
      {/* Aurora field */}
      {/* Liquid light ribbons — fixed behind every section; scroll drives the flow */}
      <LiquidRibbons className="pointer-events-none fixed inset-0 z-0 h-screen w-screen" />
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="aurora animate-aurora left-[8%] top-[-6rem] h-[30rem] w-[30rem] bg-ink-600" />
        <div className="aurora animate-aurora left-[55%] top-[4rem] h-[26rem] w-[26rem] bg-gold-700/50 [animation-delay:-6s]" />
      </div>

      {/* Nav */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-base">
          <Logo size={40} />
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="#tiers" className="hidden text-sm text-mist hover:text-ivory-100 sm:block">Memberships</Link>
          <Link href="#summit" className="hidden text-sm text-mist hover:text-ivory-100 sm:block">Summit</Link>
          <LinkButton href="/login" variant="ghost" size="sm">Member sign in</LinkButton>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-14 md:pt-24">
        {/* Right-side anchor: giant ghosted brand numerals + slow horological rings */}
        <div className="pointer-events-none absolute -right-8 top-0 hidden h-full w-1/2 select-none lg:block">
          <span className="absolute right-[4%] top-[1%] font-display text-[24rem] leading-none tracking-tight text-ivory-50/[0.05]">193</span>
          <div className="absolute right-[8%] top-[10%] h-[440px] w-[440px] animate-[spin_140s_linear_infinite] rounded-full border border-gold-500/10" />
          <div className="absolute right-[12%] top-[16%] h-[340px] w-[340px] animate-[spin_90s_linear_infinite_reverse] rounded-full border border-dashed border-gold-500/[0.13]" />
          <div className="absolute right-[16%] top-[22%] h-[240px] w-[240px] rounded-full border border-ivory-50/[0.04]" />
        </div>
        <Reveal>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold-500/25 bg-gold-500/8 px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-gold-300">
            <Landmark className="h-3.5 w-3.5" /> Events held at the House of Lords, UK Parliament
          </p>
        </Reveal>
        <KineticTitle
          className="max-w-3xl font-display text-5xl leading-[1.06] text-ivory-50 md:text-7xl"
          words={[
            { text: "Membership" }, { text: "that" }, { text: "opens" },
            { text: "the", gold: true, italic: true }, { text: "most", gold: true, italic: true },
            { text: "exclusive", gold: true, italic: true }, { text: "doors", gold: true, italic: true },
            { text: "in" }, { text: "British" }, { text: "enterprise." },
          ]}
        />
        <Reveal delay={0.16}>
          <p className="mt-6 max-w-xl text-lg leading-8 text-mist">
            Digital enrolment, e-signed agreements and instant access to mentoring, investors
            and the UK Investors Summit — from the moment your membership activates.
          </p>
        </Reveal>
        <Reveal delay={0.24}>
          <div className="mt-9 flex flex-wrap items-center gap-7">
            <LinkButton href="/join" size="lg">Become a member <ArrowRight className="h-4 w-4" /></LinkButton>
            <Link href="#tiers" className="group inline-flex items-center gap-2 text-sm tracking-wide text-ivory-200/80 transition-colors hover:text-gold-300">
              Compare the tiers
              <span className="inline-block h-px w-8 bg-gold-500/50 transition-all group-hover:w-12 group-hover:bg-gold-400" />
            </Link>
          </div>
          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-2 border-t hairline pt-5 text-[11px] uppercase tracking-[0.22em] text-mist/70">
            <span>Est. London · 2022</span>
            <span className="hidden h-3 w-px bg-gold-500/25 sm:block" />
            <span>Companies House 14499310</span>
            <span className="hidden h-3 w-px bg-gold-500/25 sm:block" />
            <span>Summits at the House of Lords since 2023</span>
          </div>
        </Reveal>

        {/* Animated stats */}
        {/* Editorial stat row — bare numerals with hairline separations, no boxes */}
        <Stagger className="mt-14 grid grid-cols-2 md:grid-cols-4">
          {[
            { n: 193, prefix: "", suffix: "", label: "Countries in the consortium" },
            { n: 45, prefix: "", suffix: "", label: "Summit slots per event" },
            { n: 2600, prefix: "£", suffix: "", label: "Credit unlocks the Major Event" },
            { n: 5, prefix: "", suffix: " hrs", label: "Monthly enterprise mentoring" },
          ].map((s, i) => (
            <StaggerItem key={s.label}>
              <div className={`py-2 pl-5 pr-4 ${i > 0 ? "md:border-l md:hairline" : ""} border-l-0`}>
                <p className="font-display text-4xl text-ivory-50">
                  {s.prefix}<AnimatedNumber value={s.n} />{s.suffix}
                </p>
                <p className="mt-2 max-w-40 text-[10px] uppercase leading-4 tracking-[0.22em] text-mist/80">{s.label}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Marquee */}
      <div className="relative z-10 border-y hairline bg-ink-950/40 py-4">
        <div className="flex overflow-hidden">
          <div className="flex min-w-full shrink-0 animate-marquee items-center gap-12 px-6">
            {Array.from({ length: 2 }).flatMap((_, r) =>
              ["House of Lords receptions", "UK Investors Summit", "Featured branding videos", "EIS-readiness guidance", "Senior consultant mentoring", "Investor deal-flow"].map((t, i) => (
                <span key={`${r}-${i}`} className="flex items-center gap-3 whitespace-nowrap text-sm uppercase tracking-[0.22em] text-mist/70">
                  <span className="h-1 w-1 rounded-full bg-gold-500" /> {t}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Tiers */}
      <section id="tiers" className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <Reveal>
          <SectionTitle
            kicker="Memberships"
            title={<>Four ways in. <span className="text-gold-grad">One standard of access.</span></>}
            sub="Every enrolment is contract-first: you sign electronically, pay by card or Direct Debit, and your benefits provision themselves the second your membership activates."
          />
        </Reveal>
        <Stagger className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {products.map((p, i) => (
            <StaggerItem key={p.id} className="h-full">
              <LiftCard className="h-full">
                <GlassCard strong={p.code === "ENT_INVESTOR"} className={`flex h-full flex-col p-6 ${p.code === "ENT_INVESTOR" ? "ring-1 ring-gold-500/40 shadow-glow" : ""}`}>
                  <div className="flex items-center justify-between">
                    <span className="rounded-xl bg-gold-500/12 p-2.5 text-gold-400">{TIER_ICONS[p.code]}</span>
                    {p.code === "ENT_INVESTOR" && <Badge>Flagship</Badge>}
                    {p.code === "TEMPORARY" && <Badge tone="purple">Event-linked</Badge>}
                  </div>
                  <h3 className="mt-4 font-display text-xl text-ivory-50">{p.name}</h3>
                  <p className="mt-1 min-h-10 text-sm leading-6 text-mist">{p.strapline}</p>
                  <p className="mt-4 font-display text-4xl text-ivory-50">
                    {gbp(p.priceMinor)}
                    <span className="ml-1 text-sm text-mist">{p.billing === "ANNUAL" ? "/year" : "one-time"}</span>
                  </p>
                  <ul className="mt-5 flex-1 space-y-2.5 text-sm text-ivory-200/85">
                    {benefitLines(p.code).map((b) => (
                      <li key={b} className="flex gap-2.5">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" /> {b}
                      </li>
                    ))}
                  </ul>
                  <LinkButton href={`/join/${p.code}`} variant={p.code === "ENT_INVESTOR" ? "gold" : "ghost"} className="mt-6 w-full">
                    {p.code === "TEMPORARY" ? "Apply for a slot" : "Join now"}
                  </LinkButton>
                </GlassCard>
              </LiftCard>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* How it works */}
      <section className="relative z-10 border-t hairline bg-ink-950/30 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <SectionTitle kicker="Enrolment" title={<>Signed, paid, <span className="text-gold-grad">activated.</span></>}
              sub="No paperwork, no waiting on email. The platform holds your account in a pending state until both gates clear — then everything unlocks at once." />
          </Reveal>
          <Stagger className="mt-12 grid gap-5 md:grid-cols-4">
            {[
              { t: "Choose your tier", d: "Compare benefits and fees, transparently." },
              { t: "E-sign your agreement", d: "A legally binding electronic signature, stored on your record forever." },
              { t: "Pay your way", d: "One-time card payment, or Direct Debit instalments on enterprise tiers." },
              { t: "Access provisions itself", d: "Dashboard, mentoring hours, Summit booking — live in seconds." },
            ].map((s, i) => (
              <StaggerItem key={s.t}>
                <div className="relative rounded-2xl border hairline bg-ink-800/40 p-6">
                  <span className="font-display text-5xl text-gold-500/25">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-3 font-display text-lg text-ivory-50">{s.t}</h3>
                  <p className="mt-2 text-sm leading-6 text-mist">{s.d}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Summit experience — cinematic section */}
      <section id="summit" className="relative z-10 overflow-hidden border-y hairline bg-ink-950/50">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_500px_at_75%_20%,rgba(198,161,91,0.07),transparent_60%),radial-gradient(700px_420px_at_15%_85%,rgba(15,155,215,0.05),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-900 via-transparent to-ink-900" />
        <div className="relative mx-auto max-w-6xl px-6 py-24">
          <Reveal>
            <SectionTitle
              kicker="The UK Investors Summit"
              title={<>Forty-five slots. <span className="text-gold-grad">Three stages.</span> One room that matters.</>}
              sub="Inside: business-opportunity pitches in front of the investor panel, live brand launches, and the business awards — followed by investor networking. 15 slots per category, allocated through the intent-letter process with an automated waitlist."
            />
          </Reveal>

          {summit?.summit && (
            <Reveal delay={0.1}>
              <div className="mt-10 flex flex-wrap items-end gap-10">
                <Countdown target={summit.startsAt.toISOString()} label={`${summit.name} — ${summit.venue}`} />
                <Countdown target={summit.summit.deadlineAt.toISOString()} label="Intent-letter deadline closes in" />
              </div>
            </Reveal>
          )}

          <Stagger className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { t: "Business Opportunity Presentation", d: "Pitch one opportunity to the assembled investor panel — deal-flow interest is captured live on the platform.", n: "01" },
              { t: "Brand Launch", d: "Unveil your brand on the Summit stage, with the consortium's featured-video benefit amplifying it afterwards.", n: "02" },
              { t: "Business Award", d: "Receive recognition before the consortium's international membership — nominated and confirmed through the platform.", n: "03" },
            ].map((c) => (
              <StaggerItem key={c.t} className="h-full">
                <TiltCard className="h-full">
                  <GlassCard strong className="flex h-full flex-col p-7">
                    <span className="font-display text-5xl text-gold-500/20">{c.n}</span>
                    <h3 className="mt-3 font-display text-xl text-ivory-50">{c.t}</h3>
                    <p className="mt-2 flex-1 text-sm leading-6 text-mist">{c.d}</p>
                    <Badge tone="gold" className="mt-5 w-fit">15 slots per event</Badge>
                  </GlassCard>
                </TiltCard>
              </StaggerItem>
            ))}
          </Stagger>

          {hasFilm && (
            <Reveal delay={0.1}>
              <div className="mt-12 h-[380px] overflow-hidden rounded-3xl ring-1 ring-gold-500/25">
                <EventFilm src="/videos/summit-teaser.mp4" />
              </div>
            </Reveal>
          )}

          <Reveal delay={0.15}>
            <div className="mt-12 flex flex-wrap items-center gap-4">
              <LinkButton href="/join/TEMPORARY" size="lg">Apply for the Summit <ArrowRight className="h-4 w-4" /></LinkButton>
              <p className="text-xs text-mist">Applications close automatically at the deadline — waitlist promotion is instant on any cancellation.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Enterprise benefits */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <div>
              <SectionTitle kicker="Enterprise tiers" title={<>Benefits that <span className="text-gold-grad">compound.</span></>}
                sub="Every enterprise membership stacks brand, publishing, mentoring and investor access — provisioned automatically the moment your membership activates." />
              <LinkButton href="/join" className="mt-8">Compare memberships <ArrowRight className="h-4 w-4" /></LinkButton>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <GlassCard strong className="p-8">
              <div className="flex items-center gap-3">
                <Video className="h-5 w-5 text-gold-400" />
                <h3 className="font-display text-xl text-ivory-50">Enterprise benefits, delivered</h3>
              </div>
              <ul className="mt-6 space-y-4">
                {[
                  { icon: <Video className="h-4 w-4" />, t: "Featured branding video", d: "Filmed with a CXO of the 193 Countries Consortium" },
                  { icon: <Newspaper className="h-4 w-4" />, t: "1,400-word website article", d: "Plus two HD images, editorially reviewed before publication" },
                  { icon: <Users className="h-4 w-4" />, t: "5 hours monthly mentoring", d: "Enterprise or investment mentors, tracked to the minute" },
                  { icon: <Crown className="h-4 w-4" />, t: "Major Event at £2,600 credited", d: "Unlocks automatically the moment your cumulative payments cross the line" },
                ].map((b) => (
                  <li key={b.t} className="flex gap-4">
                    <span className="mt-0.5 rounded-lg bg-gold-500/12 p-2 text-gold-400">{b.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-ivory-50">{b.t}</p>
                      <p className="text-sm text-mist">{b.d}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </GlassCard>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 border-t hairline">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <Reveal>
            <h2 className="font-display text-4xl leading-tight text-ivory-50 md:text-5xl">
              Your seat at the table is <span className="text-gold-grad">one signature away.</span>
            </h2>
            <div className="mt-9 flex justify-center gap-4">
              <LinkButton href="/join" size="lg">Start enrolment</LinkButton>
              <LinkButton href="/login" variant="ghost" size="lg">Member sign in</LinkButton>
            </div>
          </Reveal>
        </div>
        <footer className="border-t hairline py-10 text-center text-xs text-mist/60">
          <Crest size={44} className="mx-auto mb-4 opacity-80" />
          © 2026 193 Countries Consortium · <Link href="/privacy" className="underline decoration-gold-500/40 underline-offset-2 hover:text-ivory-100">Privacy Policy</Link> · Contracts e-signed & stored · Demo environment: payments and signatures are simulated
        </footer>
      </section>
    </main>
  );
}

function benefitLines(code: string): string[] {
  switch (code) {
    case "INDIVIDUAL":
      return ["One Main Event, delegate capacity", "2 hrs/month senior mentoring", "News & networking access"];
    case "ENT_STANDARD":
      return ["Featured branding video", "UK Investors Summit access", "1,400-word article + 2 HD images", "5 hrs/month enterprise mentoring", "Business-model guidance"];
    case "ENT_INVESTOR":
      return ["Everything in Standard", "5 hrs/month investment mentoring", "EIS-readiness guidance", "Investor deal-flow visibility"];
    case "TEMPORARY":
      return ["One Summit slot (of 3 categories)", "Intent-letter fast-track", "Waitlist protection", "Time-limited member access"];
    default:
      return [];
  }
}
