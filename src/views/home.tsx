import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { db } from "@/server/db";
import { gbp, ukDate } from "@/lib/utils";
import { entitlementLabel, SLOT_KIND_LABEL } from "@/lib/labels";
import { appUrl } from "@/lib/app-url";
import { SiteHeader } from "@/components/site-header";
import { PreloaderGate, IntroReveal, FadeOutOnScroll } from "@/components/premium";
import { Logo } from "@/components/logo";
import { Countdown, EventFilm } from "@/components/showcase";
import {
  MagazineMotion,
  Reveal,
  MaskedLines,
  ImageReveal,
  ParallaxImage,
  Counter,
  ReadingRule,
  ChamberLight,
  IrisReveal,
  ScrollWords,
  VelocityMarquee,
  Scramble,
  PixelSwap,
  WordStack,
  FloatingGallery,
  type GalleryItem,
} from "@/components/magazine/motion";
import { SlotFigure, type SlotColumn } from "@/components/magazine/slot-figure";
import { CountryBand } from "@/components/magazine/country-band";
import { CountryGlobe } from "@/components/magazine/country-globe";
import { ChapterRail } from "@/components/magazine/chapter-rail";

const LAUNCHED_BRANDS = [
  "Sportto",
  "Columbus International",
  "Tisser Technologies",
  "Sicher Mayor Tech",
  "Matha Medi Care Nursing UK",
  "DN Global Tec",
] as const;

const ROMAN = ["i", "ii", "iii", "iv", "v", "vi"] as const;

const LAUNCH_GALLERY: GalleryItem[] = [
  { src: "/images/193cc-launch-sportto-unveil.jpg", alt: "The Sportto brand being unveiled at the House of Lords", title: "The unveiling", line: "Sportto's mark, uncovered before investors, peers and press.", left: 0, top: 2, width: 34, depth: 0.6 },
  { src: "/images/193cc-launch-columbus-reveal.jpg", alt: "Columbus International's mark presented at the House of Lords", title: "Columbus International", line: "A jobs and education consultancy, launched in the House of Lords.", left: 41, top: 12, width: 25, depth: 1.2 },
  { src: "/images/193cc-launch-westminster-hall-group.jpg", alt: "Members and guests on the steps of Westminster Hall", title: "Westminster Hall", line: "The full delegation on the steps · 21 July 2023.", left: 72, top: 0, width: 28, depth: 0.4 },
  { src: "/images/193cc-launch-sicher-mayor-reveal.jpg", alt: "Sicher Mayor Tech's mark presented at the House of Lords", title: "Sicher Mayor Tech", line: "Its mark held up to the room — “The scoring mode.”", left: 6, top: 50, width: 24, depth: 1.0 },
  { src: "/images/summit-2023-brand-launch.jpg", alt: "Crystal London presented on stage at the UK Investors Summit", title: "Crystal London", line: "Presented at the UK Investors Summit 2023.", left: 38, top: 56, width: 30, depth: 0.5 },
  { src: "/images/summit-2023-award.jpg", alt: "An award presented at the UK Investors Summit", title: "The awards", line: "Recognition before the consortium's international membership.", left: 75, top: 46, width: 22, depth: 1.4 },
];

/**
 * Home — the editorial edition (ADR-0030).
 *
 * Reads like a magazine issue: a cover, a figures strip, four numbered
 * chapters, a colophon. Every number is either a fact already published by
 * 193 CC or read live from the database; photography is the client's own
 * Summit film or licensed images of places (public/images/CREDITS.md).
 */
