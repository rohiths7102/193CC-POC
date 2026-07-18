import { Handshake, Eye, EyeOff } from "lucide-react";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { resolveEntitlements } from "@/server/entitlements";
import { ukDate } from "@/lib/utils";
import { GlassCard, Badge, Empty, Avatar } from "@/components/ui";
import { PageFx } from "@/components/motion";
import { PitchForm } from "@/components/forms";

export const dynamic = "force-dynamic";

export default async function PitchPage() {
  const user = await requireUser("view_own_dashboard");
  const ent = await resolveEntitlements(user.id);
  const pitches = await db.pitch.findMany({
    where: { memberId: user.id },
    include: { interests: { include: { investor: true } } },
    orderBy: { createdAt: "desc" },
  });
  const latest = pitches[0] ?? null;

  return (
    <PageFx>
      <h1 className="font-display text-3xl text-ivory-50">Investor pitch</h1>
      <p className="mt-1.5 text-sm text-mist">
        Your opportunity is visible to accredited investors <strong className="text-ivory-100">only with your explicit consent</strong> — withdraw it any time.
      </p>

      {!ent.has("investor_visibility") ? (
        <div className="mt-8"><Empty title="Investor visibility is an Enterprise benefit" sub="Upgrade to put your opportunity in front of the investor panel before the Summit." /></div>
      ) : (
        <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <GlassCard strong className="p-7">
            <div className="flex items-center gap-2.5">
              <Handshake className="h-5 w-5 text-gold-400" />
              <h2 className="font-display text-xl text-ivory-50">Your opportunity</h2>
              {latest && (
                latest.visibilityConsent
                  ? <Badge tone="green"><Eye className="h-3 w-3" /> Visible to investors</Badge>
                  : <Badge tone="grey"><EyeOff className="h-3 w-3" /> Hidden</Badge>
              )}
            </div>
            <div className="mt-6"><PitchForm pitch={latest} /></div>
          </GlassCard>

          <GlassCard className="p-7">
            <h2 className="font-display text-lg text-ivory-50">Investor interest</h2>
            {latest && latest.interests.length > 0 ? (
              <ul className="mt-5 space-y-4">
                {latest.interests.map((i) => (
                  <li key={i.id} className="flex gap-3 rounded-xl border hairline bg-ink-800/40 p-4">
                    <Avatar name={i.investor.name} />
                    <div>
                      <p className="text-sm font-medium text-ivory-50">{i.investor.name}</p>
                      <p className="mt-0.5 text-xs text-mist">{ukDate(i.createdAt, true)}</p>
                      {i.note && <p className="mt-2 text-sm text-ivory-200/85">"{i.note}"</p>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-mist">No expressions of interest yet. Interest appears here the moment an investor responds.</p>
            )}
          </GlassCard>
        </div>
      )}
    </PageFx>
  );
}
