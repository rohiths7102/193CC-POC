import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { db } from "@/server/db";
import { gbp } from "@/lib/utils";
import { GlassCard, Badge } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { EnrolForm } from "@/components/forms";

export const dynamic = "force-dynamic";

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
      label: `${c.kind.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (ch) => ch.toUpperCase())} · ${c.summit.event.name}`,
      slotsLeft: Math.max(0, c.capacity - c.applications.length),
    }));
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <Link href="/join" className="inline-flex items-center gap-2 text-sm text-mist hover:text-ivory-100">
        <ArrowLeft className="h-4 w-4" /> All memberships
      </Link>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
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
              <p><strong className="text-ivory-100">What happens next:</strong> we generate your membership agreement for
              e-signature, then take payment{product.allowsDirectDebit ? " (card or Direct Debit instalments)" : " (card)"}.
              Your account activates the moment both are complete.</p>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.12}>
          <GlassCard strong className="p-7">
            <h2 className="font-display text-xl text-ivory-50">Create your account</h2>
            <p className="mb-6 mt-1 text-sm text-mist">Step 1 of 3 — details, contract, payment.</p>
            <EnrolForm productCode={product.code} summitCategories={summitCategories} org={product.code.startsWith("ENT_")} />
          </GlassCard>
        </Reveal>
      </div>
    </main>
  );
}

function entitlementLabel(key: string, params: Record<string, unknown> | null): string {
  switch (key) {
    case "main_event_delegate": return "Main Event attendance in delegate capacity (House of Lords)";
    case "summit_slot": return "UK Investors Summit — one slot per annum (presentation, launch or award)";
    case "branding_video": return "Featured branding video with a consortium CXO";
    case "article": return `Website article up to ${params?.maxWords ?? 1400} words with ${params?.maxImages ?? 2} HD images`;
    case "mentoring_hours": return `${params?.hours ?? 2} hours of ${params?.kind ?? "senior"} mentoring every month`;
    case "networking_news": return "News and online networking areas";
    case "business_model_guidance": return "Business-model guidance incl. franchise & distributorship strategies";
    case "eis_guidance": return "EIS-readiness and investment-portfolio guidance (UK companies)";
    case "investor_visibility": return "Opt-in visibility to accredited investors ahead of the Summit";
    default: return key;
  }
}
