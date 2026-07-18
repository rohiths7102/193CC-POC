import Link from "next/link";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { gbp, ukDate, titleCase } from "@/lib/utils";
import { GlassCard, Badge, Table, Td, STATUS_TONE, Avatar, inputCls } from "@/components/ui";
import { PageFx } from "@/components/motion";

export const dynamic = "force-dynamic";

export default async function AdminMembers({ searchParams }: {
  searchParams: Promise<{ q?: string; tier?: string; status?: string; health?: string }>;
}) {
  await requireUser("manage_all_memberships");
  const { q, tier, status, health } = await searchParams;
  const products = await db.product.findMany({ orderBy: { sortOrder: "asc" } });
  const members = await db.user.findMany({
    where: {
      role: "MEMBER",
      ...(q ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { company: { contains: q, mode: "insensitive" } },
        ],
      } : {}),
      ...(tier ? { memberships: { some: { product: { code: tier }, status: "ACTIVE" } } } : {}),
      ...(status === "ACTIVE" || status === "PENDING" || status === "SUSPENDED" ? { status } : {}),
      ...(health === "at_risk" ? { memberships: { some: { paymentPlan: { status: "AT_RISK" } } } } : {}),
      ...(health === "dd" ? { memberships: { some: { paymentPlan: { isNot: null } } } } : {}),
    },
    include: {
      memberships: { include: { product: true, paymentPlan: true } },
      ledgerEntries: { where: { walletEligible: true }, select: { amountMinor: true } },
      unlocks: { where: { revokedAt: null } },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return (
    <PageFx>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ivory-50">Members</h1>
          <p className="mt-1.5 text-sm text-mist">Search by name, email or company — click through for the full 360°.</p>
        </div>
        <form className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
          <input name="q" defaultValue={q} placeholder="Search members…" className={`${inputCls} w-56`} />
          <select name="tier" defaultValue={tier ?? ""} className={`${inputCls} w-44`}>
            <option value="">All tiers</option>
            {products.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select>
          <select name="status" defaultValue={status ?? ""} className={`${inputCls} w-36`}>
            <option value="">Any status</option>
            <option value="ACTIVE">Active</option><option value="PENDING">Pending</option><option value="SUSPENDED">Suspended</option>
          </select>
          <select name="health" defaultValue={health ?? ""} className={`${inputCls} w-44`}>
            <option value="">Any payment health</option>
            <option value="dd">On Direct Debit</option>
            <option value="at_risk">At-risk plans</option>
          </select>
          <button className="rounded-full border border-gold-500/30 px-5 py-2.5 text-sm text-ivory-100 hover:bg-gold-500/10">Filter</button>
        </form>
      </div>

      <div className="mt-6">
        <Table head={["Member", "Tier(s)", "Status", "Wallet", "Major Event", "Joined"]}>
          {members.map((u) => {
            const balance = u.ledgerEntries.reduce((s, e) => s + e.amountMinor, 0);
            const active = u.memberships.filter((m) => m.status === "ACTIVE");
            const unlocked = u.unlocks.some((x) => x.benefitKey === "main_event_delegate");
            return (
              <tr key={u.id} className="transition-colors hover:bg-ink-700/30">
                <Td>
                  <Link href={`/portal/admin/members/${u.id}`} className="flex items-center gap-3">
                    <Avatar name={u.name} />
                    <span>
                      <span className="block font-medium text-ivory-50">{u.name}</span>
                      <span className="block text-xs text-mist">{u.company ?? u.email}</span>
                    </span>
                  </Link>
                </Td>
                <Td>{active.length ? active.map((m) => m.product.name.replace("Enterprise ", "Ent. ")).join(", ") : <span className="text-mist">—</span>}</Td>
                <Td><Badge tone={STATUS_TONE[u.status] ?? "grey"}>{u.status}</Badge></Td>
                <Td className="text-gold-300">{gbp(balance)}</Td>
                <Td>{unlocked ? <Badge tone="green">Unlocked</Badge> : <span className="text-mist">Locked</span>}</Td>
                <Td className="text-xs text-mist">{ukDate(u.createdAt)}</Td>
              </tr>
            );
          })}
        </Table>
      </div>
    </PageFx>
  );
}
