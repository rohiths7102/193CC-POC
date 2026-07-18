import { Handshake, Eye, EyeOff } from "lucide-react";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { ukDate } from "@/lib/utils";
import { GlassCard, Badge, Avatar, Empty } from "@/components/ui";
import { PageFx } from "@/components/motion";

export const dynamic = "force-dynamic";

/** §5.6 — investor browsing/interest activity, visible to Administrators
 *  for Summit-day coordination. */
export default async function AdminDealflow() {
  await requireUser("view_dealflow");
  const pitches = await db.pitch.findMany({
    include: { member: true, interests: { include: { investor: true }, orderBy: { createdAt: "desc" } } },
    orderBy: { createdAt: "desc" },
  });
  const totalInterests = pitches.reduce((s, p) => s + p.interests.length, 0);

  return (
    <PageFx>
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-gold-500/12 p-2.5 text-gold-400"><Handshake className="h-5 w-5" /></span>
        <div>
          <h1 className="font-display text-3xl text-ivory-50">Deal-flow coordination</h1>
          <p className="mt-1 text-sm text-mist">{pitches.length} opportunities · {totalInterests} expressions of interest — matchmaking view for Summit day.</p>
        </div>
      </div>

      {pitches.length === 0 && <div className="mt-8"><Empty title="No opportunities submitted yet" /></div>}

      <div className="mt-8 space-y-5">
        {pitches.map((p) => (
          <GlassCard key={p.id} className="p-6">
            <div className="flex flex-wrap items-center gap-3">
              <Avatar name={p.member.company ?? p.member.name} />
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg text-ivory-50">{p.title}</p>
                <p className="text-xs text-mist">{p.member.company ?? p.member.name} · {p.member.email} · {ukDate(p.createdAt)}</p>
              </div>
              {p.visibilityConsent
                ? <Badge tone="green"><Eye className="h-3 w-3" /> Investor-visible</Badge>
                : <Badge tone="grey"><EyeOff className="h-3 w-3" /> Consent withheld</Badge>}
            </div>
            <p className="mt-3 text-sm leading-6 text-ivory-200/80">{p.summary}</p>
            {p.interests.length > 0 && (
              <div className="mt-4 border-t hairline pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-mist">Investor interest</p>
                <ul className="space-y-2">
                  {p.interests.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-ivory-100">{i.investor.name}</span>
                      <span className="text-xs text-mist">{ukDate(i.createdAt, true)}</span>
                      {i.note && <span className="italic text-mist">"{i.note}"</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </GlassCard>
        ))}
      </div>
    </PageFx>
  );
}
