import { notFound } from "next/navigation";
import { Crown } from "lucide-react";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { thresholdProgress } from "@/server/wallet";
import { gbp, ukDate, titleCase } from "@/lib/utils";
import { GlassCard, Badge, Table, Td, STATUS_TONE, Avatar, LinkButton, Button } from "@/components/ui";
import { PageFx, ProgressRing } from "@/components/motion";
import { ReasonForm, AssignMentorForm, EraseMemberForm } from "@/components/forms";
import { collectInstalmentAction, endAssignmentAction } from "@/server/actions/staff";

export const dynamic = "force-dynamic";

export default async function MemberDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("manage_all_memberships");
  const { id } = await params;
  const u = await db.user.findUnique({
    where: { id },
    include: {
      memberships: { include: { product: true, contract: true, paymentPlan: true }, orderBy: { createdAt: "desc" } },
      ledgerEntries: { orderBy: { createdAt: "desc" } },
      unlocks: { where: { revokedAt: null } },
      menteeAssignments: { include: { mentor: true } },
      slotApplications: { include: { category: { include: { summit: { include: { event: true } } } } } },
    },
  });
  if (!u || u.role !== "MEMBER") notFound();
  const wallet = await thresholdProgress(u.id);
  const mentorPool = await db.user.findMany({
    where: { role: { in: ["MENTOR", "CONSULTANT"] }, status: "ACTIVE" }, orderBy: { name: "asc" },
  });
  const unlocked = u.unlocks.some((x) => x.benefitKey === "main_event_delegate");

  return (
    <PageFx>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={u.name} className="h-14 w-14 text-base" />
        <div className="flex-1">
          <h1 className="font-display text-3xl text-ivory-50">{u.name}</h1>
          <p className="text-sm text-mist">{u.email}{u.company && <> · {u.company}</>}</p>
        </div>
        <Badge tone={STATUS_TONE[u.status] ?? "grey"}>{u.status}</Badge>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        {/* Wallet + override */}
        <GlassCard strong className="p-7">
          <div className="flex items-center gap-2.5">
            <Crown className="h-5 w-5 text-gold-400" />
            <h2 className="font-display text-lg text-ivory-50">Credit wallet & Major Event</h2>
          </div>
          <div className="mt-5 flex items-center gap-6">
            <ProgressRing size={120} stroke={8}
              fraction={unlocked ? 1 : wallet.balance / wallet.threshold}
              label={gbp(wallet.balance)} sublabel={unlocked ? "Unlocked" : `of ${gbp(wallet.threshold)}`} />
            <div className="text-sm text-mist">
              <p>Threshold: <strong className="text-ivory-100">{gbp(wallet.threshold)}</strong></p>
              <p className="mt-1">Remaining: <strong className="text-ivory-100">{gbp(wallet.remaining)}</strong></p>
              <p className="mt-1">Status: {unlocked ? <Badge tone="green">Unlocked</Badge> : <Badge tone="blue">Locked</Badge>}</p>
            </div>
          </div>
          {!unlocked && (
            <div className="mt-6 border-t hairline pt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-mist">Manual override (audited)</p>
              <ReasonForm action="unlock" hiddenFields={{ userId: u.id }} label="Reason" cta="Unlock Major Event" variant="gold" />
            </div>
          )}
          <div className="mt-6 border-t hairline pt-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-mist">Manual ledger entry (audited)</p>
            <ReasonForm action="credit" hiddenFields={{ userId: u.id }} label="Reason" cta="Post entry" />
          </div>
          <div className="mt-6 border-t border-red-400/20 pt-5">
            <EraseMemberForm userId={u.id} />
          </div>
        </GlassCard>

        {/* Memberships */}
        <div className="space-y-4">
          {u.memberships.map((m) => (
            <GlassCard key={m.id} className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-display text-lg text-ivory-50">{m.product.name}</p>
                    <Badge tone={STATUS_TONE[m.status] ?? "grey"}>{titleCase(m.status)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-mist">
                    {m.periodStart ? <>{ukDate(m.periodStart)} → {ukDate(m.periodEnd)}</> : "Not active"} · via {m.createdVia.toLowerCase()}
                    {m.contract?.signedAt && <> · signed {ukDate(m.contract.signedAt)}</>}
                  </p>
                  {m.paymentPlan && (
                    <p className="mt-1 text-xs text-mist">
                      DD plan: {m.paymentPlan.collected}/{m.paymentPlan.months} × {gbp(m.paymentPlan.instalmentMinor)} · <Badge tone={STATUS_TONE[m.paymentPlan.status] ?? "grey"}>{m.paymentPlan.status}</Badge>
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {m.contract && <LinkButton href={`/portal/membership/contract/${m.id}`} variant="ghost" size="sm">Contract</LinkButton>}
                  {m.paymentPlan && m.paymentPlan.status === "ACTIVE" && (
                    <form action={collectInstalmentAction}>
                      <input type="hidden" name="membershipId" value={m.id} />
                      <Button size="sm" variant="dark">Collect next instalment</Button>
                    </form>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}

          <GlassCard className="p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-mist">Mentoring assignments</p>
            {u.menteeAssignments.filter((a) => a.active).map((a) => (
              <div key={a.id} className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-ivory-100">{a.mentor.name} <span className="text-mist">({a.kind})</span></span>
                <form action={endAssignmentAction}>
                  <input type="hidden" name="assignmentId" value={a.id} />
                  <Button size="sm" variant="danger">End</Button>
                </form>
              </div>
            ))}
            <div className="mt-3 border-t hairline pt-4">
              <AssignMentorForm memberId={u.id} mentors={mentorPool.map((m) => ({ id: m.id, name: m.name, role: m.role }))} />
            </div>
          </GlassCard>
          {u.slotApplications.length > 0 && (
            <GlassCard className="p-5 text-sm text-mist">
              Summit: {u.slotApplications.map((s) => `${titleCase(s.category.kind)} — ${titleCase(s.status)}`).join(" · ")}
            </GlassCard>
          )}
        </div>
      </div>

      <h2 className="mt-10 font-display text-xl text-ivory-50">Ledger</h2>
      <div className="mt-4">
        <Table head={["Date", "Type", "Detail", "Provider", "Amount"]}>
          {u.ledgerEntries.map((l) => (
            <tr key={l.id}>
              <Td>{ukDate(l.createdAt, true)}</Td>
              <Td><Badge tone={l.amountMinor < 0 ? "red" : "green"}>{titleCase(l.type)}</Badge></Td>
              <Td className="max-w-72 truncate">{l.reason ?? "—"}</Td>
              <Td className="text-xs text-mist">{titleCase(l.provider)}</Td>
              <Td className={l.amountMinor < 0 ? "text-red-300" : "text-ivory-50"}>{gbp(l.amountMinor)}</Td>
            </tr>
          ))}
        </Table>
      </div>
    </PageFx>
  );
}
