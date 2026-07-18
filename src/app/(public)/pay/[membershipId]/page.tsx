import { notFound, redirect } from "next/navigation";
import { CreditCard, Lock } from "lucide-react";
import { db } from "@/server/db";
import { gbp } from "@/lib/utils";
import { GlassCard, Badge } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { PayForms } from "@/components/forms";
import { Steps } from "@/components/steps";

export const dynamic = "force-dynamic";

export default async function PayPage({ params }: { params: Promise<{ membershipId: string }> }) {
  const { membershipId } = await params;
  const m = await db.membership.findUnique({
    where: { id: membershipId },
    include: { product: true, user: true, contract: true },
  });
  if (!m) notFound();
  if (m.status === "AWAITING_SIGNATURE") redirect(`/sign/${m.id}`);
  if (m.status !== "AWAITING_PAYMENT") redirect(`/status/${m.id}`);

  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <Steps current={4} />
      <Reveal>
        <div className="mt-8 flex items-center gap-3">
          <CreditCard className="h-6 w-6 text-gold-400" />
          <h1 className="font-display text-3xl text-ivory-50">Payment</h1>
          <Badge tone="green">Contract signed ✓</Badge>
        </div>
        <p className="mt-2 text-sm text-mist">
          {m.product.name} — <span className="text-ivory-100">{gbp(m.product.priceMinor)}</span>
          {m.product.billing === "ANNUAL" ? " per year" : " one-time"} · {m.user.name}
        </p>
      </Reveal>
      <Reveal delay={0.12}>
        <GlassCard strong className="mt-8 p-7">
          <PayForms membershipId={m.id} priceMinor={m.product.priceMinor} allowsDirectDebit={m.product.allowsDirectDebit} />
        </GlassCard>
      </Reveal>
      <p className="mt-5 flex items-center gap-2 text-xs text-mist/70">
        <Lock className="h-3.5 w-3.5" /> Card data is tokenised by the payment provider — this platform never stores raw card numbers (PCI-DSS SAQ-A model). Every payment credits your £2,600 Major-Event wallet.
      </p>
    </main>
  );
}
