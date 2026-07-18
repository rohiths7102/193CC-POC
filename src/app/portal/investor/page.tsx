import { Eye } from "lucide-react";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { ukDate } from "@/lib/utils";
import { GlassCard, Badge, Avatar, Empty } from "@/components/ui";
import { PageFx, Stagger, StaggerItem } from "@/components/motion";
import { InterestForm } from "@/components/forms";

export const dynamic = "force-dynamic";

export default async function InvestorDealflow() {
  const investor = await requireUser("view_dealflow");
  // Consent scoping: ONLY pitches whose member explicitly opted in are visible.
  const pitches = await db.pitch.findMany({
    where: { visibilityConsent: true },
    include: { member: true, interests: { where: { investorId: investor.id } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <PageFx>
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-gold-500/12 p-2.5 text-gold-400"><Eye className="h-5 w-5" /></span>
        <div>
          <h1 className="font-display text-3xl text-ivory-50">Deal-flow</h1>
          <p className="mt-1 text-sm text-mist">Enterprise opportunities shared with investor consent, ahead of the Summit. Payment and contact data are never exposed here.</p>
        </div>
      </div>

      {pitches.length === 0 && <div className="mt-8"><Empty title="No consented opportunities yet" /></div>}

      <Stagger className="mt-8 grid gap-5 lg:grid-cols-2">
        {pitches.map((p) => (
          <StaggerItem key={p.id}>
            <GlassCard strong className="flex h-full flex-col p-7">
              <div className="flex items-center gap-3">
                <Avatar name={p.member.company ?? p.member.name} />
                <div>
                  <p className="font-display text-lg text-ivory-50">{p.title}</p>
                  <p className="text-xs text-mist">{p.member.company ?? p.member.name} · shared {ukDate(p.createdAt)}</p>
                </div>
                {p.interests.length > 0 && <Badge tone="green" className="ml-auto">Interest recorded</Badge>}
              </div>
              <p className="mt-4 flex-1 text-sm leading-7 text-ivory-200/85">{p.summary}</p>
              {((p.materials as string[]) ?? []).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(p.materials as string[]).map((m, i) => (
                    <a key={m} href={`/api/files/${m}`} className="rounded-full border border-gold-500/30 px-3 py-1 text-xs text-gold-300 hover:bg-gold-500/10">
                      Material {i + 1}
                    </a>
                  ))}
                </div>
              )}
              <div className="mt-5 border-t hairline pt-5">
                <InterestForm pitchId={p.id} existingNote={p.interests[0]?.note} />
              </div>
            </GlassCard>
          </StaggerItem>
        ))}
      </Stagger>
    </PageFx>
  );
}
