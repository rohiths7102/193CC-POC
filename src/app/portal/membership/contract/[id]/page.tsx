import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { ukDate } from "@/lib/utils";
import { GlassCard, Badge, LinkButton } from "@/components/ui";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

export default async function ContractView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const m = await db.membership.findUnique({
    where: { id }, include: { contract: true, product: true, user: true },
  });
  if (!m || !m.contract) notFound();
  // Members see only their own contract; admins see all (client permission matrix).
  if (m.userId !== user.id && user.role !== "ADMIN") notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ivory-50">Contract — {m.product.name}</h1>
          <p className="mt-1 text-xs text-mist">
            Envelope {m.contract.envelopeRef.slice(0, 8)} · {m.contract.signedAt ? <>signed {ukDate(m.contract.signedAt, true)}</> : "unsigned"}
          </p>
        </div>
        <div className="flex gap-2">
          <PrintButton />
          <LinkButton href={user.role === "ADMIN" ? "/portal/admin/members" : "/portal/membership"} variant="ghost" size="sm">Back</LinkButton>
        </div>
      </div>
      <GlassCard className="contract-doc p-10" dangerouslySetInnerHTML={{ __html: m.contract.docHtml }} />
      {m.contract.signedAt && (
        <GlassCard className="mt-4 p-6">
          <p className="text-[11px] uppercase tracking-[0.3em] text-mist">Electronically signed</p>
          <p className="mt-2 font-display text-3xl italic text-gold-grad">{m.contract.signerName}</p>
          <p className="mt-2 text-xs text-mist">{m.contract.signerEmail} · {ukDate(m.contract.signedAt, true)} · <Badge tone="green">SIGNED</Badge></p>
        </GlassCard>
      )}
    </div>
  );
}
