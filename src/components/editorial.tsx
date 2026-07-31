import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LinkButton } from "@/components/ui";
import { Logo } from "@/components/logo";
import { Reveal } from "@/components/motion";
import { PublicFooter } from "@/components/public-chrome";
import { MobileNav } from "@/components/mobile-nav";

/**
 * Editorial layer — the shared shell and blocks for guide/hub pages
 * (/summit, /events/house-of-lords, /guides/*). Same regal system as the
 * rest of the site: Playfair display, hairline rules, rationed gold.
 */

export function GuideShell({
  kicker, title, dek, updated, children, backHref = "/", backLabel = "Back to site",
}: {
  kicker: string;
  title: React.ReactNode;
  dek: string;
  updated?: string;
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex min-h-11 items-center text-sm"><Logo size={40} /></Link>
        <div className="flex items-center gap-5">
          <LinkButton href="/join" size="md" className="shine hidden sm:inline-flex">Join</LinkButton>
          <MobileNav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-mist hover:text-ivory-100">
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </Link>
        <Reveal>
          <p className="mt-8 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.35em] text-gold-500">
            <span className="h-px w-8 bg-gold-500/40" aria-hidden />
            {kicker}
          </p>
          <h1 className="mt-4 font-display text-4xl leading-[1.1] text-ivory-50 md:text-5xl">{title}</h1>
          <p className="mt-5 text-lg leading-8 text-mist">{dek}</p>
          {updated && <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-mist/70">Updated {updated}</p>}
        </Reveal>
        <div className="mt-12 space-y-14">{children}</div>
      </main>
      <PublicFooter />
    </div>
  );
}

export function GuideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Reveal>
      <section>
        <h2 className="font-display text-2xl leading-snug text-ivory-50 md:text-3xl">{title}</h2>
        <div className="prose-guide mt-5 space-y-4 text-base leading-7 md:text-[15px] md:leading-8 text-ivory-200/85">{children}</div>
      </section>
    </Reveal>
  );
}

export function Callout({ children, tone = "gold" }: { children: React.ReactNode; tone?: "gold" | "note" }) {
  return (
    <div
      className={
        tone === "gold"
          ? "rounded-xl border border-gold-500/25 bg-gold-500/8 px-5 py-4 text-sm leading-7 text-ivory-200/90"
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
        <h2 className="font-display text-2xl leading-snug text-ivory-50 md:text-3xl">{title}</h2>
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
    <li className="flex gap-3 rounded-xl border hairline bg-ink-800/40 px-4 py-3 text-sm leading-6 text-ivory-200/85">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gold-500/40 text-[11px] text-gold-400">✓</span>
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
          <h2 className="font-display text-2xl text-ivory-50">{heading}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-mist">{sub}</p>
          <div className="mt-6 flex justify-center">
            <LinkButton href={href} className="shine">{label}</LinkButton>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
