import Link from "next/link";
import { ArrowLeft, ArrowRight, Landmark, TrendingUp, Scale } from "lucide-react";
import { GlassCard, LinkButton, Badge } from "@/components/ui";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { Logo } from "@/components/logo";
import { PublicFooter } from "@/components/public-chrome";
import { MobileNav } from "@/components/mobile-nav";

export const metadata = {
  title: "Guides — Investor Readiness, House of Lords Events & Membership",
  description:
    "Practical guides from the 193 Countries Consortium: attending business events at the House of Lords, becoming investment-ready with SEIS/EIS, and comparing UK business membership organisations.",
  alternates: { canonical: "/guides" },
};

const GUIDES = [
  {
    href: "/events/house-of-lords",
    icon: <Landmark className="h-5 w-5" />,
    kicker: "Events",
    title: "Attending a business event at the House of Lords",
    dek: "Invitations, security, dress code and etiquette — what to expect at a private function inside the Palace of Westminster, from the body that hosts them.",
    tag: "Definitive guide",
  },
  {
    href: "/guides/investor-readiness",
    icon: <TrendingUp className="h-5 w-5" />,
    kicker: "Investment",
    title: "The investor-readiness roadmap: SEIS/EIS to first cheque",
    dek: "The practical route from 'we should raise' to a fundable company — advance assurance, the readiness checklist, and where the introductions actually happen.",
    tag: "Roadmap + checklist",
  },
  {
    href: "/guides/uk-business-membership-compared",
    icon: <Scale className="h-5 w-5" />,
    kicker: "Membership",
    title: "FSB vs IoD vs Chambers vs private clubs — compared",
    dek: "What each UK business membership actually costs, what it includes, and which one fits which kind of business — stated plainly, our own tiers included.",
    tag: "Honest comparison",
  },
];

export default function GuidesHub() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex min-h-11 items-center text-sm"><Logo size={40} /></Link>
        <div className="flex items-center gap-5">
          <LinkButton href="/join" size="sm" className="shine hidden sm:inline-flex">Join</LinkButton>
          <MobileNav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
        <Link href="/" className="-mx-2 inline-flex min-h-11 items-center gap-2 px-2 text-sm text-mist hover:text-ivory-100 lg:min-h-0">
          <ArrowLeft className="h-4 w-4" /> Back to site
        </Link>
        <Reveal>
          <p className="mt-8 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.35em] text-gold-500">
            <span className="h-px w-8 bg-gold-500/40" aria-hidden />
            Guides
          </p>
          <h1 className="mt-4 font-display text-4xl leading-[1.1] text-ivory-50 md:text-5xl">
            Practical guidance, <span className="text-gold-grad">stated plainly.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-mist">
            Written from first-hand experience — hosting at the House of Lords, preparing companies for
            investment, and sitting on the other side of the membership decision.
          </p>
        </Reveal>
        <Stagger className="mt-12 space-y-5">
          {GUIDES.map((g) => (
            <StaggerItem key={g.href}>
              <Link href={g.href} className="card-lux shine block rounded-2xl">
                <GlassCard className="flex flex-col gap-4 p-7 sm:flex-row sm:items-center sm:gap-6">
                  <span className="w-fit rounded-xl bg-gold-500/12 p-3 text-gold-400">{g.icon}</span>
                  <span className="flex-1">
                    <span className="flex flex-wrap items-center gap-3">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-500">{g.kicker}</span>
                      <Badge tone="grey">{g.tag}</Badge>
                    </span>
                    <span className="mt-1.5 block font-display text-xl leading-snug text-ivory-50">{g.title}</span>
                    <span className="mt-2 block text-sm leading-6 text-mist">{g.dek}</span>
                  </span>
                  <ArrowRight className="hidden h-5 w-5 shrink-0 text-gold-500 sm:block" />
                </GlassCard>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </main>
      <PublicFooter />
    </div>
  );
}
