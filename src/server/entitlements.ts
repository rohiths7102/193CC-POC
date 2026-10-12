import "server-only";
import { db } from "./db";

export type EntitlementSet = {
  keys: Set<string>;
  /** max hours/month across active grants (union = best of) */
  mentoringHours: number;
  mentorKinds: string[];
  articleMaxWords: number;
  has: (key: string) => boolean;
};

/**
 * Union resolver — the client's rule: multiple active memberships give the
 * UNION of entitlements, never a downgrade. Benefit unlocks (wallet rule or
 * admin override) are folded in on top.
 */
export async function resolveEntitlements(userId: string): Promise<EntitlementSet> {
  const now = new Date();
  const memberships = await db.membership.findMany({
    where: {
      userId,
      status: "ACTIVE",
      OR: [{ periodEnd: null }, { periodEnd: { gte: now } }],
    },
    include: { product: { include: { entitlements: true } } },
  });

  const keys = new Set<string>();
  let mentoringHours = 0;
  const mentorKinds = new Set<string>();
  let articleMaxWords = 1400;

  for (const m of memberships) {
    for (const e of m.product.entitlements) {
      keys.add(e.key);
      const p = (e.params ?? {}) as Record<string, unknown>;
      if (e.key === "mentoring_hours") {
        mentoringHours = Math.max(mentoringHours, Number(p.hours ?? 0));
        if (p.kind) mentorKinds.add(String(p.kind));
      }
      if (e.key === "article" && p.maxWords) articleMaxWords = Number(p.maxWords);
    }
  }

  const unlocks = await db.benefitUnlock.findMany({ where: { userId, revokedAt: null } });
  for (const u of unlocks) keys.add(u.benefitKey);

  return {
    keys,
    mentoringHours,
    mentorKinds: [...mentorKinds],
    articleMaxWords,
    has: (key: string) => keys.has(key),
  };
}
