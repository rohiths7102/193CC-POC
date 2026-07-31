import Link from "next/link";
import { Crown, Landmark, Video, Newspaper, Users, TrendingUp, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { db } from "@/server/db";
import { gbp } from "@/lib/utils";
import { GlassCard, LinkButton, SectionTitle, Badge } from "@/components/ui";
import { Reveal, Stagger, StaggerItem, AnimatedNumber, LiftCard } from "@/components/motion";
import { Countdown, KineticTitle, TiltCard, EventFilm, LiquidRibbons } from "@/components/showcase";
import { PreloaderGate, IntroReveal, Magnetic, Spotlight, TextReveal, ParallaxY, FadeOutOnScroll } from "@/components/premium";
import { existsSync } from "fs";
import path from "path";
import { Logo, Crest } from "@/components/logo";
import { MobileNav } from "@/components/mobile-nav";
import { entitlementLabel, SLOT_KIND_LABEL } from "@/lib/labels";
import { appUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";

export const metadata = { alternates: { canonical: "/" } };

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

  // Structured data: the organisation (Companies House-verifiable) and, when
  // one is scheduled, the next Summit as a BusinessEvent.
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "193 Countries Consortium",
    legalName: "193 Countries Consortium Ltd",
    url: appUrl(),
    logo: `${appUrl()}/brand/193cc-logo.png`,
    identifier: { "@type": "PropertyValue", propertyID: "Companies House", value: "14499310" },
    address: {
      "@type": "PostalAddress",
      streetAddress: "Level 30, The Leadenhall Building, 122 Leadenhall Street",
      addressLocality: "London",
      postalCode: "EC3V 4AB",
      addressCountry: "GB",
    },
  };
  const eventLd = summit
    ? {
        "@context": "https://schema.org",
        "@type": "BusinessEvent",
        name: summit.name,
        startDate: summit.startsAt.toISOString(),
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: { "@type": "Place", name: summit.venue, address: { "@type": "PostalAddress", addressLocality: "London", addressCountry: "GB" } },
        organizer: { "@type": "Organization", name: "193 Countries Consortium", url: appUrl() },
      }
    : null;

  return (
    <main className="relative overflow-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
      {eventLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventLd) }} />}
      {/* Brand-reveal curtain — plays once per session, hero waits for it */}
      <PreloaderGate />

      {/* Ambience. With the film hero present, the aurora field alone
          carries it — a full-page animated canvas underneath glass cards
          forces every backdrop blur to recompute every frame, which is a
          frame-budget tax the film version doesn't need. The ribbons run
          only in the no-film fallback. */}
      {!hasFilm && <LiquidRibbons className="pointer-events-none fixed inset-0 z-0" />}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="aurora animate-aurora left-[8%] top-[-6rem] h-[30rem] w-[30rem] bg-ink-600" />
        <div className="aurora animate-aurora left-[55%] top-[4rem] h-[26rem] w-[26rem] bg-gold-700/50 [animation-delay:-6s]" />
      </div>

      {/* Nav — sticky glass band: identity left, destinations + one gold CTA
          right. Persistent, so the way in is never more than one glance away
          on a seven-screen page. */}
      <header className="sticky top-0 z-40 border-b hairline bg-ink-950/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <IntroReveal delay={0.55} y={-14}>
            <Link href="/" className="flex min-h-11 items-center text-sm sm:text-base">
              <Logo size={40} />
            </Link>
          </IntroReveal>
          <IntroReveal delay={0.65} y={-14}>
            <nav className="flex items-center gap-5">
              <Link href="#tiers" className="hidden text-sm text-mist transition-colors hover:text-ivory-100 sm:block">Memberships</Link>
              <Link href="/summit" className="hidden text-sm text-mist transition-colors hover:text-ivory-100 sm:block">Summit</Link>
              <Link href="/guides" className="hidden text-sm text-mist transition-colors hover:text-ivory-100 md:block">Guides</Link>
              <Link href="/login" className="hidden text-sm text-mist transition-colors hover:text-ivory-100 sm:block">Member sign in</Link>
              {/* Join pill is hidden on the smallest screens — the drawer's
                  full-width CTA replaces it, which also frees the 44px the
                  hamburger needs without crowding the logo. */}
              <LinkButton href="/join" size="sm" className="shine hidden sm:inline-flex">Join</LinkButton>
              <MobileNav />
            </nav>
          </IntroReveal>
        </div>
      </header>

      {/* Hero — full-bleed cinema: the client's real House of Lords footage
          under a navy scrim, one centred serif statement, one gold action.
          Height = remaining fold under the sticky header, no magic numbers. */}
      <FadeOutOnScroll>
      <section className="relative z-10 flex min-h-[calc(100svh-4.5rem)] flex-col overflow-hidden">
        {hasFilm ? (
          <div className="absolute inset-0 -z-10">
            <EventFilm src="/videos/summit-teaser.mp4" className="h-full w-full object-cover" />
            {/* scrim: keeps the statement AAA-legible over moving footage */}
            <div className="absolute inset-0 bg-gradient-to-b from-ink-950/85 via-ink-950/55 to-ink-900" />
          </div>
        ) : (
          /* No footage yet → the horological fallback keeps its dignity */
          <div className="pointer-events-none absolute inset-0 -z-10 select-none">
            <ParallaxY className="absolute inset-0" from={30} to={-50}>
              <span className="absolute right-[4%] top-[1%] hidden font-display text-[24rem] leading-none tracking-tight text-ivory-50/[0.05] lg:block">193</span>
            </ParallaxY>
            <div className="absolute right-[8%] top-[10%] hidden h-[440px] w-[440px] animate-[spin_140s_linear_infinite] rounded-full border border-gold-500/10 lg:block" />
            <div className="absolute right-[12%] top-[16%] hidden h-[340px] w-[340px] animate-[spin_90s_linear_infinite_reverse] rounded-full border border-dashed border-gold-500/[0.13] lg:block" />
          </div>
        )}

        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 py-10 sm:py-12 xl:py-16 text-center">
          <IntroReveal delay={0.1}>
            <p className="mb-4 sm:mb-6 inline-flex items-center gap-2 rounded-2xl sm:rounded-full border border-gold-500/25 bg-ink-950/40 px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-gold-300 backdrop-blur-sm">
              <Landmark className="h-3.5 w-3.5" /> Events held at the House of Lords, UK Parliament
            </p>
          </IntroReveal>
          <KineticTitle
            // 48px was too heavy at 375px (≈10 chars/line). Steps 34 → 48 → 72.
            className="font-display text-[2.15rem] leading-[1.1] text-ivory-50 sm:text-5xl sm:leading-[1.08] md:text-6xl md:leading-[1.07] xl:text-7xl xl:leading-[1.05]"
            words={[
              { text: "Membership" }, { text: "that" }, { text: "opens" },
              { text: "the", gold: true, italic: true }, { text: "most", gold: true, italic: true },
              { text: "exclusive", gold: true, italic: true }, { text: "doors", gold: true, italic: true },
              { text: "in" }, { text: "British" }, { text: "enterprise." },
            ]}
          />
          <IntroReveal delay={0.5}>
            <p className="mx-auto mt-6 max-w-2xl text-[11px] sm:text-xs uppercase leading-5 sm:leading-6 tracking-[0.14em] sm:tracking-[0.28em] xl:mt-8 text-ivory-200/85">
              Digital enrolment · e-signed agreements · mentoring, investors and the UK Investors Summit
            </p>
          </IntroReveal>
          <IntroReveal delay={0.68}>
            <div className="mt-8 flex justify-center xl:mt-10">
              <Magnetic>
                <LinkButton href="/join" size="lg" className="shine">Become a member <ArrowRight className="h-4 w-4" /></LinkButton>
              </Magnetic>
            </div>
            <p className="mt-6 text-[10px] uppercase tracking-[0.35em] text-mist">Membership is by application</p>
          </IntroReveal>
        </div>

        {/* scroll cue */}
        <IntroReveal delay={0.9} className="pb-8">
          <div className="mx-auto h-10 w-px overflow-hidden bg-gold-500/15">
            <span className="block h-1/2 w-full animate-[marquee-y_2.2s_ease-in-out_infinite] bg-gradient-to-b from-transparent via-gold-400 to-transparent" />
          </div>
        </IntroReveal>
      </section>
      </FadeOutOnScroll>

      {/* Credentials + numbers band — tight, editorial, no boxes.
          (A duplicate-content marquee that repeated six facts from this band
          used to sit below it — deleted.) */}
      <section className="relative z-10 border-y hairline bg-ink-950/60">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 pb-6 text-[11px] uppercase tracking-[0.22em] text-mist/80">
            <span>Est. London · 2022</span>
            <span className="hidden h-3 w-px bg-gold-500/25 sm:block" />
            <span>Companies House 14499310</span>
            <span className="hidden h-3 w-px bg-gold-500/25 sm:block" />
            <span>Summits since 2023</span>
          </div>
          <Stagger className="grid border-t hairline pt-6 sm:grid-cols-3">
            {[
              { n: 193, prefix: "", suffix: "", label: "Countries in the consortium" },
              { n: 2600, prefix: "£", suffix: "", label: "Credit unlocks the Major Event" },
              { n: 5, prefix: "", suffix: " hrs", label: "Monthly enterprise mentoring" },
            ].map((s, i) => (
              <StaggerItem key={s.label}>
                <div className={`py-2 pl-0 pr-4 sm:pl-5 ${i > 0 ? "sm:border-l sm:hairline" : ""} border-l-0`}>
                  <p className="font-display text-4xl text-ivory-50">
                    {s.prefix}<AnimatedNumber value={s.n} />{s.suffix}
                  </p>
                  <p className="mt-2 max-w-40 text-[10px] uppercase leading-4 tracking-[0.22em] text-mist/80">{s.label}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Tiers */}
      <section id="tiers" className="relative z-10 mx-auto max-w-6xl scroll-mt-24 px-6 py-16 sm:py-24">
        <Reveal>
          <SectionTitle
            kicker="Memberships"
            title={<>Four ways in. <span className="text-gold-grad">One standard of access.</span></>}
            sub="Compare the tiers side by side — fees, benefits and access, stated plainly."
          />
        </Reveal>
        <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4 xl:gap-5">
          {products.map((p, i) => (
            <StaggerItem key={p.id} className="h-full">
              <LiftCard className="h-full">
                <Spotlight className={`h-full rounded-2xl ${p.code === "ENT_INVESTOR" ? "card-flagship" : "card-lux"}`}>
                  <GlassCard strong={p.code === "ENT_INVESTOR"} className={`flex h-full flex-col p-6 ${p.code === "ENT_INVESTOR" ? "shadow-glow" : ""}`}>
                    <div className="flex items-center justify-between">
                      <span className="rounded-xl bg-gold-500/12 p-2.5 text-gold-400">{TIER_ICONS[p.code]}</span>
                      {p.code === "ENT_INVESTOR" && <Badge>Flagship</Badge>}
                      {p.code === "TEMPORARY" && <Badge tone="purple">Event-linked</Badge>}
                    </div>
                    <h3 className="mt-4 min-h-[3.125rem] font-display text-lg leading-snug text-ivory-50 xl:min-h-14 xl:text-xl">{p.name}</h3>
                    {/* Reserve 3 lines once the grid is multi-column: at 4-up the cards are
                        ~260px wide and the Investor Ready strapline wraps to 3 lines while
                        the others take 2, which pushed its price 23px below the row. */}
                    <p className="mt-1 min-h-10 text-sm leading-6 text-mist sm:min-h-[4.5rem]">{p.strapline}</p>
                    <p className="mt-4 font-display text-4xl text-ivory-50">
                      {gbp(p.priceMinor)}
                      <span className="ml-1 text-sm text-mist">{p.billing === "ANNUAL" ? "/year" : "one-time"}</span>
                    </p>
                    <ul className="mt-5 flex-1 space-y-2.5 text-sm text-ivory-200/85">
                      {/* One source of truth: the same DB entitlements the
                          /join/[code] page renders, in short form. */}
                      {p.entitlements.map((e) => (
                        <li key={e.id} className="flex gap-2.5">
                          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
                          {entitlementLabel(e.key, e.params as Record<string, unknown> | null, { short: true })}
                        </li>
                      ))}
                    </ul>
                    <LinkButton href={`/join/${p.code}`} variant={p.code === "ENT_INVESTOR" ? "gold" : "ghost"} className="shine mt-6 w-full">
                      {p.code === "TEMPORARY" ? "Apply for a Summit slot" : "Join now"}
                    </LinkButton>
                  </GlassCard>
                </Spotlight>
              </LiftCard>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Statement band — one breath between chapters, exactly one screen's
          worth. (A pinned 3.6-screen version was measured at 14× sparser
          than every other section — luxury is pacing, not emptiness.) */}
      <section className="relative z-10 border-t hairline py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <TextReveal
            as="p"
            text="Where British enterprise meets the world."
            className="font-display text-4xl leading-[1.12] text-ivory-50 md:text-6xl"
          />
          <Reveal delay={0.35}>
            <p className="mx-auto mt-6 text-xs uppercase tracking-[0.3em] text-gold-500/80">
              One consortium · 193 countries
            </p>
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 border-t hairline bg-ink-950/30 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <SectionTitle kicker="Enrolment" title={<>Signed, paid, <span className="text-gold-grad">activated.</span></>}
              sub="Your account is held pending until signature and payment both clear — then everything unlocks at once." />
          </Reveal>
          <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: "Choose your tier", d: "Compare benefits and fees, transparently." },
              { t: "Confirm & e-sign", d: "Prove your email with a 6-digit code, then sign electronically — stored on your record forever." },
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
        <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <Reveal>
            <SectionTitle
              kicker="The UK Investors Summit"
              title={<>Forty-five slots. <span className="text-gold-grad">Three stages.</span> One room that matters.</>}
              sub="Inside: business-opportunity pitches in front of the investor panel, live brand launches, and the business awards — followed by investor networking. 15 slots per category, allocated through the intent-letter process with an automated waitlist."
            />
          </Reveal>

          {summit?.summit && (
            <Reveal delay={0.1}>
              <div className="mt-12 flex flex-wrap items-end gap-10">
                <Countdown target={summit.startsAt.toISOString()} label={`${summit.name} — ${summit.venue}`} />
                <Countdown target={summit.summit.deadlineAt.toISOString()} label="Intent-letter deadline closes in" />
              </div>
            </Reveal>
          )}

          <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { t: SLOT_KIND_LABEL.PRESENTATION, d: "Pitch one opportunity to the assembled investor panel — deal-flow interest is captured live on the platform.", n: "01" },
              { t: SLOT_KIND_LABEL.BRAND_LAUNCH, d: "Unveil your brand on the Summit stage, with the consortium's featured-video benefit amplifying it afterwards.", n: "02" },
              { t: SLOT_KIND_LABEL.AWARD, d: "Receive recognition before the consortium's international membership — nominated and confirmed through the platform.", n: "03" },
            ].map((c) => (
              <StaggerItem key={c.t} className="h-full">
                <TiltCard className="h-full">
                  <GlassCard strong className="flex h-full flex-col p-7">
                    <span className="font-display text-5xl text-gold-500/20">{c.n}</span>
                    <h3 className="mt-3 font-display text-xl text-ivory-50">{c.t}</h3>
                    <p className="mt-2 flex-1 text-sm leading-6 text-mist">{c.d}</p>
                    <Badge tone="gold" className="mt-5 w-fit">15 slots</Badge>
                  </GlassCard>
                </TiltCard>
              </StaggerItem>
            ))}
          </Stagger>

          <Reveal delay={0.15}>
            <div className="mt-12 flex flex-wrap items-center gap-4">
              <LinkButton href="/join/TEMPORARY" size="lg">Apply for a Summit slot <ArrowRight className="h-4 w-4" /></LinkButton>
              <p className="text-xs text-mist">Applications close automatically at the deadline — waitlist promotion is instant on any cancellation.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Enterprise benefits — bento grid: one hero tile, stat tiles, a
          full-width closing strip. Asymmetric on desktop, stacked on mobile. */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <Reveal>
          <SectionTitle kicker="Enterprise tiers" title={<>Benefits that <span className="text-gold-grad">compound.</span></>}
            sub="Every enterprise membership stacks brand, publishing, mentoring and investor access — provisioned automatically the moment your membership activates." />
        </Reveal>
        <Stagger className="mt-12 grid auto-rows-[minmax(150px,auto)] gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Hero tile — the flagship benefit */}
          <StaggerItem className="sm:col-span-2 lg:row-span-2">
            <Spotlight className="card-lux h-full rounded-2xl">
              <GlassCard strong className="flex h-full flex-col p-8">
                <span className="inline-flex w-fit rounded-xl bg-gold-500/12 p-3 text-gold-400"><Video className="h-6 w-6" /></span>
                <span className="mt-auto font-display text-6xl text-gold-500/15">01</span>
                <h3 className="mt-2 font-display text-2xl leading-snug text-ivory-50">Featured branding video</h3>
                <p className="mt-3 text-sm leading-7 text-mist">
                  Filmed with a CXO of the 193 Countries Consortium and premiered around the Summit stage —
                  your enterprise, told at the standard of the room it plays in.
                </p>
              </GlassCard>
            </Spotlight>
          </StaggerItem>

          {/* Article tile */}
          <StaggerItem className="sm:col-span-2">
            <Spotlight className="card-lux h-full rounded-2xl">
              <GlassCard className="flex h-full flex-col justify-between gap-4 p-8">
                <span className="inline-flex w-fit rounded-xl bg-gold-500/12 p-2.5 text-gold-400"><Newspaper className="h-5 w-5" /></span>
                <div>
                  <h3 className="font-display text-xl text-ivory-50">1,400-word website article</h3>
                  <p className="mt-2 text-sm leading-6 text-mist">Plus two HD images — editorially reviewed before publication.</p>
                </div>
              </GlassCard>
            </Spotlight>
          </StaggerItem>

          {/* Guidance tiles — the two benefits no other section covers */}
          <StaggerItem>
            <Spotlight className="card-lux h-full rounded-2xl">
              <GlassCard className="flex h-full flex-col justify-between gap-3 p-6">
                <span className="inline-flex w-fit rounded-lg bg-gold-500/12 p-2 text-gold-400"><TrendingUp className="h-4 w-4" /></span>
                <div>
                  <h3 className="font-display text-lg text-ivory-50">EIS-readiness</h3>
                  <p className="mt-1 text-xs leading-5 text-mist">Investment-portfolio guidance for British-based companies.</p>
                </div>
              </GlassCard>
            </Spotlight>
          </StaggerItem>
          <StaggerItem>
            <Spotlight className="card-lux h-full rounded-2xl">
              <GlassCard className="flex h-full flex-col justify-between gap-3 p-6">
                <span className="inline-flex w-fit rounded-lg bg-gold-500/12 p-2 text-gold-400"><Users className="h-4 w-4" /></span>
                <div>
                  <h3 className="font-display text-lg text-ivory-50">Investor deal-flow</h3>
                  <p className="mt-1 text-xs leading-5 text-mist">Your pitch before the investor panel — visible only with your consent.</p>
                </div>
              </GlassCard>
            </Spotlight>
          </StaggerItem>
        </Stagger>
      </section>

      {/* CTA */}
      <section className="relative z-10 border-t hairline">
        <div className="mx-auto max-w-4xl px-6 pb-12 pt-16 sm:pb-16 sm:pt-24 text-center">
          <Reveal>
            <h2 className="font-display text-4xl leading-tight text-ivory-50 md:text-5xl">
              Your seat at the table is <span className="text-gold-grad">one signature away.</span>
            </h2>
            <div className="mt-10 flex justify-center">
              <Magnetic><LinkButton href="/join" size="lg" className="shine">Become a member</LinkButton></Magnetic>
            </div>
          </Reveal>
        </div>

        {/* Footer as a destination — not an afterthought */}
        <footer className="relative overflow-hidden border-t hairline">
          <div className="pointer-events-none absolute inset-x-0 bottom-[-0.32em] select-none text-center">
            <span className="text-outline-gold font-display text-[clamp(9rem,26vw,20rem)] leading-none">193</span>
          </div>
          <div className="relative mx-auto max-w-6xl px-6 py-16">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
              <div>
                <Logo size={40} />
                <p className="mt-5 max-w-xs text-sm leading-6 text-mist">
                  A collaborative business partner platform — enterprises from 193 countries
                  standing together for international growth.
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-500">Membership</p>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {[
                    { href: "/join/ENT_INVESTOR", label: "Enterprise Investor Ready" },
                    { href: "/summit", label: "The UK Investors Summit" },
                    { href: "/events/house-of-lords", label: "House of Lords events" },
                    { href: "/guides", label: "Guides" },
                  ].map((l) => (
                    <li key={l.href}>
                      {/* min-h-11: footer links measured 20px tall on a phone. */}
                      <Link href={l.href} className="group inline-flex min-h-11 items-center gap-2 text-ivory-200/80 transition-colors hover:text-gold-300">
                        <span className="inline-block h-px w-0 bg-gold-400 transition-all duration-300 group-hover:w-4" />
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-500">The Consortium</p>
                <ul className="mt-4 space-y-2.5 text-sm">
                  <li className="text-ivory-200/80">Level 30, The Leadenhall Building</li>
                  <li className="text-ivory-200/80">122 Leadenhall Street, London</li>
                  <li className="text-mist">Companies House 14499310</li>
                  <li>
                    <Link href="/privacy" className="group inline-flex min-h-11 items-center gap-2 text-ivory-200/80 transition-colors hover:text-gold-300">
                      <span className="inline-block h-px w-0 bg-gold-400 transition-all duration-300 group-hover:w-4" />
                      Privacy Policy
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t hairline pt-8 text-xs text-mist/80">
              <span className="flex items-center gap-3"><Crest size={28} className="opacity-80" /> © 2026 193 Countries Consortium</span>
              {/* Demo notice stays off deployed/indexed pages — local only,
                  same gate as the login demo credentials. */}
              <span>
                Contracts e-signed &amp; stored
                {process.env.SHOW_DEMO_LOGINS === "true" && " · Demo environment: payments and signatures are simulated"}
              </span>
            </div>
          </div>
        </footer>
      </section>
    </main>
  );
}

