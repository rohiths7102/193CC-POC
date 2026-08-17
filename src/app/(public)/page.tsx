import Link from "next/link";
import { Crown, Landmark, Video, Newspaper, Users, TrendingUp, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { db } from "@/server/db";
import { gbp } from "@/lib/utils";
import { GlassCard, LinkButton, SectionTitle, Badge } from "@/components/ui";
import { Reveal, Stagger, StaggerItem, AnimatedNumber, LiftCard } from "@/components/motion";
import { Countdown, KineticTitle, TiltCard, EventFilm, AmbientField } from "@/components/showcase";
import { PreloaderGate, IntroReveal, Magnetic, Spotlight, TextReveal, ParallaxY, FadeOutOnScroll } from "@/components/premium";
import { FlagshipCard } from "@/components/flagship-card";
import { Globe } from "@/components/globe";
import { SiteHeader } from "@/components/site-header";
import { CountryMarquee } from "@/components/country-marquee";
import { existsSync } from "fs";
import path from "path";
import { Logo, Crest } from "@/components/logo";
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
  // The flagship tier is composed as its own object above the grid; the grid
  // carries the rest in their seeded order.
  const flagship = products.find((p) => p.code === "ENT_INVESTOR") ?? null;
  const rest = products.filter((p) => p.code !== "ENT_INVESTOR");

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

  // overflow-x-clip, NOT overflow-hidden: `hidden` on either axis makes <main> a
  // scroll container, which then becomes the nearest scrollport for the
  // `sticky top-0` header below — and since <main> never scrolls internally, the
  // header silently stopped sticking and scrolled away on the first swipe,
  // taking the only mobile nav with it. `clip` clips the oversized decorative
  // type horizontally just the same, without establishing a scrollport (and
  // legally pairs with the default overflow-y: visible).
  return (
    <main className="relative overflow-x-clip">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
      {eventLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventLd) }} />}
      {/* Brand-reveal curtain — plays once per session, hero waits for it */}
      <PreloaderGate />

      {/* Ambience — the whole-page atmospheric ground. A fixed, full-viewport
          noise field in the brand trio at ~3% ink, drifting with the pointer
          and the scroll. It sits at z-0 under everything; every white band
          above is `bg-white/[0.xx]` rather than opaque so the field shows
          through as a faint weather system behind the page. On low-power,
          touch and reduced-motion the component returns null and the still
          white ground is what remains. */}
      <AmbientField className="pointer-events-none fixed inset-0 z-0 h-svh w-full opacity-60" />

      {/* Nav — transparent over the film so the hero runs edge to edge under
          the wordmark; settles to the solid white bar once scrolled. */}
      <SiteHeader />

      {/* Hero — full-bleed cinema: the client's real House of Lords footage
          under a navy scrim, one centred serif statement, one gold action.
          Height = remaining fold under the sticky header, no magic numbers. */}
      <FadeOutOnScroll>
      {/* LSI's hero: 228px of air above a centred, uppercase Roboto Condensed
          700 statement with one word in brand red, then a single flat CTA.
          `on-dark` only when the film is present — over footage the statement
          has to be white to stay legible, but the no-film fallback sits on the
          white ground where LSI's own near-black type is correct. */}
      {/* The header is transparent and sticky, so the hero pulls up under it
          (-mt, full 100svh) and pads its content back down — the film runs
          behind the wordmark instead of stopping at a white strip. */}
      <section className={`relative z-10 -mt-[4.5rem] flex min-h-svh flex-col overflow-hidden ${hasFilm ? "on-dark matte-noise" : ""}`}>
        {hasFilm ? (
          <div className="absolute inset-0 -z-10">
            {/* The film breathes: 1 → 1.035 over 15s, alternating, forever.
                Barely perceptible as motion, unmistakable as life. Wrapper
                carries the transform so the video's own decode path is
                untouched; the section's overflow-hidden eats the overscan.
                The filter pulls saturation down and lifts contrast a touch —
                straight footage read as a muddy blue wash under the scrim;
                graded, it reads as cinema. */}
            <div className="animate-slow-pulse absolute inset-0 will-change-transform [filter:saturate(0.72)_contrast(1.06)_brightness(0.96)]">
              <EventFilm src="/videos/summit-teaser.mp4" poster="/videos/summit-poster.jpg" className="h-full w-full object-cover" />
            </div>
            {/* Directional scrim — heaviest at the foot and the left where the
                type sits, lighter top-right so the frame keeps some air. The
                foot floor stays ≥/80 so white type measures ≥7:1 over any
                frame. Second layer is a soft brand-red bloom low-left. */}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(35,42,66,0.78)_0%,rgba(35,42,66,0.66)_38%,rgba(35,42,66,0.84)_72%,rgba(23,27,44,0.96)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_18%_88%,rgba(214,57,47,0.22),transparent_60%),radial-gradient(60%_50%_at_88%_10%,rgba(255,255,255,0.06),transparent_60%)]" />
          </div>
        ) : (
          /* No footage yet → the horological fallback keeps its dignity */
          <div className="pointer-events-none absolute inset-0 -z-10 select-none">
            <ParallaxY className="absolute inset-0" from={30} to={-50}>
              <span className="absolute right-[4%] top-[1%] hidden font-display text-[24rem] font-thin leading-none tracking-tight text-ivory-50/[0.06] lg:block">193</span>
            </ParallaxY>
            <div className="absolute right-[8%] top-[10%] hidden h-[440px] w-[440px] animate-[spin_140s_linear_infinite] rounded-full border border-line lg:block" />
            <div className="absolute right-[12%] top-[16%] hidden h-[340px] w-[340px] animate-[spin_90s_linear_infinite_reverse] rounded-full border border-dashed border-line lg:block" />
          </div>
        )}

        {/* Data plates — mono instrument labels in the corners. Every value
            is real and verifiable: registration, the office coordinates. They
            are what makes a hero feel authored rather than templated. */}
        {hasFilm && (
          <>
            <IntroReveal delay={0.95} className="pointer-events-none absolute left-6 top-24 hidden lg:block">
              <p className="font-mono text-[10px] uppercase leading-5 tracking-[0.22em] text-white/55">
                Est. London · 2022<br />Companies House 14499310
              </p>
            </IntroReveal>
            <IntroReveal delay={1.05} className="pointer-events-none absolute right-6 top-24 hidden text-right lg:block">
              <p className="font-mono text-[10px] uppercase leading-5 tracking-[0.22em] text-white/55">
                51.5139° N · 0.0822° W<br />The Leadenhall Building · EC3V
              </p>
            </IntroReveal>
          </>
        )}

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 pb-8 pt-[7.5rem] text-center sm:pt-32 xl:pt-40">
          <IntroReveal delay={0.1}>
            <p className={`mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.2em] backdrop-blur-md sm:mb-8 ${hasFilm ? "border-white/25 bg-white/10 text-white" : "border-gold-500/25 bg-gold-500/8 text-gold-600"}`}>
              <Landmark className="h-3.5 w-3.5" /> Events held at the House of Lords, UK Parliament
            </p>
          </IntroReveal>
          {/* Uppercase 700 at 1.0 leading is LSI's exact hero treatment; the
              size is 1.5× theirs — fluid from 36px at 375 to 96px at 1440 so
              the statement owns the width instead of sitting inside it. */}
          <KineticTitle
            className={`font-display text-[clamp(2.25rem,7vw,96px)] font-bold uppercase leading-[0.98] tracking-[-0.015em] ${hasFilm ? "text-white" : "text-ivory-50"}`}
            words={[
              { text: "Membership" }, { text: "that" }, { text: "opens" },
              { text: "the" }, { text: "most" },
              { text: "exclusive", gold: true }, { text: "doors" },
              { text: "in" }, { text: "British" }, { text: "enterprise" },
            ]}
          />
          <IntroReveal delay={0.5}>
            <p className={`mx-auto mt-7 max-w-2xl text-[15px] leading-[1.7] sm:text-[19px] xl:mt-9 ${hasFilm ? "text-white/85" : "text-mist"}`}>
              Digital enrolment · e-signed agreements · mentoring, investors and the UK Investors Summit
            </p>
          </IntroReveal>
          <IntroReveal delay={0.68}>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row xl:mt-10">
              <Magnetic>
                <LinkButton href="/join" size="lg" className="shine">Become a member <ArrowRight className="h-4 w-4" /></LinkButton>
              </Magnetic>
              <Link href="/summit" className={`inline-flex min-h-11 items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors ${hasFilm ? "text-white/75 hover:text-white" : "text-mist hover:text-ivory-50"}`}>
                The UK Investors Summit <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <p className={`mt-6 font-mono text-[10px] uppercase tracking-[0.3em] ${hasFilm ? "text-white/55" : "text-mist"}`}>Membership is by application</p>
          </IntroReveal>
        </div>

        {/* scroll cue */}
        <IntroReveal delay={0.9} className="pb-6">
          <div className="mx-auto h-10 w-px overflow-hidden bg-gold-500/20">
            <span className="block h-1/2 w-full animate-[marquee-y_2.2s_ease-in-out_infinite] bg-gradient-to-b from-transparent via-gold-500 to-transparent" />
          </div>
        </IntroReveal>

        {/* Country ticker — "193 countries" made tangible, drifting at the
            foot of the hero. Real member states; two rows, opposite drift. */}
        {hasFilm && (
          <IntroReveal delay={1.0}>
            <div className="border-t border-white/10 py-5">
              <CountryMarquee />
            </div>
          </IntroReveal>
        )}
      </section>
      </FadeOutOnScroll>

      {/* Numbers strip — the hero's instrument panel: dark, tight, directly
          under the ticker so the fold closes on data rather than on white.
          (It used to be a light band of its own; three thin figures floating
          in 640px of white was the single blankest zone on the page.) */}
      <section className="on-dark relative z-10 border-t border-white/10 bg-[#171B2C]">
        <div className="mx-auto max-w-6xl px-6 py-9 sm:py-10">
          <Stagger className="grid gap-y-8 sm:grid-cols-3">
            {[
              { n: 193, prefix: "", suffix: "", label: "Countries in the consortium" },
              { n: 2600, prefix: "£", suffix: "", label: "Credit unlocks the Major Event" },
              { n: 5, prefix: "", suffix: " hrs", label: "Monthly enterprise mentoring" },
            ].map((s, i) => (
              <StaggerItem key={s.label}>
                <div className={`flex items-center gap-5 pl-0 pr-4 sm:pl-6 ${i > 0 ? "sm:border-l sm:border-white/10" : ""}`}>
                  <p className="font-display text-[48px] font-thin leading-none text-white">
                    {s.prefix}<AnimatedNumber value={s.n} />{s.suffix}
                  </p>
                  <p className="max-w-[9rem] font-mono text-[10px] uppercase leading-4 tracking-[0.18em] text-white/55">{s.label}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Tiers — the first capped band, rising out of the dark strip. The
          flagship first as one composed object (the reference's product-card
          moment), then the other three as a compact grid under it. */}
      <section id="tiers" className="cap-section cap-first relative z-10 scroll-mt-24 bg-ink-800/55 py-band-sm sm:py-band"><div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <SectionTitle
            align="center"
            kicker="Memberships"
            title={<>Four ways in. <span className="title-accent">One standard of access.</span></>}
            sub="Compare the tiers side by side — fees, benefits and access, stated plainly."
          />
        </Reveal>

        {flagship && (
          <div className="mt-12 lg:mt-16">
            <FlagshipCard
              name={flagship.name}
              strapline={flagship.strapline}
              price={gbp(flagship.priceMinor)}
              billing={flagship.billing === "ANNUAL" ? "/ year" : "one-time"}
              code={flagship.code}
              filmSrc={hasFilm ? "/videos/summit-teaser.mp4" : null}
              entitlements={flagship.entitlements.map((e) => ({
                id: e.id,
                label: entitlementLabel(e.key, e.params as Record<string, unknown> | null, { short: true }),
              }))}
            />
          </div>
        )}

        <Stagger className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {rest.map((p, i) => (
            <StaggerItem key={p.id} className="h-full">
              <LiftCard className="h-full">
                <Spotlight className="card-lux h-full rounded-2xl">
                  <GlassCard className="is-light gradient-border-inset flex h-full flex-col p-6">
                    <div className="flex items-center justify-between">
                      <span className="rounded-2xl bg-gold-500/10 p-3 text-gold-500 ring-1 ring-gold-500/15">{TIER_ICONS[p.code]}</span>
                      {p.code === "TEMPORARY" && <Badge tone="purple">Event-linked</Badge>}
                    </div>
                    <h3 className="mt-4 min-h-[3.125rem] text-lg font-semibold leading-snug text-ivory-100 xl:min-h-14 xl:text-xl">{p.name}</h3>
                    {/* Reserve 3 lines once the grid is multi-column: at 4-up the cards are
                        ~260px wide and the Investor Ready strapline wraps to 3 lines while
                        the others take 2, which pushed its price 23px below the row. */}
                    <p className="mt-1 min-h-10 text-sm leading-6 text-mist sm:min-h-[4.5rem]">{p.strapline}</p>
                    <p className="mt-4 font-display text-[44px] font-normal leading-none text-ivory-50">
                      {gbp(p.priceMinor)}
                      <span className="ml-1 text-sm text-mist">{p.billing === "ANNUAL" ? "/year" : "one-time"}</span>
                    </p>
                    <ul className="mt-5 flex-1 space-y-2.5 text-sm text-ivory-200">
                      {/* One source of truth: the same DB entitlements the
                          /join/[code] page renders, in short form. */}
                      {p.entitlements.map((e) => (
                        <li key={e.id} className="flex gap-2.5">
                          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
                          {entitlementLabel(e.key, e.params as Record<string, unknown> | null, { short: true })}
                        </li>
                      ))}
                    </ul>
                    <LinkButton href={`/join/${p.code}`} variant="ghost" className="shine mt-6 w-full">
                      {p.code === "TEMPORARY" ? "Apply for a Summit slot" : "Join now"}
                    </LinkButton>
                  </GlassCard>
                </Spotlight>
              </LiftCard>
            </StaggerItem>
          ))}
        </Stagger>
      </div></section>

      {/* Story band — the reference's dark two-column chapter (statement +
          stat plates left, scale-up media right) on an 80px cap with matte
          grain, in navy. This is LSI's quality band grown up: same colour,
          same hairline condensed, but it now has material, depth and one
          real image instead of a flat fill with centred type. */}
      <section className="cap-section band-navy on-dark matte-noise relative z-10">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-band-sm sm:py-band lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div>
            <Reveal><span className="kicker">The consortium</span></Reveal>
            <TextReveal
              as="h2"
              text="Where British enterprise meets the world."
              className="mt-5 font-display text-[36px] font-thin leading-[1.06] text-white sm:text-[48px] lg:text-[56px]"
            />
            <Reveal delay={0.3}>
              <p className="mt-6 max-w-lg text-[16px] leading-[1.75] text-white/72 sm:text-[17px]">
                One consortium, 193 countries — a single standard of access, applied consistently
                and recognised by the members, investors and institutions that rely on it. Events
                are convened at the House of Lords; the Summit is where the room is assembled.
              </p>
            </Reveal>
            {/* Stat plates — the reference's "15+ Fermes / 90+ Score SCA" pair,
                with our real numbers. Mono caption under a thin condensed
                figure: instrument-plate register. */}
            <Stagger className="mt-10 grid grid-cols-2 gap-6 sm:max-w-md">
              {[
                { n: 193, suffix: "", label: "Countries represented" },
                { n: 45, suffix: "", label: "Summit slots · three stages" },
              ].map((s) => (
                <StaggerItem key={s.label}>
                  <div className="border-l border-white/15 pl-5">
                    <p className="font-display text-[48px] font-thin leading-none text-white sm:text-[56px]">
                      <AnimatedNumber value={s.n} />{s.suffix}
                    </p>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">{s.label}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>

          {/* The globe — the consortium's signature visual. 193 countries as a
              dotted sphere in slow rotation, London the fixed bright point,
              arcs drawing out to real cities. Purpose-built, not a stock frame. */}
          <Reveal delay={0.15}>
            <div className="relative mx-auto aspect-square w-full max-w-[560px]">
              <Globe className="absolute inset-0 h-full w-full" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between px-2">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">Hub</p>
                  <p className="mt-0.5 font-display text-2xl font-thin text-white">London</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">Reach</p>
                  <p className="mt-0.5 font-display text-2xl font-thin text-white">193 countries</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section className="cap-section relative z-10 bg-white py-band-sm sm:py-band">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <SectionTitle align="center" kicker="Enrolment" title={<>Signed, paid, <span className="title-accent">activated.</span></>}
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
                {/* h-full so the four bordered cards match height — the grid item
                    stretches but the card inside it did not, leaving bottom edges
                    up to ~48px apart once the copy lengths differ. */}
                <div className="is-light gradient-border-inset relative h-full rounded-2xl bg-white p-6">
                  <span className="font-mono text-[11px] tracking-[0.2em] text-gold-500">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-3 text-lg font-semibold text-ivory-100">{s.t}</h3>
                  <p className="mt-2 text-sm leading-[1.7] text-mist">{s.d}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Summit experience — cinematic section */}
      <section id="summit" className="cap-section on-dark matte-noise relative z-10 bg-navy-deep">
        {/* Cinematic ground: the film again, blurred and dimmed, so the Summit
            band reads as the room itself rather than a form about it. */}
        {hasFilm && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <video className="absolute inset-0 h-full w-full scale-110 object-cover opacity-[0.22] [filter:blur(18px)_saturate(0.6)]" src="/videos/summit-teaser.mp4#t=6" poster="/videos/summit-poster-2.jpg" preload="metadata" muted playsInline tabIndex={-1} />
            <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_70%_20%,rgba(214,57,47,0.16),transparent_60%),linear-gradient(180deg,rgba(35,42,66,0.4),rgba(35,42,66,0.85))]" />
          </div>
        )}
        <div className="relative mx-auto max-w-6xl px-6 py-band-sm sm:py-band">
          <Reveal>
            <SectionTitle
              align="center"
              kicker="The UK Investors Summit"
              title={<>Forty-five slots. <span className="title-accent">Three stages.</span> One room that matters.</>}
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

          {/* Three cards, so go 3-up at md — at 768 a 2-column grid left the
              Business Award card alone on row 2 beside an equal-width void,
              reading as a card that failed to load. */}
          <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 md:grid-cols-3">
            {[
              { t: SLOT_KIND_LABEL.PRESENTATION, d: "Pitch one opportunity to the assembled investor panel — deal-flow interest is captured live on the platform.", n: "01" },
              { t: SLOT_KIND_LABEL.BRAND_LAUNCH, d: "Unveil your brand on the Summit stage, with the consortium's featured-video benefit amplifying it afterwards.", n: "02" },
              { t: SLOT_KIND_LABEL.AWARD, d: "Receive recognition before the consortium's international membership — nominated and confirmed through the platform.", n: "03" },
            ].map((c) => (
              <StaggerItem key={c.t} className="h-full">
                <TiltCard className="h-full">
                  <GlassCard strong className="gradient-border-inset flex h-full flex-col p-7">
                    <span className="font-mono text-[11px] tracking-[0.2em] text-gold-500">{c.n}</span>
                    <h3 className="mt-3 text-xl font-semibold text-ivory-100">{c.t}</h3>
                    <p className="mt-2 flex-1 text-sm leading-[1.7] text-mist">{c.d}</p>
                    <Badge tone="gold" className="mt-5 w-fit">15 slots</Badge>
                  </GlassCard>
                </TiltCard>
              </StaggerItem>
            ))}
          </Stagger>

          <Reveal delay={0.15}>
            <div className="mt-12 flex flex-col items-center gap-4 text-center">
              <LinkButton href="/join/TEMPORARY" size="lg">Apply for a Summit slot <ArrowRight className="h-4 w-4" /></LinkButton>
              <p className="max-w-xl text-sm text-mist">Applications close automatically at the deadline — waitlist promotion is instant on any cancellation.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Enterprise benefits — bento grid: one hero tile, stat tiles, a
          full-width closing strip. Asymmetric on desktop, stacked on mobile. */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-band-sm sm:py-band">
        <Reveal>
          <SectionTitle align="center" kicker="Enterprise tiers" title={<>Benefits that <span className="title-accent">compound.</span></>}
            sub="Every enterprise membership stacks brand, publishing, mentoring and investor access — provisioned automatically the moment your membership activates." />
        </Reveal>
        <Stagger className="mt-12 grid auto-rows-[minmax(150px,auto)] gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Hero tile — the flagship benefit */}
          <StaggerItem className="sm:col-span-2 lg:row-span-2">
            <Spotlight className="card-lux h-full rounded-2xl">
              <GlassCard strong className="is-light gradient-border-inset flex h-full flex-col p-8">
                <span className="inline-flex w-fit rounded-xl bg-gold-500/12 p-3 text-gold-400"><Video className="h-6 w-6" /></span>
                <span className="mt-auto font-mono text-[11px] tracking-[0.2em] text-gold-500">01</span>
                <h3 className="mt-2 text-2xl font-semibold leading-snug text-ivory-100">Featured branding video</h3>
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
              <GlassCard className="is-light gradient-border-inset flex h-full flex-col justify-between gap-4 p-8">
                <span className="inline-flex w-fit rounded-xl bg-gold-500/12 p-2.5 text-gold-400"><Newspaper className="h-5 w-5" /></span>
                <div>
                  <h3 className="text-xl font-semibold text-ivory-100">1,400-word website article</h3>
                  <p className="mt-2 text-sm leading-6 text-mist">Plus two HD images — editorially reviewed before publication.</p>
                </div>
              </GlassCard>
            </Spotlight>
          </StaggerItem>

          {/* Guidance tiles — the two benefits no other section covers */}
          <StaggerItem>
            <Spotlight className="card-lux h-full rounded-2xl">
              <GlassCard className="is-light gradient-border-inset flex h-full flex-col justify-between gap-3 p-6">
                <span className="inline-flex w-fit rounded-lg bg-gold-500/12 p-2 text-gold-400"><TrendingUp className="h-4 w-4" /></span>
                <div>
                  <h3 className="text-lg font-semibold text-ivory-100">EIS-readiness</h3>
                  <p className="mt-1 text-xs leading-5 text-mist">Investment-portfolio guidance for British-based companies.</p>
                </div>
              </GlassCard>
            </Spotlight>
          </StaggerItem>
          <StaggerItem>
            <Spotlight className="card-lux h-full rounded-2xl">
              <GlassCard className="is-light gradient-border-inset flex h-full flex-col justify-between gap-3 p-6">
                <span className="inline-flex w-fit rounded-lg bg-gold-500/12 p-2 text-gold-400"><Users className="h-4 w-4" /></span>
                <div>
                  <h3 className="text-lg font-semibold text-ivory-100">Investor deal-flow</h3>
                  <p className="mt-1 text-xs leading-5 text-mist">Your pitch before the investor panel — visible only with your consent.</p>
                </div>
              </GlassCard>
            </Spotlight>
          </StaggerItem>
        </Stagger>
      </section>

      {/* Trusted-by strip — LSI runs an off-white credibility band here. Every
          claim below is one already evidenced elsewhere on the site; no
          borrowed logos, no invented partners. */}
      <section className="cap-section relative z-10 bg-ink-800/90 py-band-sm backdrop-blur-[2px] sm:py-band">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <Reveal>
            <h2 className="font-display text-[32px] font-thin leading-tight text-ivory-100 md:text-[40px]">
              Trusted by <span className="title-accent">193 countries</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[19px] leading-[1.7] text-mist">
              A collaborative business partner platform — enterprises standing together for international growth.
            </p>
          </Reveal>
          <Stagger className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              { t: "House of Lords", d: "Events convened at UK Parliament" },
              { t: "Companies House 14499310", d: "UK-registered, publicly verifiable" },
              { t: "Summits since 2023", d: "The UK Investors Summit, run annually" },
            ].map((c) => (
              <StaggerItem key={c.t}>
                <div className="px-2">
                  <p className="text-base font-semibold text-ivory-100">{c.t}</p>
                  <p className="mt-1.5 text-sm leading-[1.7] text-mist">{c.d}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>

          {/* Statement plate — the reference's testimonial slot (cream/80,
              blur, quote-mark, attribution). We have no member testimonial on
              record and will not write one; the same slot carries the
              consortium's own statement of purpose, attributed to itself. */}
          <Reveal delay={0.1}>
            <figure className="is-light gradient-border-inset relative mx-auto mt-14 max-w-3xl rounded-[28px] bg-white/80 px-8 py-10 text-left backdrop-blur-sm sm:px-12 sm:py-12">
              <span aria-hidden className="pointer-events-none absolute -top-5 left-8 font-display text-[112px] font-thin leading-none text-gold-500/25 sm:left-10">“</span>
              <blockquote className="relative font-display text-[24px] font-thin leading-[1.35] text-ivory-50 sm:text-[30px]">
                A single standard of access, applied consistently — so that an enterprise from any
                of 193 countries stands in the same room, on the same terms, as one from London.
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <Crest size={28} className="opacity-90" />
                <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-mist">193 Countries Consortium · Founding principle</span>
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* Closing CTA — LSI's full-bleed amber contact band.
          NOTE: LSI sets white type on #FFAE29, which measures ~1.9:1 and fails
          WCAG AA outright. The band is reproduced with navy type instead: same
          colour, same weight in the page, ~8.6:1 and actually readable. */}
      <section className="cap-section band-amber matte-noise relative z-10 py-band-sm sm:py-band">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <Reveal>
            <h2 className="font-display text-[32px] font-thin leading-tight text-navy-deep md:text-[40px]">
              Your seat at the table is one signature away.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[19px] leading-[1.7] text-navy-deep/80">
              If you would like to join the consortium and put your enterprise in front of the room, start today.
            </p>
            <div className="mt-9 flex justify-center">
              <Magnetic><LinkButton href="/join" size="lg" variant="dark" className="shine">Become a member</LinkButton></Magnetic>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="relative z-10">

        {/* Footer as a destination — not an afterthought. LSI closes on a dark
            slab, which also gives the amber band above it something to land
            against instead of bleeding into white. */}
        <footer className="cap-section on-dark matte-noise relative overflow-hidden bg-navy-deep">
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
                      <Link href={l.href} className="group inline-flex min-h-11 items-center gap-2 text-ivory-200 transition-colors hover:text-gold-300">
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
                  <li className="text-ivory-200">Level 30, The Leadenhall Building</li>
                  <li className="text-ivory-200">122 Leadenhall Street, London</li>
                  <li className="text-mist">Companies House 14499310</li>
                  <li>
                    <Link href="/privacy" className="group inline-flex min-h-11 items-center gap-2 text-ivory-200 transition-colors hover:text-gold-300">
                      <span className="inline-block h-px w-0 bg-gold-400 transition-all duration-300 group-hover:w-4" />
                      Privacy Policy
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t hairline pt-8 text-xs text-mist">
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

