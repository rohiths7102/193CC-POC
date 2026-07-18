import { ShieldCheck, FileText, ExternalLink, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { gbp, ukDate } from "@/lib/utils";
import { GlassCard, Badge, Empty, Avatar, DemoTag } from "@/components/ui";
import { PageFx } from "@/components/motion";
import { VerifyOrgForm } from "@/components/forms";
import { companiesHousePublicUrl } from "@/server/companies-house";
import { recheckCompanyAction } from "@/server/actions/staff";

export const dynamic = "force-dynamic";

/** Organisation verification queue (client change, Jul 13 notes): Enterprise
 *  sign-ups that have signed AND paid, waiting on a document review. Approve
 *  activates the membership; reject records a reason and emails the member. */
export default async function VerificationQueue() {
  await requireUser("manage_all_memberships");
  const pending = await db.membership.findMany({
    where: { status: "PENDING_VERIFICATION" },
    include: { user: true, product: true, contract: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <PageFx>
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-gold-500/12 p-2.5 text-gold-400"><ShieldCheck className="h-5 w-5" /></span>
        <div>
          <h1 className="font-display text-3xl text-ivory-50">Verification queue</h1>
          <p className="mt-1 text-sm text-mist">
            {pending.length} organisation{pending.length === 1 ? "" : "s"} awaiting document review — the promise on the
            enrolment page is same-day verification, so keep this queue moving.
          </p>
        </div>
      </div>

      {pending.length === 0 && <div className="mt-8"><Empty title="Queue is clear" sub="New Enterprise sign-ups appear here the moment they've signed and paid." /></div>}

      <div className="mt-8 space-y-5">
        {pending.map((m) => (
          <GlassCard key={m.id} strong className="p-6">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar name={m.orgName ?? m.user.name} className="h-12 w-12 text-sm" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-display text-lg text-ivory-50">{m.orgName ?? m.user.company ?? m.user.name}</p>
                  <Badge tone="purple">Pending verification</Badge>
                  {m.rejectedReason && <Badge tone="red">Previously rejected</Badge>}
                </div>
                <p className="mt-1 text-xs text-mist">
                  {m.user.name} · {m.user.email}
                  {m.orgNumber && <> · Reg. no. {m.orgNumber}</>}
                  · {m.product.name} ({gbp(m.product.priceMinor)})
                  · signed {ukDate(m.contract?.signedAt)} · applied {ukDate(m.createdAt)}
                </p>
                {m.rejectedReason && (
                  <p className="mt-1 text-xs italic text-red-300">Last rejection: {m.rejectedReason}</p>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {((m.orgDocs as string[]) ?? []).map((d, i) => (
                <a key={d} href={`/api/files/${d}`} target="_blank"
                  className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/30 px-3.5 py-1.5 text-xs text-gold-300 hover:bg-gold-500/10">
                  <FileText className="h-3.5 w-3.5" /> Document {i + 1}
                </a>
              ))}
            </div>

            {/* Companies House cross-check — the automated signal that
                turns "eyeballed a PDF" into "confirmed against the UK
                government register." */}
            <div className="mt-5 rounded-xl border hairline bg-ink-800/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-mist">
                  <ShieldCheck className="h-3.5 w-3.5 text-gold-400" /> Companies House check
                  {m.chSimulated && <DemoTag>Simulated — add COMPANIES_HOUSE_API_KEY for live checks</DemoTag>}
                </p>
                <form action={recheckCompanyAction}>
                  <input type="hidden" name="membershipId" value={m.id} />
                  <button className="inline-flex items-center gap-1.5 text-[11px] text-mist hover:text-gold-300">
                    <RefreshCw className="h-3 w-3" /> Re-check
                  </button>
                </form>
              </div>

              {!m.chStatus ? (
                <p className="mt-2 text-sm text-mist">No registration number was supplied — verify from the document alone.</p>
              ) : (
                <div className="mt-2 space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    {m.chStatus === "active" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                    {m.chStatus === "dissolved" && <XCircle className="h-4 w-4 text-red-400" />}
                    {(m.chStatus === "not_found" || m.chStatus === "error") && <XCircle className="h-4 w-4 text-red-400" />}
                    <span className="text-ivory-100">
                      {m.chStatus === "active" && "Registered and active"}
                      {m.chStatus === "dissolved" && "⚠ This company is DISSOLVED"}
                      {m.chStatus === "not_found" && "⚠ No company found with this number"}
                      {m.chStatus === "error" && "Lookup failed — try re-checking"}
                    </span>
                  </div>
                  {m.chOfficialName && (
                    <p className="text-mist">
                      Official registered name: <span className="text-ivory-100">{m.chOfficialName}</span>
                      {m.chNameMatches === false && (
                        <span className="ml-2 inline-flex items-center gap-1 text-amber-300">
                          <AlertTriangle className="h-3.5 w-3.5" /> does not match "{m.orgName}"
                        </span>
                      )}
                      {m.chNameMatches === true && <span className="ml-2 text-emerald-400">✓ matches</span>}
                    </p>
                  )}
                  {m.chIncorporatedAt && (
                    <p className="text-mist">Incorporated: <span className="text-ivory-100">{ukDate(m.chIncorporatedAt)}</span></p>
                  )}
                  {m.orgNumber && (
                    <a href={companiesHousePublicUrl(m.orgNumber)} target="_blank"
                      className="inline-flex items-center gap-1 text-xs text-gold-300 underline underline-offset-2">
                      View on Companies House <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 border-t hairline pt-5">
              <VerifyOrgForm membershipId={m.id} />
            </div>
          </GlassCard>
        ))}
      </div>
    </PageFx>
  );
}
