import { FileText, Download, Wallet } from "lucide-react";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { thresholdProgress } from "@/server/wallet";
import { gbp, ukDate, titleCase } from "@/lib/utils";
import { GlassCard, Badge, Table, Td, STATUS_TONE, LinkButton } from "@/components/ui";
import { PageFx } from "@/components/motion";

export const dynamic = "force-dynamic";

export default async function MembershipPage() {
  const user = await requireUser("view_credit_wallet");
  const [memberships, ledger, wallet] = await Promise.all([
    db.membership.findMany({
      where: { userId: user.id },
      include: { product: true, contract: true, paymentPlan: true },
      orderBy: { createdAt: "desc" },
    }),
    db.ledgerEntry.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    thresholdProgress(user.id),
  ]);

  return (
    <PageFx>
      <h1 className="font-display text-3xl text-ivory-50">Membership & wallet</h1>
      <p className="mt-1.5 text-sm text-mist">Contracts, payments and your Major-Event credit position — the full record.</p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <GlassCard className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-mist">Credited balance</p>
          <p className="mt-2 font-display text-3xl text-gold-grad">{gbp(wallet.balance)}</p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-mist">Major Event threshold</p>
          <p className="mt-2 font-display text-3xl text-ivory-50">{gbp(wallet.threshold)}</p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-mist">Status</p>
          <p className="mt-3">
            {wallet.unlocked
              ? <Badge tone="green">Unlocked{wallet.unlock?.source === "MANUAL" ? " · by admin" : " · automatic"}</Badge>
              : <Badge tone="blue">{gbp(wallet.remaining)} remaining</Badge>}
          </p>
        </GlassCard>
      </div>

      <h2 className="mt-10 font-display text-xl text-ivory-50">Your memberships</h2>
      <div className="mt-4 space-y-4">
        {memberships.map((m) => (
          <GlassCard key={m.id} className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <div className="flex items-center gap-3">
                <p className="font-display text-lg text-ivory-50">{m.product.name}</p>
                <Badge tone={STATUS_TONE[m.status] ?? "grey"}>{titleCase(m.status)}</Badge>
              </div>
              <p className="mt-1 text-xs text-mist">
                {m.periodStart ? <>Active {ukDate(m.periodStart)} → {ukDate(m.periodEnd)}</> : "Not yet active"}
                {m.paymentPlan && <> · Direct Debit {m.paymentPlan.collected}/{m.paymentPlan.months} instalments of {gbp(m.paymentPlan.instalmentMinor)}</>}
              </p>
              {m.contract?.signedAt && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-mist">
                  <FileText className="h-3.5 w-3.5 text-gold-500" />
                  Signed by {m.contract.signerName} on {ukDate(m.contract.signedAt)} · stored on your record
                </p>
              )}
            </div>
            {m.contract && (
              <LinkButton href={`/portal/membership/contract/${m.id}`} variant="ghost" size="sm">
                <Download className="h-3.5 w-3.5" /> View contract
              </LinkButton>
            )}
          </GlassCard>
        ))}
      </div>

      <h2 className="mt-10 flex items-center gap-2 font-display text-xl text-ivory-50">
        <Wallet className="h-5 w-5 text-gold-400" /> Payment ledger
      </h2>
      <p className="mb-4 mt-1 text-xs text-mist">Append-only — every movement is permanent and auditable.</p>
      <Table head={["Date", "Type", "Detail", "Amount", "Wallet"]}>
        {ledger.map((l) => (
          <tr key={l.id}>
            <Td>{ukDate(l.createdAt)}</Td>
            <Td><Badge tone={l.amountMinor < 0 ? "red" : "green"}>{titleCase(l.type)}</Badge></Td>
            <Td className="max-w-72 truncate">{l.reason ?? "—"}</Td>
            <Td className={l.amountMinor < 0 ? "text-red-300" : "text-ivory-50"}>{gbp(l.amountMinor)}</Td>
            <Td>{l.walletEligible ? "✓" : "—"}</Td>
          </tr>
        ))}
      </Table>
    </PageFx>
  );
}