export async function HomeView() {
  const now = new Date();
  const [products, summit] = await Promise.all([
    db.product.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, include: { entitlements: true } }),
    db.event.findFirst({
      where: { kind: "SUMMIT", startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      include: {
        summit: {
          include: { categories: { include: { applications: { where: { status: "CONFIRMED" }, select: { id: true } } } } },
        },
      },
    }),
  ]);

  // Live allocation for a scheduled Summit; otherwise the format, unfilled.
  const kinds = ["PRESENTATION", "BRAND_LAUNCH", "AWARD"] as const;
  const slotColumns: SlotColumn[] = kinds.map((kind) => {
    const cat = summit?.summit?.categories.find((c) => c.kind === kind);
    return { label: SLOT_KIND_LABEL[kind], capacity: cat?.capacity ?? 15, confirmed: cat ? cat.applications.length : null };
  });

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

  const display = "font-headline text-[clamp(2.5rem,5vw,4.5rem)] leading-[1.02] tracking-[-0.015em]";

  return (
    <MagazineMotion>
      <main className="relative isolate overflow-x-clip font-body text-copy">
        <ChapterRail
          chapters={[
            { id: "consortium", n: "01", title: "The Consortium" },
            { id: "summit", n: "02", title: "The Summit" },
            { id: "launched", n: "03", title: "Launched at Parliament" },
            { id: "circle", n: "04", title: "The circle" },
            { id: "tiers", n: "05", title: "Membership" },
            { id: "reach", n: "06", title: "Reach" },
          ]}
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
        <PreloaderGate />
        <SiteHeader />
        <ReadingRule />

        {/* ─── COVER ─────────────────────────────────────────────── */}
        <section className="on-dark relative -mt-18 flex min-h-svh flex-col justify-end overflow-hidden bg-night text-night-copy">
          <ParallaxImage
            src="/images/westminster-dusk.jpg"
            alt="The Palace of Westminster at dusk, a red London bus streaking past"
            sizes="100vw"
            priority
            className="absolute inset-0"
            strength={8}
            zoom={0.25}
          />
          <div className="absolute inset-0 bg-linear-to-t from-night via-night/55 to-night/20" />
          <FadeOutOnScroll className="relative mx-auto w-full max-w-7xl px-6 pb-14 pt-40 sm:pb-20">
            <IntroReveal>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-night-copy/70">
                The 193 Countries Consortium · London · Est. 2022
              </p>
            </IntroReveal>
            <MaskedLines
              as="h1"
              afterIntro
              delay={0.15}
              className="mt-6 max-w-5xl font-headline text-[clamp(3rem,8.4vw,8.25rem)] leading-[0.95] tracking-[-0.02em]"
              lines={[
                "Membership that opens",
                <span key="cover-2">the most <em className="text-gilt">exclusive</em> doors</span>,
                "in British enterprise.",
              ]}
            />
            <IntroReveal
              delay={0.55}
              className="mt-10 flex flex-col gap-8 border-t border-night-copy/20 pt-8 md:flex-row md:items-end md:justify-between"
            >
              <p className="max-w-xl text-lg leading-relaxed text-night-copy/80">
                Events at the House of Lords, the UK Investors Summit, enterprise mentoring and investor access — for
                enterprises from 193 countries.
              </p>
              <div className="flex flex-wrap items-center gap-6">
                <Link
                  href="/join"
                  className="group inline-flex items-center gap-3 bg-night-copy px-7 py-4 text-sm font-medium text-night transition-colors duration-[var(--duration-quick)] hover:bg-accent-on-night"
                >
                  Become a member{" "}
                  <ArrowUpRight className="h-4 w-4 transition-transform duration-[var(--duration-quick)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/summit"
                  className="inline-flex items-center gap-2 border-b border-night-copy/40 pb-1 text-sm text-night-copy/85 transition-colors duration-[var(--duration-quick)] hover:border-night-copy hover:text-night-copy"
                >
                  The UK Investors Summit
                </Link>
              </div>
            </IntroReveal>
            <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.2em] text-night-copy/45">
              Cover — Palace of Westminster, dusk
            </p>
          </FadeOutOnScroll>
        </section>

        {/* ─── FIGURES ───────────────────────────────────────────── */}
        <section aria-label="The consortium in figures" className="on-dark relative isolate overflow-hidden bg-chamber text-night-copy">
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(70%_120%_at_15%_0%,var(--raw-color-chamber-500)_0%,transparent_60%)]" />
          <p aria-hidden="true" className="text-outline-lords pointer-events-none absolute -right-6 top-1/2 -z-10 -translate-y-1/2 font-headline text-[22rem] leading-none opacity-40">
            193
          </p>
          <dl className="mx-auto grid max-w-7xl grid-cols-2 px-6 lg:grid-cols-4">
            {[
              { n: 193, label: "Countries in the consortium" },
              { n: 45, label: "Summit slots across three stages" },
              { n: 2600, prefix: "£", label: "Credit that unlocks the Major Event" },
              { n: 5, suffix: " hrs", label: "Monthly enterprise mentoring" },
            ].map((f, i) => (
              <div
                key={f.label}
                className={`flex flex-col-reverse py-12 ${i % 2 === 1 ? "pl-6" : ""} ${i > 0 ? "lg:border-l lg:border-night-copy/20 lg:pl-8" : ""} ${i < 2 ? "border-b border-night-copy/20 lg:border-b-0" : ""}`}
              >
                <dt className="mt-3 max-w-56 text-sm text-night-copy/85">{f.label}</dt>
                <dd className="font-headline text-[clamp(3rem,6vw,5.5rem)] leading-none text-night-copy">
                  <Counter value={f.n} prefix={f.prefix} suffix={f.suffix} />
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ─── № 01 THE CONSORTIUM ───────────────────────────────── */}
        <section id="consortium" className="relative isolate mx-auto grid max-w-7xl scroll-mt-24 gap-14 px-6 py-24 sm:py-32 lg:grid-cols-12">
          <ChamberLight at="right" />
          <div className="lg:col-span-6">
            <Reveal>
              <Chapter n="01" title="The Consortium" />
            </Reveal>
            <MaskedLines
              className={`mt-8 ${display}`}
              lines={["Where British", "enterprise meets", <em key="w" className="text-gilt">the world.</em>]}
            />
            <Reveal delay={0.2}>
              <p className="mt-10 max-w-xl text-lg leading-[1.75] text-copy-soft first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:font-headline first-letter:text-7xl first-letter:leading-[0.8] first-letter:text-accent">
                One consortium, 193 countries — a single standard of access, applied consistently and recognised by the
                members, investors and institutions that rely on it. Events are convened at the House of Lords; the Summit
                is where the room is assembled.
              </p>
            </Reveal>
            <Reveal delay={0.3}>
              <blockquote className="mt-12 border-l-2 border-accent pl-6">
                <ScrollWords
                  className="font-headline text-2xl italic leading-snug text-copy sm:text-3xl"
                  text="“A single standard of access — so that an enterprise from any of 193 countries stands in the same room, on the same terms, as one from London.”"
                />
                <footer className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-copy-muted">
                  Founding principle
                </footer>
              </blockquote>
            </Reveal>
          </div>
          <figure className="lg:col-span-5 lg:col-start-8">
            <ImageReveal
              src="/images/leadenhall-building-warm.jpg"
              alt="The Leadenhall Building, seen from street level"
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="aspect-[16/10] w-full lg:aspect-[3/4]"
            />
            <figcaption className="mt-4 flex justify-between gap-4 border-t border-hairline pt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-copy-muted">
              <span>Level 30, The Leadenhall Building</span>
              <span>122 Leadenhall St · EC3V</span>
            </figcaption>
          </figure>
        </section>

        <div className="py-6">
          <VelocityMarquee text="House of Lords · UK Investors Summit · " />
        </div>

        {/* ─── № 02 THE SUMMIT ───────────────────────────────────── */}
        <IrisReveal>
        <section id="summit" className="on-dark scroll-mt-24 bg-night/85 text-night-copy">
          <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
            <div className="grid gap-12 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <Reveal>
                  <Chapter n="02" title="The UK Investors Summit" onNight />
                </Reveal>
                <MaskedLines
                  className={`mt-8 ${display}`}
                  lines={[
                    "Forty-five slots.",
                    "Three stages.",
                    <em key="r" className="text-gilt">One room that matters.</em>,
                  ]}
                />
                <Reveal delay={0.2}>
                  <p className="mt-8 max-w-md text-lg leading-[1.75] text-night-copy/75">
                    Business-opportunity pitches in front of the investor panel, live brand launches and the business
                    awards — followed by investor networking. Fifteen slots per stage, allocated through the intent-letter
                    process with an automated waitlist.
                  </p>
                </Reveal>
              </div>
              <div className="grid grid-cols-6 gap-3 lg:col-span-7">
                <figure className="col-span-6">
                  <PixelSwap
                    sizes="(min-width: 1024px) 55vw, 100vw"
                    className="aspect-video w-full"
                    images={[
                      { src: "/images/summit-2023-address.jpg", alt: "A speaker addresses the UK Investors Summit beneath the UK Parliament, House of Lords banner" },
                      { src: "/images/summit-2023-brand-launch.jpg", alt: "Crystal London presented on stage at the UK Investors Summit" },
                      { src: "/images/summit-2023-award.jpg", alt: "An award presented at the UK Investors Summit" },
                      { src: "/images/summit-2023-handshake.jpg", alt: "Delegates shake hands at a Summit table" },
                    ]}
                  />
                </figure>
                <figure className="col-span-3">
                  <ImageReveal
                    src="/images/summit-2023-networking.jpg"
                    alt="Delegates in conversation at the Summit"
                    sizes="(min-width: 1024px) 27vw, 50vw"
                    className="aspect-[4/3] w-full"
                  />
                </figure>
                <figure className="col-span-3">
                  <ImageReveal
                    src="/images/summit-2023-tables.jpg"
                    alt="Delegates at a Summit table discussion"
                    sizes="(min-width: 1024px) 27vw, 50vw"
                    className="aspect-[4/3] w-full"
                  />
                </figure>
                <p className="col-span-6 font-mono text-[10px] uppercase tracking-[0.18em] text-night-copy/50">
                  UK Investors Summit · House of Lords, UK Parliament · 24 March 2023
                </p>
              </div>
            </div>

            <WordStack words={["Pitch.", "Launch.", "Recognise."]} className="mt-24" />

            <div className="mt-24 grid gap-12 border-t border-night-copy/15 pt-14 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-night-copy/55">Fig. 1</p>
                <h3 className="mt-3 font-headline text-3xl">How the room is allocated</h3>
                {summit ? (
                  <div className="mt-8">
                    <Countdown target={summit.startsAt.toISOString()} label={`${summit.name} · ${summit.venue}`} />
                  </div>
                ) : (
                  <p className="mt-4 max-w-sm leading-relaxed text-night-copy/70">
                    The next Summit&rsquo;s date is announced to members first. Applications open with an intent letter;
                    the waitlist promotes automatically on any cancellation.
                  </p>
                )}
              </div>
              <div className="lg:col-span-7 lg:col-start-6">
                <SlotFigure
                  columns={slotColumns}
                  caption={
                    summit
                      ? `Live allocation · ${summit.name} · ${ukDate(summit.startsAt)}`
                      : "Format · 15 slots per stage · allocation opens with the next Summit"
                  }
                />
              </div>
            </div>
          </div>
        </section>

        </IrisReveal>

        {/* ─── № 03 LAUNCHED AT PARLIAMENT ───────────────────────── */}
        {/* 193 CC's own film and photographs (public/images/CREDITS.md). */}
        <section id="launched" className="relative isolate scroll-mt-24 pt-24 sm:pt-32">
          <ChamberLight at="left" />
          <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Reveal>
                <Chapter n="03" title="Launched at Parliament" />
              </Reveal>
              <MaskedLines
                className={`mt-8 ${display}`}
                lines={["Six brands,", "launched in", <em key="l" className="text-gilt">the House of Lords.</em>]}
              />
              <Reveal delay={0.2}>
                <p className="mt-8 max-w-md text-lg leading-[1.75] text-copy-soft">
                  Members launch in front of investors, peers and press. On 21 July 2023 these six member brands were
                  unveiled at the House of Lords through 193 CC — the drape coming off on the right is Sportto&rsquo;s.
                </p>
              </Reveal>
              <Reveal delay={0.3}>
                <ol className="mt-10 border-t border-hairline">
                  {LAUNCHED_BRANDS.map((name, i) => (
                    <li key={name} className="flex items-baseline gap-5 border-b border-hairline py-3">
                      <span className="w-8 font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                        {ROMAN[i]}
                      </span>
                      <span className="font-headline text-xl">{name}</span>
                    </li>
                  ))}
                </ol>
              </Reveal>
            </div>
            <figure className="lg:col-span-7">
              <Reveal>
                <div className="relative aspect-video w-full overflow-hidden bg-night">
                  <EventFilm
                    src="/videos/193cc-brand-launch-sportto.mp4"
                    poster="/videos/193cc-brand-launch-sportto-poster.jpg"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
              </Reveal>
              <figcaption className="mt-4 border-t border-hairline pt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-copy-muted">
                Film: 193 Countries Consortium · Sportto brand launch · House of Lords · 21 July 2023
              </figcaption>
            </figure>
          </div>
          <div className="mt-20 sm:mt-28">
            <FloatingGallery items={LAUNCH_GALLERY} />
          </div>
          <div className="mx-auto mt-20 grid max-w-7xl items-center gap-10 px-6 sm:mt-28 lg:grid-cols-12">
            <figure className="lg:col-span-4">
              <Reveal>
                <div className="relative mx-auto aspect-[9/16] w-full max-w-sm overflow-hidden bg-night">
                  <EventFilm
                    src="/videos/193cc-gss-awards-2025.mp4"
                    poster="/videos/193cc-gss-awards-2025-poster.jpg"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
              </Reveal>
              <figcaption className="mx-auto mt-4 max-w-sm border-t border-hairline pt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-copy-muted">
                Film: 193 Countries Consortium · GSS Safety Awards &amp; Conference · House of Lords · October 2025
              </figcaption>
            </figure>
            <div className="lg:col-span-6 lg:col-start-6">
              <MaskedLines
                as="p"
                className={display}
                lines={["And back again,", <em key="o" className="text-gilt">October 2025.</em>]}
              />
              <Reveal delay={0.2}>
                <p className="mt-8 max-w-md text-lg leading-[1.75] text-copy-soft">
                  As a partner of the GSS Safety Awards &amp; Conference, 193 CC launched several new companies and
                  brands at the House of Lords, and briefed founders on the Global Talent and
                  Innovator Founder visas.
                </p>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ─── № 04 THE CIRCLE — LSI at the House of Lords ──────── */}
        {/* London School of Investors footage, used at 193 CC's request. LSI's
            watermark stays in frame and every caption names it as LSI's event
            (public/images/CREDITS.md). */}
        <section id="circle" className="relative isolate mx-auto max-w-7xl scroll-mt-24 px-6 py-24 sm:py-32">
          <ChamberLight at="right" />
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Reveal>
                <Chapter n="04" title="The circle" />
              </Reveal>
              <MaskedLines
                className={`mt-8 ${display}`}
                lines={["Also at the", "House of Lords.", <em key="d" className="text-gilt">23 July 2026.</em>]}
              />
              <Reveal delay={0.2}>
                <p className="mt-8 max-w-md text-lg leading-[1.75] text-copy-soft">
                  The Corporate Governance &amp; Investment Education Leadership Summit, hosted by the London School of
                  Investors at UK Parliament — an evening of governance, investment education and leadership in the
                  Palace of Westminster.
                </p>
              </Reveal>
            </div>
            <figure className="lg:col-span-7">
              <Reveal>
                <div className="relative aspect-video w-full overflow-hidden bg-night">
                  <EventFilm
                    src="/videos/lsi-summit-2026-reel.mp4"
                    poster="/videos/lsi-summit-2026-reel-poster.jpg"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
              </Reveal>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <ImageReveal src="/images/lsi-summit-2026-westminster.jpg" alt="The Palace of Westminster beneath an evening sky" sizes="(min-width: 1024px) 19vw, 33vw" className="aspect-[4/3] w-full" />
                <ImageReveal src="/images/lsi-summit-2026-networking.jpg" alt="Guests in conversation at the Leadership Summit" sizes="(min-width: 1024px) 19vw, 33vw" className="aspect-[4/3] w-full" />
                <ImageReveal src="/images/lsi-summit-2026-westminster-hall.jpg" alt="Guests descending the steps of Westminster Hall" sizes="(min-width: 1024px) 19vw, 33vw" className="aspect-[4/3] w-full" />
              </div>
              <figcaption className="mt-4 border-t border-hairline pt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-copy-muted">
                Film &amp; stills: London School of Investors · Leadership Summit · House of Lords · 23 July 2026
              </figcaption>
            </figure>
          </div>
        </section>

        {/* ─── № 04 MEMBERSHIP — the index ───────────────────────── */}
        <section id="tiers" className="relative isolate mx-auto max-w-7xl scroll-mt-24 px-6 py-24 sm:py-32">
          <ChamberLight at="left" />
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Reveal>
                <Chapter n="05" title="Membership" />
              </Reveal>
              <MaskedLines
                className={`mt-8 ${display}`}
                lines={["Four ways in.", <em key="s" className="text-gilt">One standard.</em>]}
              />
            </div>
            <Reveal delay={0.15} className="lg:col-span-5 lg:col-start-8 lg:self-end">
              <p className="text-lg leading-[1.75] text-copy-soft">
                Fees, benefits and access, stated plainly. Enrolment is digital end to end — confirm your email, sign, pay,
                and access provisions itself.
              </p>
            </Reveal>
          </div>
          <ol className="mt-16 border-t border-copy">
            {products.map((p, i) => {
              const flagship = p.code === "ENT_INVESTOR";
              return (
                <li key={p.id}>
                  <Reveal delay={i * 0.06}>
                    <div
                      className={`grid gap-6 border-b border-hairline py-10 md:grid-cols-12 md:items-start ${flagship ? "-mx-6 bg-night px-6 text-night-copy md:-mx-8 md:px-8" : ""}`}
                    >
                      <p className={`font-mono text-xs tracking-[0.2em] md:col-span-1 ${flagship ? "text-accent-on-night" : "text-accent"}`}>
                        {["I", "II", "III", "IV", "V", "VI"][i]}
                      </p>
                      <div className="md:col-span-4">
                        <h3 className="font-headline text-3xl leading-tight sm:text-4xl">{p.name}</h3>
                        <p className={`mt-2 ${flagship ? "text-night-copy/70" : "text-copy-muted"}`}>{p.strapline}</p>
                        {flagship && (
                          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-on-night">
                            Flagship · investor ready
                          </p>
                        )}
                      </div>
                      <ul className={`space-y-2 text-sm md:col-span-4 ${flagship ? "text-night-copy/80" : "text-copy-soft"}`}>
                        {p.entitlements.slice(0, 4).map((e) => (
                          <li key={e.id} className="flex gap-3">
                            <span aria-hidden className={flagship ? "text-accent-on-night" : "text-accent"}>
                              —
                            </span>
                            {entitlementLabel(e.key, e.params as Record<string, unknown> | null, { short: true })}
                          </li>
                        ))}
                        {p.entitlements.length > 4 && (
                          <li className={flagship ? "text-night-copy/55" : "text-copy-muted"}>
                            + {p.entitlements.length - 4} more
                          </li>
                        )}
                      </ul>
                      <div className="flex items-end justify-between gap-6 md:col-span-3 md:flex-col md:items-end">
                        <p className="font-headline text-4xl leading-none">
                          {gbp(p.priceMinor)}
                          <span className={`ml-2 font-body text-sm ${flagship ? "text-night-copy/60" : "text-copy-muted"}`}>
                            {p.billing === "ANNUAL" ? "per year" : "one-time"}
                          </span>
                        </p>
                        <Link
                          href={`/join/${p.code}`}
                          className={`group inline-flex items-center gap-2 text-sm font-medium transition-colors duration-[var(--duration-quick)] ${flagship ? "bg-night-copy px-5 py-3 text-night hover:bg-accent-on-night" : "border-b border-copy pb-1 hover:border-accent hover:text-accent"}`}
                        >
                          {p.code === "TEMPORARY" ? "Apply for a slot" : "Join"} <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </Reveal>
                </li>
              );
            })}
          </ol>

          <figure className="mt-20">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-copy-muted">Fig. 2 · Enrolment, end to end</p>
            <ol className="mt-6 grid grid-cols-2 gap-px bg-hairline sm:grid-cols-5">
              {[
                ["Details", "~5 min"],
                ["Email code", "~1 min"],
                ["E-sign", "~5 min"],
                ["Payment", "~5 min"],
                ["Active", "instant"],
              ].map(([step, time], i) => (
                <li key={step} className="bg-paper p-6">
                  <p className="font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</p>
                  <p className="mt-6 font-headline text-2xl">{step}</p>
                  <p className="mt-1 text-sm text-copy-muted">{time}</p>
                </li>
              ))}
            </ol>
            <figcaption className="mt-4 text-sm text-copy-muted">
              No paperwork. About twenty minutes from first click to an active membership.
            </figcaption>
          </figure>
        </section>

        {/* ─── № 05 REACH ────────────────────────────────────────── */}
        <section id="reach" className="on-dark scroll-mt-24 overflow-hidden bg-night/85 text-night-copy">
          <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
            <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <Reveal>
                <Chapter n="06" title="Reach" onNight />
              </Reveal>
              <MaskedLines
                className={`mt-8 ${display}`}
                lines={["One London hub.", <em key="c" className="text-gilt">193 countries.</em>]}
              />
            </div>
              <Reveal delay={0.2} className="lg:col-span-5">
                <p className="max-w-md text-lg leading-[1.75] text-night-copy/75">
                  A collaborative business partner platform — enterprises standing together for international growth,
                  convened from the City of London.
                </p>
              </Reveal>
            </div>
            <div className="mt-16">
              <CountryGlobe />
            </div>
          </div>
          <div className="border-t border-night-copy/10 pb-20 pt-10">
            <p className="mx-auto max-w-7xl px-6 font-mono text-[10px] uppercase tracking-[0.2em] text-night-copy/55">
              Open to enterprises from all 193 UN member states
            </p>
            <CountryBand />
          </div>
        </section>

        <div className="bg-night/60 py-6">
          <VelocityMarquee text="193 Countries · One London Hub · " />
        </div>

        {/* ─── CLOSE ─────────────────────────────────────────────── */}
        <section className="on-dark relative overflow-hidden bg-night text-night-copy">
          <ParallaxImage
            src="/images/city-night.jpg"
            alt="The City of London at night"
            sizes="100vw"
            className="absolute inset-0"
            strength={10}
          />
          <div className="absolute inset-0 bg-night/70" />
          <div className="relative mx-auto max-w-7xl px-6 py-32 text-center sm:py-44">
            <MaskedLines
              as="p"
              className="mx-auto max-w-4xl font-headline text-[clamp(2.75rem,6.5vw,6rem)] leading-none"
              lines={["Your seat at the table", <em key="o" className="text-gilt">is one signature away.</em>]}
            />
            <Reveal delay={0.3}>
              <Link
                href="/join"
                className="mt-12 inline-flex items-center gap-3 bg-night-copy px-8 py-4 text-sm font-medium text-night transition-colors duration-[var(--duration-quick)] hover:bg-accent-on-night"
              >
                Become a member <ArrowUpRight className="h-4 w-4" />
              </Link>
              <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-night-copy/55">
                Membership is by application
              </p>
            </Reveal>
          </div>
        </section>

        {/* ─── COLOPHON ──────────────────────────────────────────── */}
        <footer className="bg-paper-deep">
          <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-12">
            <div className="md:col-span-5">
              <Logo size={40} />
              <p className="mt-6 max-w-sm text-sm leading-relaxed text-copy-muted">
                A collaborative business partner platform — enterprises from 193 countries standing together for
                international growth.
              </p>
            </div>
            <nav aria-label="Footer" className="md:col-span-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-copy-muted">Membership</p>
              <ul className="mt-4 space-y-2 text-sm">
                {[
                  ["/join", "Join"],
                  ["/summit", "The UK Investors Summit"],
                  ["/events/house-of-lords", "House of Lords events"],
                  ["/guides", "Guides"],
                  ["/login", "Member sign in"],
                ].map(([href, label]) => (
                  <li key={href}>
                    <Link href={href} className="transition-colors duration-[var(--duration-quick)] hover:text-accent">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <address className="text-sm not-italic leading-relaxed text-copy-soft md:col-span-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-copy-muted">The Consortium</p>
              <p className="mt-4">
                Level 30, The Leadenhall Building
                <br />
                122 Leadenhall Street, London EC3V 4AB
              </p>
              <p className="mt-3 text-copy-muted">Companies House 14499310</p>
              <Link href="/privacy" className="mt-3 inline-block transition-colors duration-[var(--duration-quick)] hover:text-accent">
                Privacy Policy
              </Link>
            </address>
          </div>
          <div className="border-t border-hairline">
            <p className="mx-auto max-w-7xl px-6 py-6 font-mono text-[10px] uppercase tracking-[0.18em] text-copy-muted">
              © {now.getFullYear()} 193 Countries Consortium Ltd · Photography: UK Investors Summit 2023 film; licensed
              images of London
            </p>
          </div>
        </footer>
      </main>
    </MagazineMotion>
  );
}

function Chapter({ n, title, onNight = false }: { n: string; title: string; onNight?: boolean }) {
  return (
    <p
      className={`flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.22em] ${onNight ? "text-night-copy/70" : "text-copy-muted"}`}
    >
      <span className={onNight ? "text-accent-on-night" : "text-accent"}>№ {n}</span>
      <span aria-hidden className={`h-px w-10 ${onNight ? "bg-night-copy/30" : "bg-copy/30"}`} />
      <Scramble text={title} />
    </p>
  );
}
