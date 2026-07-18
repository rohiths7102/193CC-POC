import Link from "next/link";
import { Globe, Award, ExternalLink } from "lucide-react";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { resolveEntitlements } from "@/server/entitlements";
import { titleCase } from "@/lib/utils";
import { GlassCard, Badge, Empty } from "@/components/ui";
import { PageFx } from "@/components/motion";
import { ProfileForm } from "@/components/forms";
import { appUrl } from "@/lib/app-url";
import { ShareTools } from "@/components/share-tools";

export const dynamic = "force-dynamic";

/** Member-side editor for the public profile (Enterprise benefit):
 *  logo, photo, bio, shareable link, visibility toggle — and a live view of
 *  the award status that the public page will display. */
export default async function MyProfile() {
  const user = await requireUser("view_own_dashboard");
  const ent = await resolveEntitlements(user.id);

  if (!ent.has("investor_visibility")) {
    return (
      <PageFx>
        <h1 className="font-display text-3xl text-ivory-50">Public profile</h1>
        <div className="mt-8"><Empty title="The public profile is an Enterprise benefit" sub="Upgrade to Enterprise Standard or Investor Ready to publish your organisation's page." /></div>
      </PageFx>
    );
  }

  const me = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  const awardApp = await db.slotApplication.findFirst({
    where: {
      userId: user.id,
      category: { kind: "AWARD" },
      status: { notIn: ["CANCELLED", "EXPIRED"] },
    },
    include: { category: { include: { summit: { include: { event: true } } } } },
  });

  const link = me.profileSlug ? `/profile/${me.profileSlug}` : null;

  return (
    <PageFx>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ivory-50">Public profile</h1>
          <p className="mt-1.5 text-sm text-mist">Your shareable page — logo, photo, bio and your live award status. You control whether it's public.</p>
        </div>
        {link && me.profilePublic && (
          <Link href={link} target="_blank"
            className="inline-flex items-center gap-2 rounded-full border border-gold-500/30 px-5 py-2 text-sm text-gold-300 hover:bg-gold-500/10">
            <ExternalLink className="h-4 w-4" /> View my public page
          </Link>
        )}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <GlassCard strong className="p-7">
          <div className="mb-5 flex items-center gap-2.5">
            <Globe className="h-5 w-5 text-gold-400" />
            <h2 className="font-display text-xl text-ivory-50">Profile details</h2>
            {me.profilePublic
              ? <Badge tone="green">Public</Badge>
              : <Badge tone="grey">Hidden</Badge>}
          </div>
          <ProfileForm profile={{
            slug: me.profileSlug, bio: me.profileBio, isPublic: me.profilePublic,
            hasLogo: Boolean(me.logoPath), hasPhoto: Boolean(me.photoPath),
          }} />
          {link && (
            <p className="mt-4 rounded-xl border hairline bg-ink-800/40 px-4 py-3 text-xs text-mist">
              Your link: <span className="font-mono text-gold-300">{`${appUrl()}${link}`}</span>
              {!me.profilePublic && <> — currently hidden; tick "Make my profile public" to go live.</>}
            </p>
          )}
        </GlassCard>

        <div className="space-y-6">
        {link && me.profilePublic && (
          <ShareTools
            url={`${appUrl()}${link}`}
            name={me.company ?? me.name}
          />
        )}
        <GlassCard className="h-fit p-7">
          <div className="flex items-center gap-2.5">
            <Award className="h-5 w-5 text-gold-400" />
            <h2 className="font-display text-lg text-ivory-50">Award status</h2>
          </div>
          {awardApp ? (
            <div className="mt-4">
              <Badge tone={awardApp.status === "CONFIRMED" ? "gold" : "purple"}>
                {awardApp.status === "CONFIRMED" ? "Business Award — Confirmed" : `Business Award — ${titleCase(awardApp.status)}`}
              </Badge>
              <p className="mt-3 text-sm leading-6 text-mist">
                {awardApp.category.summit.event.name}. This is pulled live from the Summit — it appears on your public
                page automatically and cannot be self-declared.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-mist">
              No Business Award nomination yet. When the organising team nominates you for a Summit Business Award,
              it will show here and on your public page automatically.
            </p>
          )}
        </GlassCard>
        </div>
      </div>
    </PageFx>
  );
}
