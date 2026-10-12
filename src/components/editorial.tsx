import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LinkButton } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { PublicFooter } from "@/components/public-chrome";
import { SiteHeader } from "@/components/site-header";
import { MagazineMotion, ParallaxImage, ReadingRule } from "@/components/magazine/motion";

export type GuideHero = { src: string; alt: string; caption: string };

/**
 * Editorial layer — the shared shell and blocks for guide/hub pages
 * (/summit, /events/house-of-lords, /guides/*). Same system as the homepage
 * (ADR-0030/0031): serif headlines, gold leaf, and — when a page passes
 * `hero` — a full-bleed photograph drifting under the transparent header.
 */

export function GuideShell({
  kicker, title, dek, updated, children, hero, backHref = "/", backLabel = "Back to site",
}: {
  kicker: string;
  hero?: GuideHero;
  title: React.ReactNode;
  dek: string;
  updated?: string;
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <MagazineMotion>
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <ReadingRule />
      {hero && (
        <figure className="on-dark relative -mt-18 h-[62svh] min-h-96 overflow-hidden bg-night">
          <ParallaxImage src={hero.src} alt={hero.alt} sizes="100vw" priority className="absolute inset-0" />
          <div aria-hidden="true" className="absolute inset-0 bg-linear-to-b from-night/70 via-night/10 to-paper" />
          <figcaption className="absolute bottom-6 left-0 right-0 mx-auto max-w-3xl px-6 font-mono text-[10px] uppercase tracking-[0.18em] text-night-copy/70">
            {hero.caption}
          </figcaption>
        </figure>
      )}
      <main className={`mx-auto w-full max-w-3xl flex-1 px-6 ${hero ? "pb-16 pt-6" : "py-16"}`}>
        {/* min-h-11 with -mx-2/px-2 cancelling out, so the hit box reaches the
            44px floor while the icon and text stay on the same pixels. This is
            the only "up" affordance on the editorial pages besides the logo. */}
        <Link href={backHref} className="-mx-2 inline-flex min-h-11 items-center gap-2 px-2 text-sm text-mist hover:text-ivory-100 lg:min-h-0">
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </Link>
        <Reveal>
          <p className="mt-8 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.35em] text-gold-500">
            <span className="h-px w-8 bg-gold-500/40" aria-hidden />
            {kicker}
          </p>
          <h1 className="mt-4 font-headline text-[clamp(2.6rem,6vw,4.25rem)] leading-[1.02] tracking-[-0.01em] text-ivory-50">{title}</h1>
          <p className="mt-5 text-lg leading-8 text-mist">{dek}</p>
          {updated && <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-mist">Updated {updated}</p>}
        </Reveal>
        <div className="mt-12 space-y-14">{children}</div>
      </main>
      <PublicFooter />
    </div>
    </MagazineMotion>
  );
}

export function GuideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Reveal>
      <section>
        <h2 className="font-headline text-3xl leading-tight text-ivory-50 md:text-4xl">{title}</h2>
        <div className="prose-guide mt-5 space-y-4 text-base leading-7 md:text-[15px] md:leading-8 text-ivory-200">{children}</div>
      </section>
    </Reveal>
  );
}

export function Callout({ children, tone = "gold" }: { children: React.ReactNode; tone?: "gold" | "note" }) {
  return (
    <div
      className={
        tone === "gold"
          ? "rounded-xl border border-line bg-gold-500/8 px-5 py-4 text-sm leading-7 text-ivory-200"
          : "rounded-xl border hairline bg-ink-800/40 px-5 py-4 text-sm leading-7 text-mist"
      }
    >
      {children}
    </div>
  );
}

export type Faq = { q: string; a: string };

/** Renders the FAQ visually AND emits FAQPage JSON-LD from the same data —
 *  the markup and the structured data can never drift apart. */
export function FaqBlock({ title = "Frequently asked questions", faqs }: { title?: string; faqs: Faq[] }) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <Reveal>
      <section>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
        <h2 className="font-headline text-3xl leading-tight text-ivory-50 md:text-4xl">{title}</h2>
        <div className="mt-6 space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="group rounded-xl border hairline bg-ink-800/40">
              <summary className="flex min-h-11 cursor-pointer list-none items-start gap-2 px-5 py-4 text-sm font-medium text-ivory-50 marker:content-none">
                <span aria-hidden className="inline-block shrink-0 text-gold-400 transition-transform group-open:rotate-90">›</span>
                {f.q}
              </summary>
              <p className="mx-5 mb-4 border-t hairline pt-3 text-sm leading-7 text-mist">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </Reveal>
  );
}

export function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 rounded-xl border hairline bg-ink-800/40 px-4 py-3 text-sm leading-6 text-ivory-200">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line text-[11px] text-gold-400">✓</span>
      <span>{children}</span>
    </li>
  );
}

/** Standing CTA band for the foot of every guide. */
export function GuideCta({ heading, sub, href = "/join", label = "Become a member" }: {
  heading: string; sub: string; href?: string; label?: string;
}) {
  return (
    <Reveal>
      <div className="card-flagship rounded-2xl">
        <div className="glass-strong rounded-2xl p-8 text-center">
          <h2 className="font-headline text-3xl text-ivory-50 md:text-4xl">{heading}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-mist">{sub}</p>
          <div className="mt-6 flex justify-center">
            <LinkButton href={href} className="shine">{label}</LinkButton>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
