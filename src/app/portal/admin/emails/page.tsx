import { Mail } from "lucide-react";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { ukDate } from "@/lib/utils";
import { GlassCard, DemoTag } from "@/components/ui";
import { PageFx } from "@/components/motion";

export const dynamic = "force-dynamic";

export default async function EmailLog() {
  await requireUser("configure_system");
  const emails = await db.emailOutbox.findMany({ orderBy: { createdAt: "desc" }, take: 60 });

  return (
    <PageFx>
      <div className="flex items-center gap-3">
        <h1 className="font-display text-3xl text-ivory-50">Email log</h1>
        <DemoTag>Demo outbox — swap to Postmark at go-live</DemoTag>
      </div>
      <p className="mt-1.5 text-sm text-mist">Every notification the platform sends: contracts, payments, unlocks, deadlines, waitlist promotions.</p>
      <div className="mt-6 space-y-3">
        {emails.map((e) => (
          <GlassCard key={e.id} className="p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-lg bg-gold-500/12 p-2 text-gold-400"><Mail className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ivory-50">{e.subject}</p>
                <p className="text-xs text-mist">to {e.toEmail} · {ukDate(e.createdAt, true)}</p>
              </div>
            </div>
            <p className="mt-3 border-t hairline pt-3 text-sm leading-6 text-ivory-200/75">{e.body}</p>
          </GlassCard>
        ))}
      </div>
    </PageFx>
  );
}
