import { CalendarClock } from "lucide-react";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { resolveEntitlements } from "@/server/entitlements";
import { ukDate, titleCase } from "@/lib/utils";
import { GlassCard, Badge, Table, Td, STATUS_TONE, Empty, Avatar } from "@/components/ui";
import { PageFx } from "@/components/motion";
import { BookSessionForm } from "@/components/forms";

export const dynamic = "force-dynamic";

export default async function MentoringPage() {
  const user = await requireUser("view_log_mentoring");
  const ent = await resolveEntitlements(user.id);
  const assignments = await db.mentorAssignment.findMany({
    where: { memberId: user.id, active: true },
    include: { mentor: true, sessions: { orderBy: { scheduledAt: "desc" } } },
  });

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const usedMin = assignments
    .flatMap((a) => a.sessions)
    .filter((s) => s.scheduledAt >= monthStart && ["BOOKED", "DELIVERED"].includes(s.status))
    .reduce((sum, s) => sum + s.durationMin, 0);

  return (
    <PageFx>
      <h1 className="font-display text-3xl text-ivory-50">Mentoring</h1>
      <p className="mt-1.5 text-sm text-mist">
        Your allowance: <strong className="text-gold-300">{ent.mentoringHours} hrs/month</strong>
        {ent.mentorKinds.length > 0 && <> ({ent.mentorKinds.join(", ")})</>} ·
        used this month: <strong className="text-ivory-100">{(usedMin / 60).toFixed(1)} hrs</strong> · unused hours expire monthly.
      </p>

      {assignments.length === 0 ? (
        <div className="mt-8"><Empty title="No mentor assigned yet" sub="An administrator will assign your mentor shortly — you'll see them here the moment it happens." /></div>
      ) : (
        assignments.map((a) => (
          <GlassCard key={a.id} className="mt-8 p-7">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar name={a.mentor.name} className="h-12 w-12 text-sm" />
              <div className="flex-1">
                <p className="font-display text-lg text-ivory-50">{a.mentor.name}</p>
                <p className="text-xs uppercase tracking-widest text-mist">{a.kind} mentor</p>
              </div>
              <Badge tone="gold"><CalendarClock className="h-3 w-3" /> {ent.mentoringHours}h monthly</Badge>
            </div>

            <div className="mt-6 rounded-xl border hairline bg-ink-800/40 p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-mist">Book a session</p>
              <BookSessionForm assignmentId={a.id} />
            </div>

            <p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-widest text-mist">Session history</p>
            <Table head={["When", "Duration", "Status", "Notes"]}>
              {a.sessions.map((s) => (
                <tr key={s.id}>
                  <Td>{ukDate(s.scheduledAt, true)}</Td>
                  <Td>{s.durationMin} min</Td>
                  <Td><Badge tone={STATUS_TONE[s.status] ?? "grey"}>{titleCase(s.status)}</Badge></Td>
                  <Td className="max-w-72 truncate">{s.notes ?? "—"}</Td>
                </tr>
              ))}
            </Table>
          </GlassCard>
        ))
      )}
    </PageFx>
  );
}
