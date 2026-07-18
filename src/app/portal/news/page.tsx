import { Newspaper, CalendarDays } from "lucide-react";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { resolveEntitlements } from "@/server/entitlements";
import { ukDate } from "@/lib/utils";
import { GlassCard, Badge, Empty, Avatar } from "@/components/ui";
import { PageFx, Stagger, StaggerItem } from "@/components/motion";

export const dynamic = "force-dynamic";

/** The News & networking area — the `networking_news` entitlement made real.
 *  Published member articles are the news feed (giving PUBLISHED a real destination),
 *  alongside the events calendar. */
export default async function NewsPage() {
  const user = await requireUser("view_own_dashboard");
  const ent = await resolveEntitlements(user.id);
  if (!ent.has("networking_news")) {
    return <PageFx><Empty title="News & networking is not included in your current membership" /></PageFx>;
  }

  const [articles, events] = await Promise.all([
    db.article.findMany({
      where: { status: "PUBLISHED" },
      include: { member: true },
      orderBy: { publishedAt: "desc" },
    }),
    db.event.findMany({ where: { startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } }),
  ]);

  return (
    <PageFx>
      <h1 className="font-display text-3xl text-ivory-50">News & networking</h1>
      <p className="mt-1.5 text-sm text-mist">Member stories published by the Consortium, and everything coming up in the calendar.</p>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          {articles.length === 0 && <Empty title="No member stories published yet" sub="Approved enterprise articles appear here the moment an administrator publishes them." />}
          <Stagger className="space-y-5">
            {articles.map((a) => (
              <StaggerItem key={a.id}>
                <GlassCard className="p-7">
                  <div className="flex items-center gap-3">
                    <Avatar name={a.member.company ?? a.member.name} />
                    <div>
                      <p className="text-xs uppercase tracking-widest text-gold-400">{a.member.company ?? a.member.name}</p>
                      <h2 className="font-display text-xl text-ivory-50">{a.title}</h2>
                    </div>
                    <span className="ml-auto text-xs text-mist">{ukDate(a.publishedAt)}</span>
                  </div>
                  <p className="mt-4 line-clamp-4 text-sm leading-7 text-ivory-200/85">{a.body}</p>
                </GlassCard>
              </StaggerItem>
            ))}
          </Stagger>
        </div>

        <GlassCard className="h-fit p-6">
          <div className="flex items-center gap-2.5">
            <CalendarDays className="h-5 w-5 text-gold-400" />
            <h2 className="font-display text-lg text-ivory-50">Calendar</h2>
          </div>
          <ul className="mt-5 space-y-4">
            {events.map((e) => (
              <li key={e.id} className="rounded-xl border hairline bg-ink-800/40 p-4">
                <Badge tone={e.kind === "MAIN_EVENT" ? "gold" : "blue"}>{e.kind === "MAIN_EVENT" ? "Major Event" : "Summit"}</Badge>
                <p className="mt-2 text-sm font-medium text-ivory-50">{e.name}</p>
                <p className="text-xs text-mist">{e.venue}</p>
                <p className="mt-1 text-xs text-gold-300">{ukDate(e.startsAt, true)}</p>
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>
    </PageFx>
  );
}
