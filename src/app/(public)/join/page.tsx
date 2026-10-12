import Link from "next/link";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { db } from "@/server/db";
import { gbp } from "@/lib/utils";
import { GlassCard, Badge } from "@/components/ui";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { PublicHeader, PublicFooter } from "@/components/public-chrome";
import { EventFilm } from "@/components/showcase";
import { ChamberLight } from "@/components/magazine/motion";
import { FaqBlock } from "@/components/editorial";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Choose Your Membership — Tiers & Fees",
  description:
    "Compare 193 Countries Consortium membership tiers side by side — Individual, Enterprise and Summit-linked. Fees, benefits and access stated plainly. From £500.",
  alternates: { canonical: "/join" },
};

export default async function JoinIndex() {
  const products = await db.product.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  return (
    <div className="flex min-h-svh flex-col">
    <PublicHeader />
    <main className="relative isolate mx-auto w-full max-w-6xl flex-1 px-6 py-16">
      <ChamberLight at="right" />
      <div className="grid gap-12 lg:grid-cols-12">
      <div className="lg:col-span-7">
      <Link href="/" className="-mx-2 inline-flex min-h-11 items-center gap-2 px-2 text-sm text-mist hover:text-ivory-100 lg:min-h-0">
        <ArrowLeft className="h-4 w-4" /> Back to site
      </Link>
      <Reveal>
        <h1 className="mt-6 font-headline text-[clamp(2.6rem,6vw,4.5rem)] leading-[1.02] text-ivory-50">Choose your <em className="text-gilt">membership.</em></h1>
        <p className="mt-4 text-lg text-mist">Contract first, payment second, access instantly after both.</p>
      </Reveal>
      <Stagger className="mt-10 space-y-4">
        {products.map((p) => (
          <StaggerItem key={p.id}>
            <Link href={`/join/${p.code}`} className="card-lux shine block rounded-2xl">
              <GlassCard className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-headline text-2xl text-ivory-50">{p.name}</h2>
                    {p.code === "ENT_INVESTOR" && <Badge>Flagship</Badge>}
                    {p.billing === "ONE_TIME" && <Badge tone="purple">Event-linked</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-mist">{p.strapline}</p>
                </div>
                <div className="flex shrink-0 items-center gap-5">
                  <p className="font-headline text-3xl text-gold-grad">{gbp(p.priceMinor)}</p>
                  <ArrowRight className="h-5 w-5 text-gold-500" />
                </div>
              </GlassCard>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
      </div>
      <aside className="lg:col-span-5">
        <figure className="lg:sticky lg:top-28">
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-night">
            <EventFilm
              src="/videos/193cc-brand-launch-sportto.mp4"
              poster="/videos/193cc-brand-launch-sportto-poster.jpg"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span aria-hidden="true" className="pointer-events-none absolute inset-3 border border-gilt/60" />
          </div>
          <figcaption className="mt-3 border-t hairline pt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-mist">
            A member brand unveiled at the House of Lords · 21 July 2023
          </figcaption>
        </figure>
      </aside>
      </div>

      <div className="mt-16 max-w-3xl">
        <FaqBlock
          title="Membership questions, answered plainly"
          faqs={[
            {
              q: "What happens after I choose a tier?",
              a: "Three steps, all online: confirm your email with a 6-digit code, e-sign your membership agreement, then pay by card (or Direct Debit instalments on enterprise tiers). Your account and benefits activate the moment all three are complete — typically about 20 minutes end to end.",
            },
            {
              q: "Can I pay by instalments?",
              a: "Enterprise tiers can be paid by Direct Debit over 3 or 6 monthly instalments, set up during enrolment. The Individual and Summit-linked memberships are paid by card in full.",
            },
            {
              q: "Is membership tax deductible for my business?",
              a: "It depends on your circumstances — HMRC's test is whether the expense is wholly and exclusively for the trade, and mixed business/personal benefits are judged on the facts. Ask your accountant before assuming a deduction; our comparison guide covers the general rules.",
            },
            {
              q: "What is the £2,600 Major Event threshold?",
              a: "Payments on qualifying enterprise memberships credit a wallet on your account. When cumulative credited payments reach £2,600, the House of Lords Major Event benefit unlocks automatically — no forms, no waiting. Individual members attend as delegates without a threshold.",
            },
          ]}
        />
      </div>
    </main>
    <PublicFooter />
    </div>
  );
}
