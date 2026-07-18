import Link from "next/link";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { gbp, ukDate, titleCase } from "@/lib/utils";
import { GlassCard, Badge, Table, Td, STATUS_TONE, Button } from "@/components/ui";
import { PageFx } from "@/components/motion";
import { collectInstalmentAction } from "@/server/actions/staff";

export const dynamic = "force-dynamic";

export default async function AdminPayments() {
  await requireUser("manage_all_memberships");
  const [ledger, plans] = await Promise.all([
    db.ledgerEntry.findMany({
      include: { user: true, membership: { include: { product: true } } },
      orderBy: { createdAt: "desc" }, take: 50,
    }),
    db.paymentPlan.findMany({
      include: { membership: { include: { user: true, product: true } } },
      orderBy: { nextCollectionAt: "asc" },
    }),
  ]);

  return (
    <PageFx>
      <h1 className="font-display text-3xl text-ivory-50">Payments & wallet</h1>
      <p className="mt-1.5 text-sm text-mist">The append-only ledger and every Direct Debit plan — collection health at a glance.</p>

      <h2 className="mt-8 font-display text-xl text-ivory-50">Direct Debit plans</h2>
      <div className="mt-4">
        <Table head={["Member", "Product", "Progress", "Instalment", "Next collection", "Status", ""]}>
          {plans.map((p) => (
            <tr key={p.id}>
              <Td><Link href={`/portal/admin/members/${p.membership.user.id}`} className="text-ivory-50 hover:text-gold-300">{p.membership.user.name}</Link></Td>
              <Td>{p.membership.product.name}</Td>
              <Td>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-ink-700">
                    <div className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-600" style={{ width: `${(p.collected / p.months) * 100}%` }} />
                  </div>
                  <span className="text-xs text-mist">{p.collected}/{p.months}</span>
                </div>
              </Td>
              <Td>{gbp(p.instalmentMinor)}</Td>
              <Td className="text-xs">{p.nextCollectionAt ? ukDate(p.nextCollectionAt) : "—"}</Td>
              <Td><Badge tone={STATUS_TONE[p.status] ?? "grey"}>{p.status}</Badge></Td>
              <Td>
                {p.status === "ACTIVE" && (
                  <form action={collectInstalmentAction}>
                    <input type="hidden" name="membershipId" value={p.membershipId} />
                    <Button size="sm" variant="dark">Collect now</Button>
                  </form>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      </div>

      <h2 className="mt-10 font-display text-xl text-ivory-50">Recent ledger activity</h2>
      <div className="mt-4">
        <Table head={["Date", "Member", "Type", "Detail", "Amount"]}>
          {ledger.map((l) => (
            <tr key={l.id}>
              <Td className="text-xs">{ukDate(l.createdAt, true)}</Td>
              <Td><Link href={`/portal/admin/members/${l.userId}`} className="text-ivory-50 hover:text-gold-300">{l.user.name}</Link></Td>
              <Td><Badge tone={l.amountMinor < 0 ? "red" : "green"}>{titleCase(l.type)}</Badge></Td>
              <Td className="max-w-64 truncate text-xs">{l.reason ?? "—"}</Td>
              <Td className={l.amountMinor < 0 ? "text-red-300" : "text-ivory-50"}>{gbp(l.amountMinor)}</Td>
            </tr>
          ))}
        </Table>
      </div>
    </PageFx>
  );
}
