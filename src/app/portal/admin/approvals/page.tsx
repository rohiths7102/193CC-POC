import { Newspaper, Clapperboard } from "lucide-react";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { ukDate, titleCase } from "@/lib/utils";
import { GlassCard, Badge, STATUS_TONE, Button, inputCls, Empty } from "@/components/ui";
import { PageFx } from "@/components/motion";
import { reviewArticleAction, advanceVideoAction } from "@/server/actions/staff";

export const dynamic = "force-dynamic";

const VIDEO_NEXT: Record<string, { status: string; label: string }> = {
  BRIEF_SUBMITTED: { status: "SCHEDULED", label: "Schedule shoot" },
  SCHEDULED: { status: "IN_PRODUCTION", label: "Start production" },
  IN_PRODUCTION: { status: "DELIVERED", label: "Mark delivered" },
  DELIVERED: { status: "PUBLISHED", label: "Publish" },
};

export default async function Approvals() {
  await requireUser("approve_publish_content");
  const [articles, videos] = await Promise.all([
    db.article.findMany({
      where: { status: { in: ["SUBMITTED", "IN_REVIEW", "CHANGES_REQUESTED", "APPROVED"] } },
      include: { member: true }, orderBy: { updatedAt: "desc" },
    }),
    db.videoTask.findMany({
      where: { status: { not: "PUBLISHED" } },
      include: { member: true }, orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <PageFx>
      <h1 className="font-display text-3xl text-ivory-50">Content approvals</h1>
      <p className="mt-1.5 text-sm text-mist">Nothing publishes to the public site without an administrator decision — every action is audited and the member is notified.</p>

      <h2 className="mt-8 flex items-center gap-2 font-display text-xl text-ivory-50"><Newspaper className="h-5 w-5 text-gold-400" /> Articles</h2>
      <div className="mt-4 space-y-4">
        {articles.length === 0 && <Empty title="No articles awaiting review" />}
        {articles.map((a) => (
          <GlassCard key={a.id} className="p-6">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-display text-lg text-ivory-50">{a.title}</h3>
              <Badge tone={STATUS_TONE[a.status] ?? "grey"}>{titleCase(a.status)}</Badge>
              <span className="text-xs text-mist">by {a.member.name} · {a.wordCount.toLocaleString()} words · {ukDate(a.updatedAt, true)}</span>
            </div>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-ivory-200/75">{a.body}</p>
            <form action={reviewArticleAction} className="mt-5 flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={a.id} />
              <label className="block flex-1 min-w-56">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-mist">Reviewer note (sent to member)</span>
                <input name="note" className={inputCls} placeholder="Optional…" />
              </label>
              {a.status !== "APPROVED" ? (
                <>
                  <Button size="sm" name="decision" value="CHANGES_REQUESTED" variant="danger">Request changes</Button>
                  <Button size="sm" name="decision" value="APPROVED" variant="ghost">Approve</Button>
                </>
              ) : (
                <Button size="sm" name="decision" value="PUBLISHED">Publish to website</Button>
              )}
            </form>
          </GlassCard>
        ))}
      </div>

      <h2 className="mt-10 flex items-center gap-2 font-display text-xl text-ivory-50"><Clapperboard className="h-5 w-5 text-gold-400" /> Branding video pipeline</h2>
      <div className="mt-4 space-y-4">
        {videos.length === 0 && <Empty title="No videos in production" />}
        {videos.map((v) => {
          const next = VIDEO_NEXT[v.status];
          return (
            <GlassCard key={v.id} className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <Badge tone={STATUS_TONE[v.status] ?? "grey"}>{titleCase(v.status)}</Badge>
                  <span className="text-sm text-ivory-50">{v.member.name}</span>
                  <span className="text-xs text-mist">{v.member.company}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-ivory-200/75">{v.brief}</p>
              </div>
              {next && (
                <form action={advanceVideoAction} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={v.id} />
                  <input type="hidden" name="status" value={next.status} />
                  {next.status === "SCHEDULED" && (
                    <label className="block">
                      <span className="mb-1 block text-[10px] uppercase tracking-widest text-mist">Shoot date</span>
                      <input name="shootDate" type="date" required className={inputCls} />
                    </label>
                  )}
                  {next.status === "DELIVERED" && (
                    <label className="block">
                      <span className="mb-1 block text-[10px] uppercase tracking-widest text-mist">Final asset</span>
                      <input name="asset" type="file" className="block text-xs text-mist file:mr-3 file:rounded-full file:border-0 file:bg-gold-500/20 file:px-3 file:py-1.5 file:text-xs file:text-gold-300" />
                    </label>
                  )}
                  <Button size="sm" variant="ghost">{next.label} →</Button>
                </form>
              )}
            </GlassCard>
          );
        })}
      </div>
    </PageFx>
  );
}
