import { Landmark, Clock, CheckCircle2 } from "lucide-react";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { resolveEntitlements } from "@/server/entitlements";
import { ukDate, titleCase } from "@/lib/utils";
import { GlassCard, Badge, STATUS_TONE, Empty, Button } from "@/components/ui";
import { PageFx } from "@/components/motion";
import { IntentUploadForm } from "@/components/forms";
import { acceptOfferAction } from "@/server/actions/member";

export const dynamic = "force-dynamic";

export default async function SummitPage() {
  const user = await requireUser("book_manage_summit");
  const ent = await resolveEntitlements(user.id);
  const apps = await db.slotApplication.findMany({
    where: { userId: user.id },
    include: { category: { include: { summit: { include: { event: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <PageFx>
      <h1 className="font-display text-3xl text-ivory-50">UK Investors Summit</h1>
      <p className="mt-1.5 text-sm text-mist">
        Intent letters, deadlines and slot status — the process that used to run over email, now live.
      </p>

      {!ent.has("summit_slot") && (
        <div className="mt-8"><Empty title="Summit access is an Enterprise / Temporary benefit" sub="Upgrade your membership to pitch, launch or receive an award at the Summit." /></div>
      )}

      {apps.map((a) => {
        const s = a.category.summit;
        const deadlinePassed = new Date() >= s.deadlineAt || s.status !== "OPEN";
        return (
          <GlassCard key={a.id} strong className="mt-8 p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <Landmark className="h-5 w-5 text-gold-400" />
                  <h2 className="font-display text-xl text-ivory-50">{s.event.name}</h2>
                  <Badge tone={STATUS_TONE[a.status] ?? "grey"}>{titleCase(a.status)}</Badge>
                </div>
                <p className="mt-1.5 text-sm text-mist">
                  {titleCase(a.category.kind)} category · event {ukDate(s.event.startsAt)} · {s.event.venue}
                </p>
              </div>
              <div className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm ${deadlinePassed ? "border-red-400/30 text-red-300" : "border-gold-500/30 text-gold-300"}`}>
                <Clock className="h-4 w-4" />
                {deadlinePassed ? "Submissions closed" : <>Deadline {ukDate(s.deadlineAt, true)}</>}
              </div>
            </div>

            <div className="mt-6">
              {a.status === "INVITED" && !deadlinePassed && (
                <div className="rounded-xl border hairline bg-ink-800/40 p-5">
                  <p className="mb-1 text-sm text-ivory-100">You're pre-accepted — upload your signed intent letter to secure your place.</p>
                  <p className="mb-4 text-xs text-mist">The system closes submissions automatically at the deadline. If the category fills, you'll join the waitlist and be promoted automatically on any cancellation.</p>
                  <IntentUploadForm applicationId={a.id} />
                </div>
              )}
              {a.status === "INVITED" && deadlinePassed && (
                <p className="text-sm text-red-300">The deadline has passed — this invitation has expired.</p>
              )}
              {a.status === "INTENT_SUBMITTED" && (
                <p className="flex items-center gap-2 text-sm text-mist">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Intent letter received {ukDate(a.submittedAt, true)}. The organising team will confirm your slot — you'll be emailed either way.
                </p>
              )}
              {a.status === "CONFIRMED" && (
                <p className="flex items-center gap-2 text-sm text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> Your slot is confirmed. Event-day details follow by email.
                </p>
              )}
              {a.status === "WAITLISTED" && (
                <p className="text-sm text-mist">
                  You are <strong className="text-violet-300">#{a.waitlistPos}</strong> on the waitlist. Cancellations promote automatically — no need to chase.
                </p>
              )}
              {a.status === "OFFERED" && (
                <div className="rounded-xl border border-violet-400/40 bg-violet-500/10 p-5">
                  <p className="text-sm text-ivory-100">A slot opened up! Accept before <strong className="text-violet-300">{ukDate(a.offerExpiresAt, true)}</strong> or it passes to the next applicant.</p>
                  <form action={acceptOfferAction} className="mt-3">
                    <input type="hidden" name="applicationId" value={a.id} />
                    <Button size="sm">Accept my slot</Button>
                  </form>
                </div>
              )}
            </div>
          </GlassCard>
        );
      })}

      {ent.has("summit_slot") && apps.length === 0 && (
        <div className="mt-8"><Empty title="No Summit invitations yet" sub="When the organising team invites you to a category, it appears here with the intent-letter upload." /></div>
      )}
    </PageFx>
  );
}
