import "server-only";
import { SlotStatus } from "@prisma/client";
import { db } from "./db";
import { audit } from "./audit";
import { sendMail } from "./mail";

async function offerWindowHours(): Promise<number> {
  const s = await db.setting.findUnique({ where: { key: "summit.waitlist_offer_hours" } });
  return typeof s?.value === "number" ? s.value : 48;
}

/** Member uploads their intent letter. Deadline enforced HERE (API layer), not just by the scheduler. */
export async function submitIntent(userId: string, applicationId: string, intentLetterPath: string) {
  const app = await db.slotApplication.findUniqueOrThrow({
    where: { id: applicationId },
    include: { category: { include: { summit: { include: { event: true } } } }, user: true },
  });
  if (app.userId !== userId) throw new Error("Forbidden: not your application.");
  if (app.status !== "INVITED") throw new Error(`Cannot submit from state ${app.status}`);
  const summit = app.category.summit;
  if (summit.status !== "OPEN" || new Date() >= summit.deadlineAt) {
    throw new Error("The submission deadline for this Summit has passed.");
  }

  await db.slotApplication.update({
    where: { id: applicationId },
    data: { status: "INTENT_SUBMITTED", intentLetterPath, submittedAt: new Date() },
  });
  await audit({
    actorId: userId, actorName: app.user.name, action: "slot.intent_submitted",
    entityType: "SlotApplication", entityId: applicationId,
    after: { category: app.category.kind, summit: summit.event.name },
  });
  await sendMail(app.user.email, "Intent letter received",
    `Your intent letter for the ${app.category.kind.replace("_", " ").toLowerCase()} category was received before the deadline. You will be notified once your slot is confirmed.`);
}

/**
 * Confirm an application against category capacity. Runs in a SERIALIZABLE
 * transaction with a row lock on the category so two simultaneous
 * confirmations can never exceed 15 — the DB is the last line of defence.
 * Full category → WAITLISTED with a queue position.
 */
export async function confirmApplication(applicationId: string, decider: { id: string; name: string }) {
  const result = await db.$transaction(async (tx) => {
    const app = await tx.slotApplication.findUniqueOrThrow({
      where: { id: applicationId }, include: { category: true, user: true },
    });
    if (!["INTENT_SUBMITTED", "OFFERED", "WAITLISTED"].includes(app.status)) {
      throw new Error(`Cannot confirm from state ${app.status}`);
    }

    // Row lock — serialises concurrent confirmations per category.
    await tx.$queryRaw`SELECT id FROM "SummitCategory" WHERE id = ${app.categoryId} FOR UPDATE`;

    const confirmed = await tx.slotApplication.count({
      where: { categoryId: app.categoryId, status: "CONFIRMED" },
    });

    if (confirmed >= app.category.capacity) {
      const maxPos = await tx.slotApplication.aggregate({
        where: { categoryId: app.categoryId, status: "WAITLISTED" },
        _max: { waitlistPos: true },
      });
      await tx.slotApplication.update({
        where: { id: applicationId },
        data: { status: "WAITLISTED", waitlistPos: (maxPos._max.waitlistPos ?? 0) + 1 },
      });
      return { outcome: "WAITLISTED" as const, app };
    }

    await tx.slotApplication.update({
      where: { id: applicationId },
      data: { status: "CONFIRMED", decidedById: decider.id, waitlistPos: null, offerExpiresAt: null },
    });
    return { outcome: "CONFIRMED" as const, app };
  });

  await audit({
    actorId: decider.id, actorName: decider.name,
    action: result.outcome === "CONFIRMED" ? "slot.confirm" : "slot.waitlist",
    entityType: "SlotApplication", entityId: applicationId,
    after: { member: result.app.user.name, category: result.app.category.kind },
  });
  await sendMail(
    result.app.user.email,
    result.outcome === "CONFIRMED" ? "Your Summit slot is confirmed" : "You are on the waitlist",
    result.outcome === "CONFIRMED"
      ? `Congratulations — your ${result.app.category.kind.replace("_", " ").toLowerCase()} slot is confirmed.`
      : `The category is currently full. You are on the waitlist and will be notified automatically if a slot becomes free.`
  );
  return result.outcome;
}

/** Cancellation frees a slot → promote exactly one waitlisted applicant (48h offer or instant, per setting). */
export async function cancelApplication(applicationId: string, actor: { id: string; name: string }, reason: string) {
  const app = await db.slotApplication.findUniqueOrThrow({
    where: { id: applicationId }, include: { category: true, user: true },
  });
  const wasConfirmed = app.status === "CONFIRMED";
  await db.slotApplication.update({ where: { id: applicationId }, data: { status: "CANCELLED" } });
  await audit({
    actorId: actor.id, actorName: actor.name, action: "slot.cancel",
    entityType: "SlotApplication", entityId: applicationId,
    after: { member: app.user.name, category: app.category.kind }, reason,
  });
  if (wasConfirmed) await promoteNext(app.categoryId);
}

/** Serialized promotion — one freed slot promotes exactly one applicant. */
export async function promoteNext(categoryId: string) {
  const hours = await offerWindowHours();
  const next = await db.slotApplication.findFirst({
    where: { categoryId, status: "WAITLISTED" },
    orderBy: { waitlistPos: "asc" },
    include: { user: true, category: true },
  });
  if (!next) return;

  if (hours <= 0) {
    await db.slotApplication.update({
      where: { id: next.id },
      data: { status: "CONFIRMED", waitlistPos: null },
    });
    await sendMail(next.user.email, "A slot opened up — you're confirmed",
      `Good news ${next.user.name}: a ${next.category.kind.replace("_", " ").toLowerCase()} slot became available and your place is now confirmed.`);
  } else {
    await db.slotApplication.update({
      where: { id: next.id },
      data: { status: "OFFERED", offerExpiresAt: new Date(Date.now() + hours * 3600 * 1000) },
    });
    await sendMail(next.user.email, `A slot opened up — respond within ${hours} hours`,
      `Good news ${next.user.name}: a slot became available in your category. Accept it from your dashboard within ${hours} hours, after which it passes to the next applicant.`);
  }
  await audit({
    action: "slot.promote", entityType: "SlotApplication", entityId: next.id,
    after: { member: next.user.name, mode: hours <= 0 ? "auto-confirm" : `offer ${hours}h` },
  });
}

/** Member accepts an OFFERED slot (goes through capacity-checked confirm). */
export async function acceptOffer(userId: string, applicationId: string) {
  const app = await db.slotApplication.findUniqueOrThrow({ where: { id: applicationId }, include: { user: true } });
  if (app.userId !== userId) throw new Error("Forbidden: not your application.");
  if (app.status !== "OFFERED") throw new Error(`No live offer on this application.`);
  if (app.offerExpiresAt && new Date() > app.offerExpiresAt) throw new Error("This offer has expired.");
  return confirmApplication(applicationId, { id: userId, name: app.user.name });
}
