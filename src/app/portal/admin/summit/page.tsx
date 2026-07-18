import { Clock, Users } from "lucide-react";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { ukDate, titleCase } from "@/lib/utils";
import { GlassCard, Badge, STATUS_TONE, Button, Avatar } from "@/components/ui";
import { PageFx } from "@/components/motion";
import { ReasonForm, InviteSummitForm, CreateSummitForm } from "@/components/forms";
import { confirmSlotAction } from "@/server/actions/staff";

export const dynamic = "force-dynamic";

export default async function SummitConsole() {
  const actor = await requireUser("approve_intent_waitlist");
  const invitableMembers = await db.user.findMany({
    where: { role: "MEMBER", status: "ACTIVE" }, orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const summits = await db.summit.findMany({
    include: {
      event: true,
      categories: {
        include: {
          applications: { include: { user: true }, orderBy: [{ status: "asc" }, { waitlistPos: "asc" }, { submittedAt: "asc" }] },
        },
      },
    },
    orderBy: { deadlineAt: "desc" },
  });

  return (
    <PageFx>
      <h1 className="font-display text-3xl text-ivory-50">Summit console</h1>
      <p className="mt-1.5 text-sm text-mist">Slot grids, intent letters, deadline and the waitlist — cancellations promote the next applicant automatically.</p>

      {actor.role === "ADMIN" && (
        <GlassCard className="mt-6 p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-mist">Create a new Summit</p>
          <CreateSummitForm />
        </GlassCard>
      )}

      {summits.map((s) => {
        const deadlinePassed = new Date() >= s.deadlineAt;
        return (
          <div key={s.id} className="mt-8">
            <GlassCard strong className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="font-display text-xl text-ivory-50">{s.event.name}</h2>
                  <Badge tone={STATUS_TONE[s.status] ?? "grey"}>{s.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-mist">{s.event.venue} · event {ukDate(s.event.startsAt)}</p>
              </div>
              <div className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm ${deadlinePassed ? "border-red-400/30 text-red-300" : "border-gold-500/30 text-gold-300"}`}>
                <Clock className="h-4 w-4" />
                {deadlinePassed ? `Closed ${ukDate(s.deadlineAt, true)}` : <>Deadline {ukDate(s.deadlineAt, true)} — auto-closes</>}
              </div>
            </GlassCard>

            <div className="mt-4 grid gap-4 xl:grid-cols-3">
              {s.categories.map((c) => {
                const confirmed = c.applications.filter((a) => a.status === "CONFIRMED").length;
                const waitlist = c.applications.filter((a) => ["WAITLISTED", "OFFERED"].includes(a.status));
                const pending = c.applications.filter((a) => a.status === "INTENT_SUBMITTED");
                return (
                  <GlassCard key={c.id} className="p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-lg text-ivory-50">{titleCase(c.kind)}</h3>
                      <Badge tone={confirmed >= c.capacity ? "red" : "green"}>
                        <Users className="h-3 w-3" /> {confirmed}/{c.capacity}
                      </Badge>
                    </div>
                    {/* Slot grid */}
                    <div className="mt-3 grid grid-cols-15 gap-1" style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}>
                      {Array.from({ length: c.capacity }).map((_, i) => (
                        <span key={i} className={`h-2.5 rounded-sm ${i < confirmed ? "bg-gradient-to-br from-gold-400 to-gold-600" : "bg-ink-700"}`} />
                      ))}
                    </div>

                    <div className="mt-5 space-y-3">
                      {c.applications.filter((a) => !["CANCELLED", "EXPIRED"].includes(a.status)).map((a) => (
                        <div key={a.id} className="rounded-xl border hairline bg-ink-800/40 p-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={a.user.name} className="h-7 w-7 text-[10px]" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-ivory-50">{a.user.name}</p>
                              <p className="truncate text-[11px] text-mist">{a.user.company ?? a.user.email}</p>
                            </div>
                            <Badge tone={STATUS_TONE[a.status] ?? "grey"} className="shrink-0">
                              {a.status === "WAITLISTED" ? `WL #${a.waitlistPos}` : titleCase(a.status)}
                            </Badge>
                          </div>
                          {(a.status === "INTENT_SUBMITTED" || a.status === "WAITLISTED") && (
                            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                              {a.intentLetterPath && (
                                <a href={`/api/files/${a.intentLetterPath}`} className="text-xs text-gold-300 underline underline-offset-2">Intent letter</a>
                              )}
                              <form action={confirmSlotAction}>
                                <input type="hidden" name="applicationId" value={a.id} />
                                <Button size="sm">Confirm slot</Button>
                              </form>
                            </div>
                          )}
                          {a.status === "CONFIRMED" && (
                            <div className="mt-2.5">
                              <ReasonForm action="cancelSlot" hiddenFields={{ applicationId: a.id }}
                                label="Cancellation reason" cta="Cancel (promotes next)" variant="danger" placeholder="e.g. member withdrew" />
                            </div>
                          )}
                          {a.status === "OFFERED" && (
                            <p className="mt-2 text-[11px] text-violet-300">Offer expires {ukDate(a.offerExpiresAt, true)}</p>
                          )}
                        </div>
                      ))}
                      {pending.length === 0 && waitlist.length === 0 && confirmed === 0 && (
                        <p className="text-xs text-mist">No applications yet.</p>
                      )}
                    </div>

                    {s.status === "OPEN" && !deadlinePassed && (
                      <div className="mt-4 border-t hairline pt-4">
                        <InviteSummitForm categoryId={c.id} members={invitableMembers} />
                      </div>
                    )}
                  </GlassCard>
                );
              })}
            </div>
          </div>
        );
      })}
    </PageFx>
  );
}
