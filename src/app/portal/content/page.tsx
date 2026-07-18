import { Newspaper, Clapperboard } from "lucide-react";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { resolveEntitlements } from "@/server/entitlements";
import { ukDate, titleCase } from "@/lib/utils";
import { GlassCard, Badge, STATUS_TONE, Empty } from "@/components/ui";
import { PageFx } from "@/components/motion";
import { ArticleEditor, VideoBriefForm } from "@/components/forms";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const user = await requireUser("submit_edit_content");
  const ent = await resolveEntitlements(user.id);
  const [articles, videos] = await Promise.all([
    db.article.findMany({ where: { memberId: user.id }, orderBy: { createdAt: "desc" } }),
    db.videoTask.findMany({ where: { memberId: user.id }, orderBy: { createdAt: "desc" } }),
  ]);
  const latest = articles[0] ?? null;

  return (
    <PageFx>
      <h1 className="font-display text-3xl text-ivory-50">Article & branding video</h1>
      <p className="mt-1.5 text-sm text-mist">Enterprise publishing benefits — reviewed and approved before anything goes public.</p>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <GlassCard strong className="p-7">
          <div className="flex items-center gap-2.5">
            <Newspaper className="h-5 w-5 text-gold-400" />
            <h2 className="font-display text-xl text-ivory-50">Website article</h2>
            {latest && <Badge tone={STATUS_TONE[latest.status] ?? "grey"}>{titleCase(latest.status)}</Badge>}
          </div>
          {ent.has("article") ? (
            <div className="mt-6">
              {latest?.reviewNote && latest.status === "CHANGES_REQUESTED" && (
                <p className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  Reviewer: {latest.reviewNote}
                </p>
              )}
              <ArticleEditor article={latest} maxWords={ent.articleMaxWords} />
            </div>
          ) : (
            <p className="mt-5 text-sm text-mist">The website article is an Enterprise benefit.</p>
          )}
        </GlassCard>

        <div className="space-y-6">
          <GlassCard className="p-7">
            <div className="flex items-center gap-2.5">
              <Clapperboard className="h-5 w-5 text-gold-400" />
              <h2 className="font-display text-xl text-ivory-50">Branding video</h2>
            </div>
            {ent.has("branding_video") ? (
              <>
                {videos.length > 0 && (
                  <ol className="mt-5 space-y-3">
                    {videos.map((v) => (
                      <li key={v.id} className="rounded-xl border hairline bg-ink-800/40 p-4">
                        <div className="flex items-center justify-between">
                          <Badge tone={STATUS_TONE[v.status] ?? "grey"}>{titleCase(v.status)}</Badge>
                          <span className="text-xs text-mist">{ukDate(v.createdAt)}</span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-ivory-200/85">{v.brief}</p>
                        {v.shootDate && <p className="mt-1 text-xs text-gold-300">Shoot: {ukDate(v.shootDate)}</p>}
                      </li>
                    ))}
                  </ol>
                )}
                <div className="mt-5 border-t hairline pt-5">
                  <VideoBriefForm />
                </div>
              </>
            ) : (
              <p className="mt-5 text-sm text-mist">The branding video is an Enterprise benefit.</p>
            )}
          </GlassCard>

          {articles.length > 1 && (
            <GlassCard className="p-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-mist">Previous submissions</p>
              <ul className="space-y-2">
                {articles.slice(1).map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-sm">
                    <span className="truncate text-ivory-200/85">{a.title}</span>
                    <Badge tone={STATUS_TONE[a.status] ?? "grey"}>{titleCase(a.status)}</Badge>
                  </li>
                ))}
              </ul>
            </GlassCard>
          )}
        </div>
      </div>
    </PageFx>
  );
}
