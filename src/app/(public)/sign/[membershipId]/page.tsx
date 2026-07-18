import { notFound, redirect } from "next/navigation";
import { FileSignature } from "lucide-react";
import { db } from "@/server/db";
import { GlassCard, Badge } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { SignForm } from "@/components/forms";
import { Steps } from "@/components/steps";

export const dynamic = "force-dynamic";

export default async function SignPage({ params }: { params: Promise<{ membershipId: string }> }) {
  const { membershipId } = await params;
  const m = await db.membership.findUnique({
    where: { id: membershipId },
    include: { contract: true, product: true, user: true },
  });
  if (!m || !m.contract) notFound();
  if (m.status === "AWAITING_PAYMENT") redirect(`/pay/${m.id}`);
  if (m.status !== "AWAITING_SIGNATURE") redirect(`/status/${m.id}`);

  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <Steps current={3} />
      <Reveal>
        <div className="mt-8 flex items-center gap-3">
          <FileSignature className="h-6 w-6 text-gold-400" />
          <h1 className="font-display text-3xl text-ivory-50">Sign your agreement</h1>
          <Badge tone="blue">{m.product.name}</Badge>
        </div>
        <p className="mt-2 text-sm text-mist">
          For {m.user.name} · {m.user.email}. Your account activates only after signature <em className="text-gold-400 not-italic">and</em> payment.
        </p>
      </Reveal>
      <Reveal delay={0.1}>
        <GlassCard className="contract-doc mt-8 max-h-[420px] overflow-y-auto p-8"
          // Contract HTML is generated server-side from our own template — not user input.
          dangerouslySetInnerHTML={{ __html: m.contract.docHtml }}
        />
      </Reveal>
      <Reveal delay={0.18}>
        <GlassCard strong className="mt-6 p-7">
          <SignForm membershipId={m.id} />
        </GlassCard>
      </Reveal>
    </main>
  );
}
