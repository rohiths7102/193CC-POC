import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { ukDate, titleCase } from "@/lib/utils";
import { GlassCard, Badge, STATUS_TONE, Empty } from "@/components/ui";
import { PageFx } from "@/components/motion";

export const dynamic = "force-dynamic";

export default async function ConsultantArticles() {
  const consultant = await requireUser("submit_edit_content");
  // Consultants see drafts of their assigned members only; publishing stays admin-gated.
  const assigned = await db.mentorAssignment.findMany({
    where: { mentorId: consultant.id, active: true }, select: { memberId: true },
  });
  const articles = await db.article.findMany({
    where: { memberId: { in: assigned.map((a) => a.memberId) } },
    include: { member: true }, orderBy: { updatedAt: "desc" },
  });

  return (
    <PageFx>
      <h1 className="font-display text-3xl text-ivory-50">Article drafts</h1>
      <p className="mt-1.5 text-sm text-mist">Co-author enterprise articles for your assigned members. Administrator approval is always required before anything publishes.</p>

      {articles.length === 0 && <div className="mt-8"><Empty title="No drafts from your members yet" /></div>}

      <div className="mt-8 space-y-4">
        {articles.map((a) => (
          <GlassCard key={a.id} className="p-6">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-lg text-ivory-50">{a.title}</h2>
              <Badge tone={STATUS_TONE[a.status] ?? "grey"}>{titleCase(a.status)}</Badge>
              <span className="text-xs text-mist">{a.member.name} · {a.wordCount.toLocaleString()} words · updated {ukDate(a.updatedAt)}</span>
            </div>
            <p className="mt-3 line-clamp-4 text-sm leading-6 text-ivory-200/75">{a.body}</p>
          </GlassCard>
        ))}
      </div>
    </PageFx>
  );
}
