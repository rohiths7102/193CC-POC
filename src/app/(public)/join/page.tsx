import Link from "next/link";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { db } from "@/server/db";
import { gbp } from "@/lib/utils";
import { GlassCard, Badge } from "@/components/ui";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";

export const dynamic = "force-dynamic";

export default async function JoinIndex() {
  const products = await db.product.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-mist hover:text-ivory-100">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <Reveal>
        <h1 className="mt-6 font-display text-4xl text-ivory-50">Choose your <span className="text-gold-grad">membership</span></h1>
        <p className="mt-3 text-mist">Contract first, payment second, access instantly after both.</p>
      </Reveal>
      <Stagger className="mt-10 space-y-4">
        {products.map((p) => (
          <StaggerItem key={p.id}>
            <Link href={`/join/${p.code}`} className="block">
              <GlassCard className="flex items-center justify-between gap-6 p-6 transition-colors hover:border-gold-500/50">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="font-display text-xl text-ivory-50">{p.name}</h2>
                    {p.code === "ENT_INVESTOR" && <Badge>Flagship</Badge>}
                    {p.billing === "ONE_TIME" && <Badge tone="purple">Event-linked</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-mist">{p.strapline}</p>
                </div>
                <div className="flex shrink-0 items-center gap-5">
                  <p className="font-display text-2xl text-gold-grad">{gbp(p.priceMinor)}</p>
                  <ArrowRight className="h-5 w-5 text-gold-500" />
                </div>
              </GlassCard>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </main>
  );
}
