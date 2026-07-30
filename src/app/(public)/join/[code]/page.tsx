import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { db } from "@/server/db";
import { gbp } from "@/lib/utils";
import { GlassCard, Badge } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { EnrolForm } from "@/components/forms";
import { Steps } from "@/components/steps";
import { PublicFooter } from "@/components/public-chrome";
import { entitlementLabel, SLOT_KIND_LABEL } from "@/lib/labels";

export const dynamic = "force-dynamic";

/** Unique title/description per tier; canonical collapses /join/individual,
 *  /join/Individual etc. onto the uppercase DB code. */
export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const product = await db.product.findUnique({ where: { code: code.toUpperCase() } });
  if (!product?.active) return { robots: { index: false } };
  return {
    title: `${product.name} — ${gbp(product.priceMinor)}${product.billing === "ANNUAL" ? "/year" : ""}`,
    description: product.strapline,
    alternates: { canonical: `/join/${product.code}` },
  };
}

export default async function JoinTier({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const product = await db.product.findUnique({
    where: { code: code.toUpperCase() }, include: { entitlements: true },
  });
  if (!product || !product.active) notFound();

  // Temporary membership is event-linked: applicant picks their Summit category up front.
  let summitCategories: { id: string; label: string; slotsLeft: number }[] | undefined;
  if (product.billing === "ONE_TIME") {
    const cats = await db.summitCategory.findMany({
      where: { summit: { status: "OPEN", deadlineAt: { gt: new Date() } } },
      include: { summit: { include: { event: true } }, applications: { where: { status: "CONFIRMED" } } },
    });
    summitCategories = cats.map((c) => ({
      id: c.id,
      label: `${SLOT_KIND_LABEL[c.kind]} · ${c.summit.event.name}`,
      slotsLeft: Math.max(0, c.capacity - c.applications.length),
    }));
  }

  return (
    <div className="flex min-h-svh flex-col">
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
      <Link href="/join" className="inline-flex items-center gap-2 text-sm text-mist hover:text-ivory-100">
        <ArrowLeft className="h-4 w-4" /> All memberships
      </Link>
      <div className="mt-8">
        <Steps current={1} />
      </div>
      <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <Reveal>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-4xl text-ivory-50">{product.name}</h1>
              {product.billing === "ONE_TIME" && <Badge tone="purple">Event-linked</Badge>}
            </div>
            <p className="mt-3 text-lg text-mist">{product.strapline}</p>
            <p className="mt-6 font-display text-5xl text-gold-grad">
              {gbp(product.priceMinor)}
              <span className="ml-2 text-base text-mist">{product.billing === "ANNUAL" ? "per year" : "one-time"}</span>
            </p>
            <ul className="mt-8 space-y-3">
              {product.entitlements.map((e) => (
                <li key={e.id} className="flex items-start gap-3 text-sm text-ivory-200/90">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
                  {entitlementLabel(e.key, e.params as Record<string, unknown> | null)}
                </li>
              ))}
            </ul>
            <div className="mt-8 rounded-xl border hairline bg-ink-800/40 p-4 text-xs leading-5 text-mist">
              <p><strong className="text-ivory-100">What happens next:</strong> confirm your email with a 6-digit code,
              e-sign your membership agreement, then pay{product.allowsDirectDebit ? " by card or Direct Debit instalments" : " by card"}.
              Your account activates the moment all three are complete.</p>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.12}>
          <div className="card-flagship rounded-2xl">
          <GlassCard strong className="p-8">
            <h2 className="mb-6 font-display text-xl text-ivory-50">Create your account</h2>
            {/* Organisation details + document upload apply to every business
                membership: the Enterprise tiers and the event-linked Temporary
                membership (whose applicants are companies pitching at the
                Summit). Only the Individual tier skips it. */}
            <EnrolForm
              productCode={product.code}
              summitCategories={summitCategories}
              org={product.code !== "INDIVIDUAL"}
            />
          </GlassCard>
          </div>
        </Reveal>
      </div>
    </main>
    <PublicFooter />
    </div>
  );
}
