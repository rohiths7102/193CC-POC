import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { GlassCard, Button, inputCls } from "@/components/ui";
import { PageFx } from "@/components/motion";
import { saveSettingAction } from "@/server/actions/staff";
import { PriceForm } from "@/components/forms";

export const dynamic = "force-dynamic";

const DESCRIPTIONS: Record<string, string> = {
  "mentoring.rollover_enabled": "Do unused monthly mentoring hours roll over? (true/false — client decision pending)",
  "summit.waitlist_offer_hours": "Hours a promoted waitlist applicant has to accept. 0 = instant auto-confirm.",
  "renewal.grace_days": "Days after period end before an unpaid membership lapses.",
  "article.max_words": "Hard server-side cap on enterprise article length.",
};

export default async function SettingsPage() {
  await requireUser("configure_system");
  const settings = await db.setting.findMany({ orderBy: { key: "asc" } });
  const rules = await db.thresholdRule.findMany();
  const products = await db.product.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <PageFx>
      <h1 className="font-display text-3xl text-ivory-50">Settings</h1>
      <p className="mt-1.5 text-sm text-mist">Business rules as configuration — fees, thresholds and policies change here, never in code. Every change is audited.</p>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {settings.map((s) => (
          <GlassCard key={s.key} className="p-6">
            <p className="font-mono text-sm text-gold-300">{s.key}</p>
            <p className="mt-1 text-xs text-mist">{DESCRIPTIONS[s.key] ?? ""}</p>
            <form action={saveSettingAction} className="mt-4 flex gap-2">
              <input type="hidden" name="key" value={s.key} />
              <input name="value" defaultValue={JSON.stringify(s.value).replace(/^"|"$/g, "")} className={inputCls} />
              <Button size="sm" variant="ghost">Save</Button>
            </form>
          </GlassCard>
        ))}
      </div>

      <h2 className="mt-10 font-display text-xl text-ivory-50">Membership fees</h2>
      <p className="mt-1 mb-4 text-xs text-mist">Live configuration — changes apply to new enrolments immediately and are audited.</p>
      <div className="grid gap-4 lg:grid-cols-2">
        {products.map((p) => (
          <GlassCard key={p.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
            <span className="text-sm text-ivory-50">{p.name}<span className="ml-2 text-xs text-mist">{p.billing === "ANNUAL" ? "annual" : "one-time"}</span></span>
            <PriceForm productId={p.id} currentMinor={p.priceMinor} />
          </GlassCard>
        ))}
      </div>

      <h2 className="mt-10 font-display text-xl text-ivory-50">Threshold rules</h2>
      <div className="mt-4 space-y-3">
        {rules.map((r) => (
          <GlassCard key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm">
            <span className="text-ivory-50">{r.name}</span>
            <span className="text-mist">unlocks <code className="text-gold-300">{r.benefitKey}</code> at <strong className="text-gold-300">£{(r.thresholdMinor / 100).toLocaleString("en-GB")}</strong> · {(r.qualifyingProductIds as string[]).length || "all"} qualifying product(s) · {r.active ? "active" : "inactive"}</span>
          </GlassCard>
        ))}
      </div>
    </PageFx>
  );
}
