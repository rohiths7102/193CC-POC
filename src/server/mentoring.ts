import "server-only";
import { db } from "./db";
import { audit } from "./audit";
import { sendMail } from "./mail";
import { AUTOMATION, AUTOMATION_ACTOR, automationEnabled } from "./settings";

/**
 * Automatic mentor assignment on activation (§5.5). Rule: if the activated
 * product carries a `mentoring_hours` entitlement, assign the ACTIVE
 * Mentor/Consultant with the fewest current (active) assignments; ties go to
 * the longest-standing account, so the choice is deterministic and auditable.
 *
 * Idempotent: a member who already has an active assignment of that kind is
 * left alone. Staff can still override with assignMentorAction.
 */
export async function autoAssignMentor(membershipId: string): Promise<void> {
  if (!(await automationEnabled(AUTOMATION.mentorAssign))) return;

  const m = await db.membership.findUniqueOrThrow({
    where: { id: membershipId },
    include: { user: true, product: { include: { entitlements: true } } },
  });
  const ent = m.product.entitlements.find((e) => e.key === "mentoring_hours");
  if (!ent) return;
  const params = (ent.params ?? {}) as Record<string, unknown>;
  const kind = typeof params.kind === "string" && params.kind ? params.kind : "senior";

  const existing = await db.mentorAssignment.findFirst({
    where: { memberId: m.userId, kind, active: true },
  });
  if (existing) return;

  const pool = await db.user.findMany({
    where: { role: { in: ["MENTOR", "CONSULTANT"] }, status: "ACTIVE", id: { not: m.userId } },
    select: {
      id: true, name: true, email: true, createdAt: true,
      _count: { select: { mentorAssignments: { where: { active: true } } } },
    },
  });
  if (pool.length === 0) {
    await audit({
      actorName: AUTOMATION_ACTOR, action: "mentoring.auto_assign_exception",
      entityType: "User", entityId: m.userId,
      after: { member: m.user.name, product: m.product.name, kind },
      reason: "No active Mentor or Consultant account available — assign manually.",
    });
    return;
  }
  pool.sort((a, b) =>
    a._count.mentorAssignments - b._count.mentorAssignments ||
    a.createdAt.getTime() - b.createdAt.getTime() ||
    a.id.localeCompare(b.id));
  const mentor = pool[0];

  await db.mentorAssignment.upsert({
    where: { mentorId_memberId: { mentorId: mentor.id, memberId: m.userId } },
    create: { mentorId: mentor.id, memberId: m.userId, kind, active: true },
    update: { kind, active: true },
  });
  await audit({
    actorName: AUTOMATION_ACTOR, action: "mentoring.auto_assign",
    entityType: "User", entityId: m.userId,
    after: {
      member: m.user.name, mentor: mentor.name, kind, product: m.product.name,
      mentorLoadBefore: mentor._count.mentorAssignments,
    },
    reason: `Automatic: ${m.product.name} includes mentoring; assigned the active mentor with the fewest current assignments (${mentor._count.mentorAssignments}).`,
  });
  await sendMail(mentor.email, `New ${kind} mentee: ${m.user.name}`,
    `Hello ${mentor.name}, ${m.user.name} (${m.product.name}) has been assigned to you for ${kind} mentoring. They will appear in your mentor portal.`);
}
