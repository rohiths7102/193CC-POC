import "server-only";
import type { LedgerType, PayProvider, Prisma } from "@prisma/client";
import { db } from "./db";
import { audit } from "./audit";
import { sendMail } from "./mail";

/** Current wallet balance (pence) — sum of wallet-eligible ledger entries. */
export async function walletBalance(userId: string): Promise<number> {
  const agg = await db.ledgerEntry.aggregate({
    where: { userId, walletEligible: true },
    _sum: { amountMinor: true },
  });
  return agg._sum.amountMinor ?? 0;
}

export async function thresholdProgress(userId: string) {
  const rule = await db.thresholdRule.findFirst({ where: { active: true } });
  const balance = await walletBalance(userId);
  const unlock = rule
    ? await db.benefitUnlock.findFirst({ where: { userId, benefitKey: rule.benefitKey, revokedAt: null } })
    : null;
  return {
    balance,
    threshold: rule?.thresholdMinor ?? 260000,
    remaining: Math.max(0, (rule?.thresholdMinor ?? 260000) - balance),
    unlocked: Boolean(unlock),
    unlock,
  };
}

/**
 * The ONLY way money enters the system. Appends a ledger entry, then
 * re-evaluates every active threshold rule for the user — crossing a
 * threshold creates a BenefitUnlock exactly once (idempotent), audited,
 * with a notification. Refunds (negative) never auto-revoke: they flag
 * for admin review instead (money-out edge cases need a human).
 */
export async function credit(opts: {
  userId: string;
  membershipId?: string;
  type: LedgerType;
  amountMinor: number;
  provider: PayProvider;
  reason?: string;
  createdById?: string;
  walletEligible?: boolean;
}) {
  const entry = await db.ledgerEntry.create({
    data: {
      userId: opts.userId,
      membershipId: opts.membershipId,
      type: opts.type,
      amountMinor: opts.amountMinor,
      provider: opts.provider,
      reason: opts.reason,
      createdById: opts.createdById,
      walletEligible: opts.walletEligible ?? true,
    },
  });
  await evaluateThresholds(opts.userId, entry.id);
  return entry;
}

export async function evaluateThresholds(userId: string, triggerEntryId?: string) {
  const rules = await db.thresholdRule.findMany({ where: { active: true } });
  if (!rules.length) return;

  const entries = await db.ledgerEntry.findMany({
    where: { userId, walletEligible: true },
    include: { membership: true },
  });

  const user = await db.user.findUnique({ where: { id: userId } });

  for (const rule of rules) {
    const qualifying = (rule.qualifyingProductIds as string[]) ?? [];
    const total = entries
      .filter((e) => qualifying.length === 0 || (e.membership && qualifying.includes(e.membership.productId)))
      .reduce((sum, e) => sum + e.amountMinor, 0);

    const existing = await db.benefitUnlock.findFirst({
      where: { userId, benefitKey: rule.benefitKey, revokedAt: null },
    });

    if (total >= rule.thresholdMinor && !existing) {
      await db.benefitUnlock.create({
        data: {
          userId, benefitKey: rule.benefitKey, source: "RULE",
          ruleId: rule.id, ledgerEntryId: triggerEntryId,
        },
      });
      await audit({
        action: "benefit.unlock", entityType: "User", entityId: userId,
        after: { rule: rule.name, benefitKey: rule.benefitKey, creditedMinor: total },
      });
      if (user) {
        await sendMail(
          user.email,
          "Major Event benefit unlocked",
          `Congratulations ${user.name} — your credited balance has reached £${(total / 100).toFixed(2)}, unlocking the Major Event (House of Lords) benefit. Book your place from your dashboard.`
        );
      }
    }
  }
}

/** Admin override — unlock or revoke with a mandatory logged reason. */
export async function manualUnlock(opts: {
  adminId: string; adminName: string; userId: string; benefitKey: string; reason: string;
}) {
  if (!opts.reason.trim()) throw new Error("A reason is required for manual overrides.");
  const unlock = await db.benefitUnlock.create({
    data: {
      userId: opts.userId, benefitKey: opts.benefitKey,
      source: "MANUAL", adminId: opts.adminId, reason: opts.reason,
    },
  });
  await audit({
    actorId: opts.adminId, actorName: opts.adminName,
    action: "benefit.manual_unlock", entityType: "User", entityId: opts.userId,
    after: { benefitKey: opts.benefitKey }, reason: opts.reason,
  });
  return unlock;
}
