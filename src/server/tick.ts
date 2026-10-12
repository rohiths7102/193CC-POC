import "server-only";
import { db } from "./db";
import { audit } from "./audit";
import { promoteNext } from "./summit";
import { collectNextInstalment } from "./enrolment";
import { sendContentReviewReminders, sendRenewalReminders, sweepPendingVerifications } from "./automation";
import { appUrl } from "@/lib/app-url";
import { getAssistantConfig } from "./assistant/config";
import { reindexSite } from "./assistant/knowledge";

/**
 * Housekeeping tick — every 60s in-process on a long-lived server
 * (instrumentation.ts), daily at 03:00 via Vercel Cron (/api/cron/tick):
 *  1. Summits past their deadline auto-CLOSE; dangling INVITED apps EXPIRE.
 *  2. OFFERED slots past their window EXPIRE and the next applicant is promoted.
 *  3. Memberships past periodEnd + grace LAPSE (entitlements drop via resolver).
 *  4. Due Direct Debit instalments are collected automatically; a failed
 *     collection marks the plan AT_RISK for admin follow-up (§5.2 retry/at-risk).
 *  5. PENDING_VERIFICATION memberships not yet seen by the Companies House
 *     rule are evaluated (clean match → ACTIVE; otherwise a staff exception).
 *  6. Renewal reminders at 30 and 7 days before periodEnd (once each).
 *  7. Staff reminder for content waiting > 48h (never auto-approves).
 *
 * Every job is idempotent: each row is claimed with a conditional update
 * (status / timestamp guard) before any side effect, so a repeated or
 * overlapping run finds nothing left to do. On top of that, the whole tick
 * holds a Postgres advisory lock so two ticks (e.g. a duplicate cron
 * delivery and the in-process interval) never run concurrently.
 * Correct at this scale; swap to pg-boss when volume demands it.
 */
const TICK_LOCK_KEY = 193_000_001;
let runningInProcess = false;

export type TickReport = {
  skipped?: "already_running";
  ddCollected: number;
  ddAtRisk: number;
  summitsClosed: number;
  offersExpired: number;
  lapsed: number;
  orgAutoApproved: number;
  orgExceptions: number;
  renewalReminders: number;
  contentReminders: number;
  knowledgeReindexed: number;
};

const empty = (): TickReport => ({
  ddCollected: 0, ddAtRisk: 0, summitsClosed: 0, offersExpired: 0, lapsed: 0,
  orgAutoApproved: 0, orgExceptions: 0, renewalReminders: 0, contentReminders: 0, knowledgeReindexed: 0,
});

export async function runTick(): Promise<TickReport> {
  if (runningInProcess) return { ...empty(), skipped: "already_running" };
  runningInProcess = true;
  try {
    // The transaction only exists to hold the advisory lock on one pooled
    // connection; the jobs themselves run on the normal client.
    return await db.$transaction(async (tx) => {
      const [{ locked }] = await tx.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_xact_lock(${TICK_LOCK_KEY}) AS locked`;
      if (!locked) return { ...empty(), skipped: "already_running" as const };
      return runJobs();
    }, { maxWait: 10_000, timeout: 10 * 60_000 });
  } finally {
    runningInProcess = false;
  }
}

async function runJobs(): Promise<TickReport> {
  const now = new Date();
  const report = empty();

  // 4. Scheduled Direct Debit collections — claim each plan by clearing
  //    nextCollectionAt (collectNextInstalment sets the next date).
  const duePlans = await db.paymentPlan.findMany({
    where: { status: "ACTIVE", nextCollectionAt: { lte: now } },
  });
  for (const plan of duePlans) {
    const claim = await db.paymentPlan.updateMany({
      where: { id: plan.id, status: "ACTIVE", collected: plan.collected, nextCollectionAt: plan.nextCollectionAt },
      data: { nextCollectionAt: null },
    });
    if (claim.count === 0) continue;
    try {
      await collectNextInstalment(plan.membershipId);
      report.ddCollected++;
    } catch (e) {
      await db.paymentPlan.update({ where: { id: plan.id }, data: { status: "AT_RISK" } });
      await audit({
        action: "dd.collection_failed", entityType: "PaymentPlan", entityId: plan.id,
        after: { error: e instanceof Error ? e.message : String(e) },
      });
      report.ddAtRisk++;
    }
  }

  // 1. Deadline auto-close
  const overdue = await db.summit.findMany({
    where: { status: "OPEN", deadlineAt: { lt: now } },
    include: { event: true },
  });
  for (const s of overdue) {
    const claim = await db.summit.updateMany({ where: { id: s.id, status: "OPEN" }, data: { status: "CLOSED" } });
    if (claim.count === 0) continue;
    const { count } = await db.slotApplication.updateMany({
      where: { category: { summitId: s.id }, status: "INVITED" },
      data: { status: "EXPIRED" },
    });
    await audit({
      action: "summit.deadline_close", entityType: "Summit", entityId: s.id,
      after: { event: s.event.name, expiredInvitations: count },
    });
    report.summitsClosed++;
  }

  // 2. Expired offers → pass to next in line
  const expiredOffers = await db.slotApplication.findMany({
    where: { status: "OFFERED", offerExpiresAt: { lt: now } },
  });
  for (const app of expiredOffers) {
    const claim = await db.slotApplication.updateMany({
      where: { id: app.id, status: "OFFERED" }, data: { status: "EXPIRED" },
    });
    if (claim.count === 0) continue;
    await audit({ action: "slot.offer_expired", entityType: "SlotApplication", entityId: app.id });
    await promoteNext(app.categoryId);
    report.offersExpired++;
  }

  // 3. Lapse past-due memberships (period end + grace days)
  const graceSetting = await db.setting.findUnique({ where: { key: "renewal.grace_days" } });
  const graceDays = typeof graceSetting?.value === "number" ? graceSetting.value : 14;
  const cutoff = new Date(now.getTime() - graceDays * 24 * 3600 * 1000);
  const lapsed = await db.membership.updateMany({
    where: { status: "ACTIVE", periodEnd: { lt: cutoff } },
    data: { status: "LAPSED" },
  });
  if (lapsed.count > 0) {
    await audit({
      action: "membership.lapse_sweep", entityType: "Membership", entityId: "batch",
      after: { lapsed: lapsed.count, graceDays },
    });
  }
  report.lapsed = lapsed.count;

  // 5–7. Rule-based automations (each has its own Setting off-switch).
  // One failing job must not stop the others.
  try {
    const v = await sweepPendingVerifications();
    report.orgAutoApproved = v.approved;
    report.orgExceptions = v.exceptions;
  } catch (e) { console.error("[tick] org verification sweep", e); }
  try { report.renewalReminders = await sendRenewalReminders(now); }
  catch (e) { console.error("[tick] renewal reminders", e); }
  try { report.contentReminders = await sendContentReviewReminders(now); }
  catch (e) { console.error("[tick] content review reminders", e); }

  // 8. Keep the assistant's knowledge in step with the site and live prices:
  //    re-index when the site index is over 20 hours old (and the bot is on).
  try {
    const cfg = await getAssistantConfig();
    const newest = await db.knowledgeDoc.findFirst({ where: { source: "site" }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } });
    if (cfg.groqKey && (!newest || now.getTime() - newest.updatedAt.getTime() > 20 * 3_600_000)) {
      report.knowledgeReindexed = (await reindexSite(appUrl(), cfg.geminiKey)).chunks;
    }
  } catch (e) { console.error("[tick] assistant re-index", e); }

  return report;
}
