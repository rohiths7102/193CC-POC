import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { gbp, titleCase } from "@/lib/utils";
import { GlassCard } from "@/components/ui";
import { PageFx } from "@/components/motion";
import { Bars, Donut } from "@/components/charts";

export const dynamic = "force-dynamic";

export default async function Reports() {
  await requireUser("export_reports_audit");

  const [products, ledger, plans, categories, sessions, memberWallets, rule] = await Promise.all([
    db.product.findMany({ include: { memberships: { where: { status: "ACTIVE" } } } }),
    db.ledgerEntry.findMany({ include: { membership: { include: { product: true } } } }),
    db.paymentPlan.findMany(),
    db.summitCategory.findMany({ include: { applications: true, summit: { include: { event: true } } } }),
    db.mentoringSession.findMany({ where: { status: "DELIVERED" }, include: { assignment: { include: { mentor: true } } } }),
    db.user.findMany({
      where: { role: "MEMBER" },
      include: { ledgerEntries: { where: { walletEligible: true } }, unlocks: { where: { revokedAt: null } } },
    }),
    db.thresholdRule.findFirst({ where: { active: true } }),
  ]);

  const revenueByTier = products.map((p) => ({
    label: p.name,
    value: ledger.filter((l) => l.membership?.productId === p.id && l.amountMinor > 0).reduce((s, l) => s + l.amountMinor, 0) / 100,
    hint: `${p.memberships.length} active membership(s)`,
  }));

  const threshold = rule?.thresholdMinor ?? 260000;
  const unlockedCount = memberWallets.filter((u) => u.unlocks.some((x) => x.benefitKey === "main_event_delegate")).length;
  const approaching = memberWallets.filter((u) => {
    const bal = u.ledgerEntries.reduce((s, e) => s + e.amountMinor, 0);
    return bal >= threshold * 0.5 && !u.unlocks.some((x) => x.benefitKey === "main_event_delegate");
  }).length;

  const ddHealth = [
    { label: "Active plans", value: plans.filter((p) => p.status === "ACTIVE").length },
    { label: "Completed", value: plans.filter((p) => p.status === "COMPLETE").length },
    { label: "At risk", value: plans.filter((p) => p.status === "AT_RISK").length },
  ];

  const mentorHours = Object.entries(
    sessions.reduce<Record<string, number>>((acc, s) => {
      const name = s.assignment.mentor.name;
      acc[name] = (acc[name] ?? 0) + s.durationMin / 60;
      return acc;
    }, {})
  ).map(([label, value]) => ({ label, value: Math.round(value * 10) / 10 }));

  return (
    <PageFx>
      <h1 className="font-display text-3xl text-ivory-50">Reports</h1>
      <p className="mt-1.5 text-sm text-mist">Revenue, Direct Debit health, Major-Event eligibility pipeline, Summit fill rates and mentoring utilisation.</p>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <GlassCard className="p-7">
          <h2 className="mb-6 font-display text-lg text-ivory-50">Revenue by tier</h2>
          <Bars data={revenueByTier.map((r) => ({ ...r, value: Math.round(r.value) }))} prefix="£" />
        </GlassCard>

        <GlassCard className="p-7">
          <h2 className="mb-6 font-display text-lg text-ivory-50">Major Event eligibility pipeline</h2>
          <Bars data={[
            { label: "Unlocked", value: unlockedCount, hint: "crossed the threshold or admin-unlocked" },
            { label: `Approaching (≥50% of ${gbp(threshold)})`, value: approaching },
            { label: "Other members", value: Math.max(0, memberWallets.length - unlockedCount - approaching) },
          ]} />
        </GlassCard>

        <GlassCard className="p-7">
          <h2 className="mb-6 font-display text-lg text-ivory-50">Summit fill rates</h2>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((c) => {
              const confirmed = c.applications.filter((a) => a.status === "CONFIRMED").length;
              return <Donut key={c.id} fraction={confirmed / c.capacity} label={titleCase(c.kind)} sub={`${confirmed} of ${c.capacity} slots`} />;
            })}
          </div>
        </GlassCard>

        <GlassCard className="p-7">
          <h2 className="mb-6 font-display text-lg text-ivory-50">Direct Debit health & mentoring</h2>
          <Bars data={ddHealth} />
          <div className="mt-7 border-t hairline pt-6">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-mist">Delivered mentoring hours by mentor</p>
            <Bars data={mentorHours} suffix=" hrs" />
          </div>
        </GlassCard>
      </div>
    </PageFx>
  );
}
