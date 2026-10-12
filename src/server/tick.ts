import "server-only";
import { db } from "./db";
import { audit } from "./audit";
import { promoteNext } from "./summit";
import { collectNextInstalment } from "./enrolment";

/**
 * The 60-second housekeeping tick (registered in instrumentation.ts):
 *  1. Summits past their deadline auto-CLOSE; dangling INVITED apps EXPIRE.
 *  2. OFFERED slots past their window EXPIRE and the next applicant is promoted.
 *  3. Memberships past periodEnd + grace LAPSE (entitlements drop via resolver).
 *  4. Due Direct Debit instalments are collected automatically; a failed
 *     collection marks the plan AT_RISK for admin follow-up (§5.2 retry/at-risk).
 * Correct at this scale; swap to pg-boss when volume demands it.
 */
export async function runTick() {
  const now = new Date();

  // 4. Scheduled Direct Debit collections
  const duePlans = await db.paymentPlan.findMany({
    where: { status: "ACTIVE", nextCollectionAt: { lte: now } },
  });
  for (const plan of duePlans) {
    try {
      await collectNextInstalment(plan.membershipId);
    } catch (e) {
      await db.paymentPlan.update({ where: { id: plan.id }, data: { status: "AT_RISK" } });
      await audit({
        action: "dd.collection_failed", entityType: "PaymentPlan", entityId: plan.id,
        after: { error: e instanceof Error ? e.message : String(e) },
      });
    }
  }

  // 1. Deadline auto-close
  const overdue = await db.summit.findMany({
    where: { status: "OPEN", deadlineAt: { lt: now } },
    include: { event: true },
  });
  for (const s of overdue) {
    await db.summit.update({ where: { id: s.id }, data: { status: "CLOSED" } });
    const { count } = await db.slotApplication.updateMany({
      where: { category: { summitId: s.id }, status: "INVITED" },
      data: { status: "EXPIRED" },
    });
    await audit({
      action: "summit.deadline_close", entityType: "Summit", entityId: s.id,
      after: { event: s.event.name, expiredInvitations: count },
    });
  }

  // 2. Expired offers → pass to next in line
  const expiredOffers = await db.slotApplication.findMany({
    where: { status: "OFFERED", offerExpiresAt: { lt: now } },
  });
  for (const app of expiredOffers) {
    await db.slotApplication.update({ where: { id: app.id }, data: { status: "EXPIRED" } });
    await audit({ action: "slot.offer_expired", entityType: "SlotApplication", entityId: app.id });
    await promoteNext(app.categoryId);
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
}
