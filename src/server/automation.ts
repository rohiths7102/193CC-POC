import "server-only";
import { db } from "./db";
import { audit } from "./audit";
import { sendMail } from "./mail";
import { autoVerifyOrganisation } from "./enrolment";
import { AUTOMATION, AUTOMATION_ACTOR, automationEnabled } from "./settings";

const DAY_MS = 24 * 3600 * 1000;

/**
 * Sweep: evaluate every membership already sitting in PENDING_VERIFICATION
 * that the rule has not yet seen (autoVerifyAt is null) — e.g. applications
 * made before the automation existed, or while it was switched off.
 */
export async function sweepPendingVerifications(): Promise<{ approved: number; exceptions: number }> {
  const result = { approved: 0, exceptions: 0 };
  if (!(await automationEnabled(AUTOMATION.orgVerify))) return result;
  const pending = await db.membership.findMany({
    where: { status: "PENDING_VERIFICATION", autoVerifyAt: null, verifiedAt: null },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: 50, // Companies House allows 600 req / 5 min; 2 calls each keeps us well inside
  });
  for (const { id } of pending) {
    const outcome = await autoVerifyOrganisation(id);
    if (outcome === "approved") result.approved++;
    if (outcome === "exception") result.exceptions++;
  }
  return result;
}

/**
 * Renewal reminders at 30 and 7 days before periodEnd, for ACTIVE annual
 * memberships. Each reminder is claimed by stamping its column in a
 * conditional update BEFORE the email is queued, so it is sent at most once
 * even if two ticks overlap. A membership first seen inside the 7-day window
 * gets only the 7-day reminder (its 30-day slot is stamped as superseded).
 */
export async function sendRenewalReminders(now = new Date()): Promise<number> {
  if (!(await automationEnabled(AUTOMATION.renewalReminders))) return 0;
  let sent = 0;

  const windows = [
    { days: 7, field: "renewalReminder7At" as const },
    { days: 30, field: "renewalReminder30At" as const },
  ];
  for (const w of windows) {
    const due = await db.membership.findMany({
      where: {
        status: "ACTIVE",
        product: { billing: "ANNUAL" },
        periodEnd: { gt: now, lte: new Date(now.getTime() + w.days * DAY_MS) },
        [w.field]: null,
      },
      include: { user: true, product: true },
    });
    for (const m of due) {
      const claim = await db.membership.updateMany({
        where: { id: m.id, [w.field]: null },
        data: w.days === 7
          ? { renewalReminder7At: now, renewalReminder30At: m.renewalReminder30At ?? now }
          : { renewalReminder30At: now },
      });
      if (claim.count === 0) continue;
      const end = m.periodEnd!;
      const daysLeft = Math.max(1, Math.ceil((end.getTime() - now.getTime()) / DAY_MS));
      const endStr = end.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });
      await sendMail(m.user.email, `Your ${m.product.name} renews on ${endStr}`,
        `Hello ${m.user.name}, your ${m.product.name} runs until ${endStr} (${daysLeft} day${daysLeft === 1 ? "" : "s"} from now). ` +
        `Sign in to your dashboard to renew and keep your benefits without interruption. If you have any questions, reply to this email or contact the membership office.`);
      await audit({
        actorName: AUTOMATION_ACTOR, action: `renewal.reminder_${w.days}d`,
        entityType: "Membership", entityId: m.id,
        after: { member: m.user.name, product: m.product.name, periodEnd: end.toISOString(), daysLeft },
        reason: `Automatic renewal reminder (${w.days}-day window).`,
      });
      sent++;
    }
  }
  return sent;
}

/**
 * Editorial content is NEVER auto-approved. This only nudges staff when an
 * article or video brief has been waiting for review for more than 48 hours.
 * One reminder per item per waiting period: the audit log is the record
 * (an entry newer than the item's last update means it was already sent).
 */
export async function sendContentReviewReminders(now = new Date()): Promise<number> {
  if (!(await automationEnabled(AUTOMATION.contentReviewReminders))) return 0;
  const cutoff = new Date(now.getTime() - 48 * 3600 * 1000);

  const [articles, videos] = await Promise.all([
    db.article.findMany({
      where: { status: { in: ["SUBMITTED", "IN_REVIEW"] }, updatedAt: { lt: cutoff } },
      include: { member: true },
    }),
    db.videoTask.findMany({
      where: { status: "BRIEF_SUBMITTED", updatedAt: { lt: cutoff } },
      include: { member: true },
    }),
  ]);
  const items = [
    ...articles.map((a) => ({ type: "Article", id: a.id, since: a.updatedAt, label: `Article "${a.title}" by ${a.member.name} (${a.status.replace("_", " ").toLowerCase()})` })),
    ...videos.map((v) => ({ type: "VideoTask", id: v.id, since: v.updatedAt, label: `Video brief from ${v.member.name}` })),
  ];
  if (items.length === 0) return 0;

  const already = await db.auditLog.findMany({
    where: { action: "content.review_reminder", entityId: { in: items.map((i) => i.id) } },
    select: { entityId: true, createdAt: true },
  });
  const fresh = items.filter((i) => !already.some((a) => a.entityId === i.id && a.createdAt >= i.since));
  if (fresh.length === 0) return 0;

  for (const i of fresh) {
    await audit({
      actorName: AUTOMATION_ACTOR, action: "content.review_reminder",
      entityType: i.type, entityId: i.id,
      after: { item: i.label, waitingSince: i.since.toISOString() },
      reason: "Automatic reminder: waiting for staff review for more than 48 hours.",
    });
  }
  const staff = await db.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { email: true } });
  const hours = (d: Date) => Math.floor((now.getTime() - d.getTime()) / 3600_000);
  const body =
    `The following ${fresh.length === 1 ? "item has" : `${fresh.length} items have`} been waiting for review for more than 48 hours:\n\n` +
    fresh.map((i) => `• ${i.label} — waiting ${hours(i.since)}h`).join("\n") +
    `\n\nReview them in Admin → Approvals. Content is never approved automatically.`;
  for (const s of staff) {
    await sendMail(s.email, `Reminder: ${fresh.length} content item${fresh.length === 1 ? "" : "s"} awaiting review`, body);
  }
  return fresh.length;
}
