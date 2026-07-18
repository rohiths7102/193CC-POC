import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { gbp, ukDate, titleCase } from "@/lib/utils";
import { GlassCard, Badge, Table, Td, STATUS_TONE, LinkButton } from "@/components/ui";
import { PageFx, Stagger, StaggerItem } from "@/components/motion";
import { LeadForm } from "@/components/forms";

export const dynamic = "force-dynamic";

const STAGES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"] as const;

export default async function SalesPipeline() {
  const rep = await requireUser("enrol_members");
  // Row scoping: reps see ONLY their own leads (client requirement — no cross-rep visibility).
  const [leads, myEnrolments] = await Promise.all([
    db.lead.findMany({ where: { salesRepId: rep.id }, orderBy: { createdAt: "desc" } }),
    db.membership.findMany({
      where: { salesRepId: rep.id },
      include: { user: true, product: true },
      orderBy: { createdAt: "desc" }, take: 10,
    }),
  ]);

  return (
    <PageFx>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ivory-50">Sales pipeline</h1>
          <p className="mt-1.5 text-sm text-mist">Your leads only — commission data and other reps' pipelines are never visible.</p>
        </div>
        <LinkButton href="/portal/sales/enrol" size="sm">Manual enrolment →</LinkButton>
      </div>

      <Stagger className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-6">
        {STAGES.map((s) => (
          <StaggerItem key={s}>
            <GlassCard className="p-4 text-center">
              <p className="font-display text-2xl text-ivory-50">{leads.filter((l) => l.stage === s).length}</p>
              <p className="mt-1 text-[10px] uppercase tracking-widest text-mist">{s}</p>
            </GlassCard>
          </StaggerItem>
        ))}
      </Stagger>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div>
          <h2 className="mb-4 font-display text-xl text-ivory-50">Leads</h2>
          <Table head={["Lead", "Company", "Stage", "Notes", "Added"]}>
            {leads.map((l) => (
              <tr key={l.id}>
                <Td>
                  <span className="block font-medium text-ivory-50">{l.name}</span>
                  <span className="block text-xs text-mist">{l.email}</span>
                </Td>
                <Td>{l.company ?? "—"}</Td>
                <Td><Badge tone={STATUS_TONE[l.stage] ?? "grey"}>{l.stage}</Badge></Td>
                <Td className="max-w-56 truncate text-xs">{l.notes ?? "—"}</Td>
                <Td className="text-xs text-mist">{ukDate(l.createdAt)}</Td>
              </tr>
            ))}
          </Table>

          <h2 className="mb-4 mt-8 font-display text-xl text-ivory-50">My enrolments</h2>
          <Table head={["Member", "Product", "Status"]}>
            {myEnrolments.map((m) => (
              <tr key={m.id}>
                <Td>{m.user.name}</Td>
                <Td>{m.product.name} · {gbp(m.product.priceMinor)}</Td>
                <Td><Badge tone={STATUS_TONE[m.status] ?? "grey"}>{titleCase(m.status)}</Badge></Td>
              </tr>
            ))}
          </Table>
        </div>

        <GlassCard strong className="h-fit p-7">
          <h2 className="mb-5 font-display text-lg text-ivory-50">Add a lead</h2>
          <LeadForm />
        </GlassCard>
      </div>
    </PageFx>
  );
}
