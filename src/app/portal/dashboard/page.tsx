import Link from "next/link";
import { ArrowRight, Crown, Landmark, CalendarClock, PenSquare, Newspaper, Lock } from "lucide-react";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { resolveEntitlements } from "@/server/entitlements";
import { thresholdProgress } from "@/server/wallet";
import { gbp, ukDate } from "@/lib/utils";
import { GlassCard, Badge, LinkButton, Stat } from "@/components/ui";
import { PageFx, ProgressRing, Stagger, StaggerItem } from "@/components/motion";
import { BookEventForm } from "@/components/forms";

export const dynamic = "force-dynamic";

export default async function MemberDashboard() {
  const user = await requireUser("view_own_dashboard");
  const [ent, wallet, memberships, upcoming, sessionsThisMonth, nextMainEvent] = await Promise.all([
    resolveEntitlements(user.id),
    thresholdProgress(user.id),
    db.membership.findMany({
      where: { userId: user.id }, include: { product: true }, orderBy: { createdAt: "desc" },
    }),
    db.event.findMany({ where: { startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, take: 3 }),
    db.mentoringSession.aggregate({
      where: {
        assignment: { memberId: user.id },
        scheduledAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        status: { in: ["BOOKED", "DELIVERED"] },
      },
      _sum: { durationMin: true },
    }),
    db.event.findFirst({ where: { kind: "MAIN_EVENT", startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } }),
  ]);
  const mainEventReg = nextMainEvent
    ? await db.eventRegistration.findUnique({
        where: { eventId_userId: { eventId: nextMainEvent.id, userId: user.id } },
      })
    : null;

  const usedH = (sessionsThisMonth._sum.durationMin ?? 0) / 60;
  const active = memberships.filter((m) => m.status === "ACTIVE");
  const majorUnlocked = ent.has("main_event_delegate");

  return (
    <PageFx>
      <h1 className="font-display text-3xl text-ivory-50">
        Good to see you, <span className="text-gold-grad">{user.name.split(" ")[0]}</span>
      </h1>
      <p className="mt-1.5 text-sm text-mist">
        {active.length ? active.map((m) => m.product.name).join(" + ") : "No active membership"} · everything below is driven by your live entitlements.
      </p>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Wallet card */}
        <GlassCard strong className="flex flex-col items-center gap-8 p-8 sm:flex-row">
          <ProgressRing
            fraction={wallet.unlocked ? 1 : wallet.balance / wallet.threshold}
            label={gbp(wallet.balance)}
            sublabel={wallet.unlocked ? "Threshold met" : `of ${gbp(wallet.threshold)}`}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2.5">
              <Crown className="h-5 w-5 text-gold-400" />
              <h2 className="font-display text-xl text-ivory-50">Major Event credit wallet</h2>
            </div>
            {majorUnlocked ? (
              <>
                <p className="mt-3 text-sm leading-6 text-mist">
                  The <strong className="text-ivory-100">House of Lords Major Event</strong> benefit is
                  <Badge tone="green" className="mx-1.5">unlocked</Badge>
                  {wallet.unlocked ? "— your credited payments crossed the threshold." : "on your membership tier."}
                </p>
                {nextMainEvent && (
                  mainEventReg?.status === "CONFIRMED" ? (
                    <p className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300">
                      ✓ Delegate place confirmed — {nextMainEvent.name}, {ukDate(nextMainEvent.startsAt)}
                    </p>
                  ) : (
                    <BookEventForm eventId={nextMainEvent.id} />
                  )
                )}
              </>
            ) : (
              <p className="mt-3 text-sm leading-6 text-mist">
                Every payment on qualifying memberships credits this wallet.
                <strong className="text-gold-300"> {gbp(wallet.remaining)} more</strong> unlocks the Major Event automatically — no forms, no waiting.
              </p>
            )}
          </div>
        </GlassCard>

        {/* Mentoring quick view */}
        <GlassCard className="p-7">
          <div className="flex items-center gap-2.5">
            <CalendarClock className="h-5 w-5 text-gold-400" />
            <h2 className="font-display text-lg text-ivory-50">Mentoring this month</h2>
          </div>
          {ent.mentoringHours > 0 ? (
            <>
              <p className="mt-4 font-display text-4xl text-ivory-50">
                {usedH}<span className="text-xl text-mist"> / {ent.mentoringHours} hrs</span>
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-700">
                <div className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-600 transition-all"
                  style={{ width: `${Math.min(100, (usedH / ent.mentoringHours) * 100)}%` }} />
              </div>
              <LinkButton href="/portal/mentoring" variant="ghost" size="sm" className="mt-5">Book a session</LinkButton>
            </>
          ) : (
            <p className="mt-4 text-sm text-mist">Your tier does not include mentoring hours.</p>
          )}
        </GlassCard>
      </div>

      {/* Benefit tiles — entitlement-driven, locked tiles shown honestly */}
      <Stagger className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { key: "summit_slot", icon: <Landmark className="h-4 w-4" />, t: "UK Investors Summit", d: "Slot booking & intent letters", href: "/portal/summit" },
          { key: "article", icon: <Newspaper className="h-4 w-4" />, t: "Website article", d: "1,400 words + 2 HD images", href: "/portal/content" },
          { key: "branding_video", icon: <PenSquare className="h-4 w-4" />, t: "Branding video", d: "Consortium CXO feature", href: "/portal/content" },
          { key: "investor_visibility", icon: <Crown className="h-4 w-4" />, t: "Investor pitch", d: "Consented deal-flow visibility", href: "/portal/pitch" },
        ].map((b) => {
          const has = ent.has(b.key);
          return (
            <StaggerItem key={b.key}>
              {has ? (
                <Link href={b.href}>
                  <GlassCard className="group h-full p-5 transition-colors hover:border-gold-500/50">
                    <span className="inline-flex rounded-lg bg-gold-500/12 p-2 text-gold-400">{b.icon}</span>
                    <p className="mt-3 font-medium text-ivory-50">{b.t}</p>
                    <p className="mt-1 text-xs text-mist">{b.d}</p>
                    <p className="mt-3 flex items-center gap-1 text-xs text-gold-400 opacity-0 transition-opacity group-hover:opacity-100">Open <ArrowRight className="h-3 w-3" /></p>
                  </GlassCard>
                </Link>
              ) : (
                <GlassCard className="h-full p-5 opacity-50">
                  <span className="inline-flex rounded-lg bg-ink-700 p-2 text-mist"><Lock className="h-4 w-4" /></span>
                  <p className="mt-3 font-medium text-ivory-200">{b.t}</p>
                  <p className="mt-1 text-xs text-mist">Not included in your tier — upgrade to unlock.</p>
                </GlassCard>
              )}
            </StaggerItem>
          );
        })}
      </Stagger>

      {/* Upcoming events */}
      <h2 className="mt-10 font-display text-xl text-ivory-50">Upcoming events</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {upcoming.map((e) => (
          <GlassCard key={e.id} className="p-5">
            <Badge tone={e.kind === "MAIN_EVENT" ? "gold" : "blue"}>{e.kind === "MAIN_EVENT" ? "Major Event" : "Summit"}</Badge>
            <p className="mt-3 font-medium text-ivory-50">{e.name}</p>
            <p className="mt-1 text-xs text-mist">{e.venue}</p>
            <p className="mt-2 text-sm text-gold-300">{ukDate(e.startsAt, true)}</p>
          </GlassCard>
        ))}
      </div>
    </PageFx>
  );
}
