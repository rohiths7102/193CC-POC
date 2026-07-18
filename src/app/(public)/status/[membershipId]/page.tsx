import { notFound } from "next/navigation";
import Link from "next/link";
import { PartyPopper, ArrowRight } from "lucide-react";
import { db } from "@/server/db";
import { walletBalance } from "@/server/wallet";
import { gbp, ukDate } from "@/lib/utils";
import { GlassCard, Badge, LinkButton, STATUS_TONE } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { Steps, VerificationTimeline } from "@/components/steps";

export const dynamic = "force-dynamic";

export default async function StatusPage({ params }: { params: Promise<{ membershipId: string }> }) {
  const { membershipId } = await params;
  const m = await db.membership.findUnique({
    where: { id: membershipId },
    include: { product: true, user: true, contract: true, paymentPlan: true },
  });
  if (!m) notFound();
  const balance = await walletBalance(m.userId);
  const active = m.status === "ACTIVE";

  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <Steps current={active ? 4 : 3} />
      <Reveal>
        <GlassCard strong className="mt-10 p-10 text-center">
          {active ? (
            <>
              <span className="mx-auto inline-flex rounded-full bg-gold-500/15 p-4 text-gold-300"><PartyPopper className="h-8 w-8" /></span>
              <h1 className="mt-5 font-display text-4xl text-ivory-50">Welcome, <span className="text-gold-grad">{m.user.name.split(" ")[0]}</span>.</h1>
              <p className="mt-3 text-mist">
                Your <strong className="text-ivory-100">{m.product.name}</strong> is active
                {m.periodEnd && <> until {ukDate(m.periodEnd)}</>}. Contract signed {ukDate(m.contract?.signedAt)} and stored on your record.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
                <Badge tone="green">ACTIVE</Badge>
                <span className="text-mist">Credit wallet: <strong className="text-gold-300">{gbp(balance)}</strong></span>
                {m.paymentPlan && <span className="text-mist">Direct Debit: {m.paymentPlan.collected}/{m.paymentPlan.months} collected</span>}
              </div>
              <LinkButton href="/portal/dashboard" size="lg" className="mt-8">
                Enter your dashboard <ArrowRight className="h-4 w-4" />
              </LinkButton>
            </>
          ) : (
            <>
              <h1 className="font-display text-3xl text-ivory-50">Application status</h1>
              <div className="mt-4"><Badge tone={STATUS_TONE[m.status] ?? "grey"}>{m.status.replace(/_/g, " ")}</Badge></div>
              <p className="mt-4 text-sm text-mist">
                {m.status === "AWAITING_SIGNATURE" && <>Your agreement is ready. <Link className="text-gold-300 underline" href={`/sign/${m.id}`}>Sign it now</Link>.</>}
                {m.status === "AWAITING_PAYMENT" && <>Contract signed — <Link className="text-gold-300 underline" href={`/pay/${m.id}`}>complete payment</Link> to activate.</>}
                {m.status === "PENDING_VERIFICATION" && <>Signed and paid ✓ — you're one check away from full membership.</>}
                {["LAPSED", "CANCELLED", "EXPIRED"].includes(m.status) && "This membership is no longer active. Contact the team to re-enrol."}
              </p>
              {m.status === "PENDING_VERIFICATION" && <VerificationTimeline />}
            </>
          )}
        </GlassCard>
      </Reveal>
    </main>
  );
}
