import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { ukDate, titleCase } from "@/lib/utils";
import { GlassCard, Badge, STATUS_TONE, Avatar, Empty } from "@/components/ui";
import { PageFx } from "@/components/motion";
import { LogSessionForm, BookSessionForm } from "@/components/forms";

export const dynamic = "force-dynamic";

export default async function MentorHome() {
  const mentor = await requireUser("access_assigned_members");
  // Row scoping: ONLY formally assigned members are visible (client requirement).
  const assignments = await db.mentorAssignment.findMany({
    where: { mentorId: mentor.id, active: true },
    include: {
      member: true,
      sessions: { orderBy: { scheduledAt: "desc" } },
    },
  });

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  return (
    <PageFx>
      <h1 className="font-display text-3xl text-ivory-50">My members</h1>
      <p className="mt-1.5 text-sm text-mist">Only members formally assigned to you are visible. Log delivered hours against each — allowances are 2 hrs (Individual) / 5 hrs (Enterprise) per month.</p>

      {assignments.length === 0 && <div className="mt-8"><Empty title="No members assigned yet" /></div>}

      <div className="mt-8 space-y-6">
        {assignments.map((a) => {
          const deliveredThisMonth = a.sessions
            .filter((s) => s.status === "DELIVERED" && s.scheduledAt >= monthStart)
            .reduce((sum, s) => sum + s.durationMin, 0) / 60;
          return (
            <GlassCard key={a.id} className="p-7">
              <div className="flex flex-wrap items-center gap-4">
                <Avatar name={a.member.name} className="h-12 w-12 text-sm" />
                <div className="flex-1">
                  <p className="font-display text-lg text-ivory-50">{a.member.name}</p>
                  <p className="text-xs text-mist">{a.member.company ?? a.member.email} · {a.kind} track</p>
                </div>
                <Badge tone="gold">{deliveredThisMonth} hrs delivered this month</Badge>
              </div>

              <div className="mt-5 space-y-3">
                {a.sessions.map((s) => (
                  <div key={s.id} className="rounded-xl border hairline bg-ink-800/40 p-4">
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <Badge tone={STATUS_TONE[s.status] ?? "grey"}>{titleCase(s.status)}</Badge>
                      <span className="text-ivory-100">{ukDate(s.scheduledAt, true)}</span>
                      <span className="text-mist">· {s.durationMin} min</span>
                      {s.notes && <span className="italic text-mist">"{s.notes}"</span>}
                    </div>
                    {s.status === "BOOKED" && (
                      <div className="mt-3 border-t hairline pt-3">
                        <LogSessionForm sessionId={s.id} />
                      </div>
                    )}
                  </div>
                ))}
                {a.sessions.length === 0 && <p className="text-sm text-mist">No sessions yet.</p>}
              </div>
              <div className="mt-4 border-t hairline pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-mist">Book on the member's behalf (uses their allowance)</p>
                <BookSessionForm assignmentId={a.id} />
              </div>
            </GlassCard>
          );
        })}
      </div>
    </PageFx>
  );
}
