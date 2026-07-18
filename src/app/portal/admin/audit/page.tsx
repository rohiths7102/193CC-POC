import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { ukDate } from "@/lib/utils";
import { Badge, Table, Td, inputCls } from "@/components/ui";
import { PageFx } from "@/components/motion";

export const dynamic = "force-dynamic";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireUser("export_reports_audit");
  const { q } = await searchParams;
  const rows = await db.auditLog.findMany({
    where: q ? {
      OR: [
        { action: { contains: q, mode: "insensitive" } },
        { actorName: { contains: q, mode: "insensitive" } },
        { entityType: { contains: q, mode: "insensitive" } },
        { reason: { contains: q, mode: "insensitive" } },
      ],
    } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <PageFx>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ivory-50">Audit log</h1>
          <p className="mt-1.5 text-sm text-mist">Append-only. Who changed what, and when — contracts, payments, permissions, overrides, slots, publishing.</p>
        </div>
        <form className="w-full max-w-xs"><input name="q" defaultValue={q} placeholder="Filter actions…" className={inputCls} /></form>
      </div>
      <div className="mt-6">
        <Table head={["When", "Actor", "Action", "Entity", "Detail", "Reason"]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <Td className="whitespace-nowrap text-xs">{ukDate(r.createdAt, true)}</Td>
              <Td>{r.actorName ?? <span className="text-mist">system</span>}</Td>
              <Td><Badge tone="grey">{r.action}</Badge></Td>
              <Td className="text-xs text-mist">{r.entityType}</Td>
              <Td className="max-w-64 truncate text-xs">{r.after ? JSON.stringify(r.after) : "—"}</Td>
              <Td className="max-w-48 truncate text-xs italic">{r.reason ?? "—"}</Td>
            </tr>
          ))}
        </Table>
      </div>
    </PageFx>
  );
}
