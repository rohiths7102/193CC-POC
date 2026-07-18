import { UserPlus } from "lucide-react";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { GlassCard } from "@/components/ui";
import { PageFx } from "@/components/motion";
import { ManualEnrolForm } from "@/components/forms";

export const dynamic = "force-dynamic";

export default async function ManualEnrol() {
  await requireUser("enrol_members");
  const products = await db.product.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });

  return (
    <PageFx>
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-gold-500/12 p-2.5 text-gold-400"><UserPlus className="h-5 w-5" /></span>
        <div>
          <h1 className="font-display text-3xl text-ivory-50">Manual enrolment</h1>
          <p className="mt-1 text-sm text-mist">For phone and offline sign-ups. Identical gates to online: the member still e-signs and pays before anything activates — no side doors.</p>
        </div>
      </div>
      <GlassCard strong className="mt-8 max-w-3xl p-8">
        <ManualEnrolForm products={products.map((p) => ({ code: p.code, name: p.name, priceMinor: p.priceMinor }))} />
      </GlassCard>
    </PageFx>
  );
}
