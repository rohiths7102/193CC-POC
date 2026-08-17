import Link from "next/link";
import { Users, Wallet, Ticket, ClipboardCheck, ArrowRight } from "lucide-react";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { gbp, ukDate, titleCase } from "@/lib/utils";
import { GlassCard, Badge, Stat, STATUS_TONE } from "@/components/ui";
import { PageFx, Stagger, StaggerItem, AnimatedNumber } from "@/components/motion";
import { Spotlight } from "@/components/premium";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const admin = await requireUser("manage_all_memberships");
  const [memberCount, activeCount, revenue, pendingApprovals, waitlisted, recentAudit, atRiskPlans] = await Promise.all([
    db.user.count({ where: { role: "MEMBER" } }),
    db.membership.count({ where: { status: "ACTIVE" } }),
    db.ledgerEntry.aggregate({ _sum: { amountMinor: true } }),
    db.article.count({ where: { status: { in: ["SUBMITTED", "IN_REVIEW"] } } }),
    db.slotApplication.count({ where: { status: "WAITLISTED" } }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    db.paymentPlan.count({ where: { status: "AT_RISK" } }),
  ]);

  return (
    <PageFx>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl text-ivory-50">Command centre</h1>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-300">
          <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-emerald-300" /> Live
        </span>
      </div>
      <p className="mt-1.5 text-sm text-mist">Welcome back, {admin.name}. Live truth across members, money, events and content — press <kbd className="rounded border hairline px-1 text-[10px]">Ctrl/⌘ K</kbd> to jump anywhere.</p>

      <Stagger className="mt-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: "Members", value: <AnimatedNumber value={memberCount} />, sub: `${activeCount} active memberships`, gold: false },
          { label: "Total credited", value: <AnimatedNumber value={(revenue._sum.amountMinor ?? 0) / 100} prefix="£" />, sub: `${atRiskPlans} Direct Debit plans at risk`, gold: true },
          { label: "Waitlisted slots", value: <AnimatedNumber value={waitlisted} />, sub: "auto-promote on cancellation", gold: false },
          { label: "Approvals pending", value: <AnimatedNumber value={pendingApprovals} />, sub: "articles awaiting review", gold: false },
        ].map((s) => (
          <StaggerItem key={s.label}>
            <Spotlight className="card-lux rounded-2xl">
              <GlassCard className="p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-mist">{s.label}</p>
                <p className={`mt-2 font-display text-3xl ${s.gold ? "text-gold-grad" : "text-ivory-50"}`}>{s.value}</p>
                <p className="mt-1 text-xs text-mist">{s.sub}</p>
              </GlassCard>
            </Spotlight>
          </StaggerItem>
        ))}
      </Stagger>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {[
          { href: "/portal/admin/members", icon: <Users className="h-4 w-4" />, t: "Member 360°" },
          { href: "/portal/admin/payments", icon: <Wallet className="h-4 w-4" />, t: "Payments & wallet" },
          { href: "/portal/admin/summit", icon: <Ticket className="h-4 w-4" />, t: "Summit console" },
          { href: "/portal/admin/approvals", icon: <ClipboardCheck className="h-4 w-4" />, t: "Content approvals" },
        ].map((q) => (
          <Link key={q.href} href={q.href}>
            <GlassCard className="group flex items-center justify-between p-5 transition-colors hover:border-line">
              <span className="flex items-center gap-3 text-sm text-ivory-100"><span className="rounded-lg bg-gold-500/12 p-2 text-gold-400">{q.icon}</span>{q.t}</span>
              <ArrowRight className="h-4 w-4 text-mist transition-transform group-hover:translate-x-1 group-hover:text-gold-400" />
            </GlassCard>
          </Link>
        ))}
      </div>

      <h2 className="mt-10 font-display text-xl text-ivory-50">Latest audit activity</h2>
      <div className="mt-4 space-y-2">
        {recentAudit.map((a) => (
          <GlassCard key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
            <Badge tone="grey">{a.action}</Badge>
            <span className="text-ivory-200">{a.actorName ?? "system"}</span>
            <span className="text-mist">· {a.entityType}</span>
            {a.reason && <span className="italic text-mist">"{a.reason}"</span>}
            <span className="ml-auto text-xs text-mist">{ukDate(a.createdAt, true)}</span>
          </GlassCard>
        ))}
      </div>
    </PageFx>
  );
}
