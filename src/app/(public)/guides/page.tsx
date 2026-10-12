import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PublicFooter } from "@/components/public-chrome";
import { SiteHeader } from "@/components/site-header";
import { MagazineMotion, Reveal, MaskedLines, ImageReveal, ReadingRule, ChamberLight } from "@/components/magazine/motion";

export const metadata = {
  title: "Guides — Investor Readiness, House of Lords Events & Membership",
  description:
    "Practical guides from the 193 Countries Consortium: attending business events at the House of Lords, becoming investment-ready with SEIS/EIS, and comparing UK business membership organisations.",
  alternates: { canonical: "/guides" },
};

const GUIDES = [
  {
    href: "/events/house-of-lords",
    image: "/images/193cc-launch-westminster-hall-group.jpg",
    alt: "Members and guests on the steps of Westminster Hall",
    kicker: "Events · Definitive guide",
    title: "Attending a business event at the House of Lords",
    dek: "Invitations, security, dress code and etiquette — what to expect at a private function inside the Palace of Westminster, from the body that hosts them.",
  },
  {
    href: "/guides/investor-readiness",
    image: "/images/summit-2023-roundtable.jpg",
    alt: "Founders and investors in discussion at a Summit table",
    kicker: "Investment · Roadmap + checklist",
    title: "The investor-readiness roadmap: SEIS/EIS to first cheque",
    dek: "The practical route from 'we should raise' to a fundable company — advance assurance, the readiness checklist, and where the introductions actually happen.",
  },
  {
    href: "/guides/uk-business-membership-compared",
    image: "/images/summit-2023-reception.jpg",
    alt: "Guests in conversation in a committee room at the House of Lords",
    kicker: "Membership · Honest comparison",
    title: "FSB vs IoD vs Chambers vs private clubs — compared",
    dek: "What each UK business membership actually costs, what it includes, and which one fits which kind of business — stated plainly, our own tiers included.",
  },
];

export default function GuidesHub() {
  return (
    <MagazineMotion>
      <div className="flex min-h-svh flex-col font-body text-copy">
        <SiteHeader />
        <ReadingRule />
        <main className="relative isolate mx-auto w-full max-w-7xl flex-1 px-6 pb-24 pt-16 sm:pt-24">
          <ChamberLight at="right" />
          <Reveal>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">Guides</p>
          </Reveal>
          <MaskedLines
            as="h1"
            className="mt-6 font-headline text-[clamp(2.8rem,7vw,5.5rem)] leading-[1] tracking-[-0.015em]"
            lines={["Practical guidance,", <em key="p" className="text-gilt">stated plainly.</em>]}
          />
          <Reveal delay={0.2}>
            <p className="mt-8 max-w-2xl text-lg leading-[1.75] text-copy-soft">
              Written from first-hand experience — hosting at the House of Lords, preparing companies for
              investment, and sitting on the other side of the membership decision.
            </p>
          </Reveal>

          <ol className="mt-20 grid gap-x-8 gap-y-16 md:grid-cols-3">
            {GUIDES.map((g, i) => (
              <li key={g.href}>
                <Link href={g.href} className="group block">
                  <ImageReveal
                    src={g.image}
                    alt={g.alt}
                    sizes="(min-width: 768px) 30vw, 100vw"
                    className="aspect-[16/10] w-full md:aspect-[4/5]"
                    imageClassName="transition-transform duration-1000 ease-editorial group-hover:scale-105"
                  />
                  <Reveal delay={0.1 * i}>
                    <p className="mt-6 flex gap-4 font-mono text-[10px] uppercase tracking-[0.18em] text-copy-muted">
                      <span className="text-accent">{String(i + 1).padStart(2, "0")}</span>
                      {g.kicker}
                    </p>
                    <h2 className="mt-3 font-headline text-3xl leading-tight transition-colors group-hover:text-accent-on-night">
                      {g.title}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-copy-muted">{g.dek}</p>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm text-accent">
                      Read the guide <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                  </Reveal>
                </Link>
              </li>
            ))}
          </ol>
        </main>
        <PublicFooter />
      </div>
    </MagazineMotion>
  );
}
