"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { manualUnlock } from "@/server/wallet";
import { credit } from "@/server/wallet";
import { confirmApplication, cancelApplication } from "@/server/summit";
import { startEnrolment, collectNextInstalment, verifyMembership } from "@/server/enrolment";
import { audit } from "@/server/audit";
import { sendMail } from "@/server/mail";
import { checkCompany } from "@/server/companies-house";
import type { ArticleStatus, LeadStage, VideoStatus } from "@prisma/client";

// ── Admin: wallet & unlock overrides (reason mandatory, audited) ──
export async function manualUnlockAction(_prev: { error?: string } | undefined, formData: FormData) {
  const admin = await requireUser("manage_all_memberships");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "A reason is required — it is written to the audit log." };
  await manualUnlock({
    adminId: admin.id, adminName: admin.name,
    userId: String(formData.get("userId")), benefitKey: "main_event_delegate", reason,
  });
  revalidatePath("/portal/admin/members");
  return {};
}

export async function manualCreditAction(_prev: { error?: string } | undefined, formData: FormData) {
  const admin = await requireUser("manage_all_memberships");
  const amountMinor = Math.round(Number(formData.get("amount")) * 100);
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "A reason is required for manual ledger entries." };
  if (!Number.isFinite(amountMinor) || amountMinor === 0) return { error: "Enter a non-zero amount." };
  await credit({
    userId: String(formData.get("userId")),
    type: amountMinor > 0 ? "ADJUSTMENT" : "REFUND",
    amountMinor, provider: "MANUAL", reason, createdById: admin.id,
  });
  await audit({
    actorId: admin.id, actorName: admin.name, action: "ledger.manual",
    entityType: "User", entityId: String(formData.get("userId")),
    after: { amountMinor }, reason,
  });
  revalidatePath("/portal/admin/payments");
  return {};
}

export async function collectInstalmentAction(formData: FormData) {
  const actor = await requireUser("manage_all_memberships");
  await collectNextInstalment(String(formData.get("membershipId")), { id: actor.id, name: actor.name });
  revalidatePath("/portal/admin/payments");
  revalidatePath("/portal/admin/members");
}

// ── Admin/Sales: summit console ──
export async function confirmSlotAction(formData: FormData) {
  const actor = await requireUser("approve_intent_waitlist");
  await confirmApplication(String(formData.get("applicationId")), { id: actor.id, name: actor.name });
  revalidatePath("/portal/admin/summit");
}

export async function cancelSlotAction(_prev: { error?: string } | undefined, formData: FormData) {
  const actor = await requireUser("approve_intent_waitlist");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "A reason is required to cancel a slot." };
  await cancelApplication(String(formData.get("applicationId")), { id: actor.id, name: actor.name }, reason);
  revalidatePath("/portal/admin/summit");
  return {};
}

// ── Admin: content approvals ──
export async function reviewArticleAction(formData: FormData) {
  const admin = await requireUser("approve_publish_content");
  const id = String(formData.get("id"));
  const decision = String(formData.get("decision")) as ArticleStatus;
  const note = String(formData.get("note") ?? "");
  if (!["IN_REVIEW", "CHANGES_REQUESTED", "APPROVED", "PUBLISHED"].includes(decision)) return;

  const article = await db.article.update({
    where: { id },
    data: {
      status: decision, reviewerId: admin.id, reviewNote: note || null,
      ...(decision === "PUBLISHED" ? { publishedAt: new Date() } : {}),
    },
    include: { member: true },
  });
  await audit({
    actorId: admin.id, actorName: admin.name, action: `article.${decision.toLowerCase()}`,
    entityType: "Article", entityId: id, after: { title: article.title }, reason: note || undefined,
  });
  await sendMail(article.member.email, `Your article is ${decision.replace("_", " ").toLowerCase()}`,
    `"${article.title}" — status updated to ${decision.replace("_", " ").toLowerCase()}.${note ? ` Reviewer note: ${note}` : ""}`);
  revalidatePath("/portal/admin/approvals");
}

export async function advanceVideoAction(formData: FormData) {
  const actor = await requireUser("approve_publish_content");
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as VideoStatus;

  // Production data travels with the stage: shoot date when scheduling,
  // final asset when delivering (§5.8 — a pipeline, not a checklist).
  const shootRaw = formData.get("shootDate");
  const shootDate = shootRaw ? new Date(String(shootRaw)) : undefined;
  let assetPath: string | undefined;
  const asset = formData.get("asset");
  if (asset instanceof File && asset.size > 0) {
    const { saveUpload } = await import("@/server/storage");
    assetPath = await saveUpload(asset, "video");
  }

  await db.videoTask.update({
    where: { id },
    data: {
      status,
      ...(shootDate && !Number.isNaN(shootDate.getTime()) ? { shootDate } : {}),
      ...(assetPath ? { assetPath } : {}),
    },
  });
  await audit({ actorId: actor.id, actorName: actor.name, action: `video.${status.toLowerCase()}`, entityType: "VideoTask", entityId: id, after: { shootDate: shootDate?.toISOString(), assetPath } });
  revalidatePath("/portal/admin/approvals");
}

// ── Admin: mentor assignment (§5.5 — "Administrator assigns a Mentor/Consultant") ──
export async function assignMentorAction(_prev: { error?: string } | undefined, formData: FormData) {
  const admin = await requireUser("manage_all_memberships");
  const memberId = String(formData.get("memberId"));
  const mentorId = String(formData.get("mentorId"));
  const kind = String(formData.get("kind") ?? "senior");

  const mentor = await db.user.findUnique({ where: { id: mentorId } });
  if (!mentor || !["MENTOR", "CONSULTANT"].includes(mentor.role)) {
    return { error: "Pick a Mentor or Consultant account." };
  }
  await db.mentorAssignment.upsert({
    where: { mentorId_memberId: { mentorId, memberId } },
    create: { mentorId, memberId, kind, active: true },
    update: { kind, active: true },
  });
  await audit({
    actorId: admin.id, actorName: admin.name, action: "mentoring.assign",
    entityType: "User", entityId: memberId, after: { mentor: mentor.name, kind },
  });
  revalidatePath(`/portal/admin/members/${memberId}`);
  return {};
}

export async function endAssignmentAction(formData: FormData) {
  const admin = await requireUser("manage_all_memberships");
  const id = String(formData.get("assignmentId"));
  const a = await db.mentorAssignment.update({ where: { id }, data: { active: false }, include: { mentor: true } });
  await audit({
    actorId: admin.id, actorName: admin.name, action: "mentoring.unassign",
    entityType: "User", entityId: a.memberId, after: { mentor: a.mentor.name },
  });
  revalidatePath(`/portal/admin/members/${a.memberId}`);
}

// ── Admin/Sales: invite a member to a Summit category (§5.7 — "pre-accepted profiles are invited online") ──
export async function inviteToSummitAction(_prev: { error?: string } | undefined, formData: FormData) {
  const actor = await requireUser("approve_intent_waitlist");
  const categoryId = String(formData.get("categoryId"));
  const memberId = String(formData.get("memberId"));

  const cat = await db.summitCategory.findUnique({ where: { id: categoryId }, include: { summit: true } });
  if (!cat || cat.summit.status !== "OPEN") return { error: "That category's Summit is not open." };

  // "One opportunity, one event, per annum": one live application per member per Summit,
  // across ALL its categories.
  const existing = await db.slotApplication.findFirst({
    where: {
      userId: memberId,
      category: { summitId: cat.summitId },
      status: { notIn: ["CANCELLED", "EXPIRED"] },
    },
    include: { category: true },
  });
  if (existing) {
    return { error: `This member already holds a live ${existing.category.kind.replace("_", " ").toLowerCase()} application for this Summit — one opportunity per event.` };
  }

  const member = await db.user.findUniqueOrThrow({ where: { id: memberId } });
  await db.slotApplication.create({ data: { categoryId, userId: memberId, status: "INVITED" } });
  await audit({
    actorId: actor.id, actorName: actor.name, action: "slot.invite",
    entityType: "SlotApplication", entityId: categoryId, after: { member: member.name, category: cat.kind },
  });
  await sendMail(member.email, "You're invited — UK Investors Summit",
    `Dear ${member.name}, your profile has been pre-accepted for the ${cat.kind.replace("_", " ").toLowerCase()} category. Sign in and upload your intent letter before the deadline to secure your slot.`);
  revalidatePath("/portal/admin/summit");
  return {};
}

// ── Admin: create a Summit (event + 3 categories) ──
export async function createSummitAction(_prev: { error?: string } | undefined, formData: FormData) {
  const admin = await requireUser("configure_system");
  const name = String(formData.get("name") ?? "").trim();
  const venue = String(formData.get("venue") ?? "").trim();
  const startsAt = new Date(String(formData.get("startsAt")));
  const deadlineAt = new Date(String(formData.get("deadlineAt")));
  const capacity = Math.max(1, Number(formData.get("capacity")) || 15);
  if (!name || !venue) return { error: "Name and venue are required." };
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(deadlineAt.getTime())) return { error: "Set both dates." };
  if (deadlineAt >= startsAt) return { error: "The intent-letter deadline must be before the event date." };

  const event = await db.event.create({
    data: {
      kind: "SUMMIT", name, venue, startsAt,
      summit: { create: {
        deadlineAt,
        categories: { create: [
          { kind: "PRESENTATION", capacity },
          { kind: "BRAND_LAUNCH", capacity },
          { kind: "AWARD", capacity },
        ]},
      }},
    },
  });
  await audit({
    actorId: admin.id, actorName: admin.name, action: "summit.create",
    entityType: "Event", entityId: event.id, after: { name, venue, capacity },
  });
  revalidatePath("/portal/admin/summit");
  return {};
}

// ── Admin: GDPR right-to-erasure (anonymise; financial ledger retained lawfully) ──
export async function eraseMemberAction(_prev: { error?: string } | undefined, formData: FormData) {
  const admin = await requireUser("manage_all_memberships");
  const userId = String(formData.get("userId"));
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "A reason is required — erasures are audited." };

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "MEMBER") return { error: "Only member accounts can be erased." };

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: {
        name: "Erased Member",
        email: `erased-${userId.slice(0, 8)}@erased.invalid`,
        company: null,
        passwordHash: "erased",
        status: "SUSPENDED",
      },
    }),
    db.membership.updateMany({ where: { userId, status: "ACTIVE" }, data: { status: "CANCELLED" } }),
    // Contracts + append-only ledger are retained under legal-obligation basis
    // (financial records); identity fields above are gone.
    db.pitch.deleteMany({ where: { memberId: userId } }),
    db.article.deleteMany({ where: { memberId: userId, status: { not: "PUBLISHED" } } }),
    db.lead.deleteMany({ where: { email: user.email } }),
  ]);
  await audit({
    actorId: admin.id, actorName: admin.name, action: "gdpr.erase",
    entityType: "User", entityId: userId, reason,
  });
  revalidatePath("/portal/admin/members");
  return {};
}

// ── Admin: re-run the Companies House cross-check (e.g. after a real API
//    key is configured, or the applicant corrected a typo'd number) ──
export async function recheckCompanyAction(formData: FormData) {
  const admin = await requireUser("approve_intent_waitlist");
  const membershipId = String(formData.get("membershipId"));
  const m = await db.membership.findUniqueOrThrow({ where: { id: membershipId } });
  if (!m.orgNumber || !m.orgName) return;

  const applicant = await db.user.findUnique({ where: { id: m.userId }, select: { name: true } });
  const check = await checkCompany(m.orgNumber, m.orgName, applicant?.name ?? "");
  await db.membership.update({
    where: { id: membershipId },
    data: {
      chStatus: check.status, chOfficialName: check.officialName,
      chIncorporatedAt: check.incorporatedAt, chNameMatches: check.nameMatches,
      chCheckedAt: new Date(), chSimulated: check.simulated,
      chOfficers: check.officers, chDirectorMatch: check.directorMatch,
    },
  });
  await audit({
    actorId: admin.id, actorName: admin.name, action: "verification.ch_recheck",
    entityType: "Membership", entityId: membershipId,
    after: { status: check.status, nameMatches: check.nameMatches, simulated: check.simulated },
  });
  revalidatePath("/portal/admin/verification");
}

// ── Admin: organisation verification queue (client change, Jul 13 notes) ──
export async function verifyOrgAction(_prev: { error?: string } | undefined, formData: FormData) {
  const admin = await requireUser("approve_intent_waitlist");
  const membershipId = String(formData.get("membershipId"));
  const decision = formData.get("decision") === "approve" ? "approve" as const : "reject" as const;
  const reason = String(formData.get("reason") ?? "").trim() || undefined;
  try {
    await verifyMembership(membershipId, decision, { id: admin.id, name: admin.name }, reason);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Verification action failed." };
  }
  revalidatePath("/portal/admin/verification");
  revalidatePath("/portal/admin/members");
  return {};
}

// ── Admin: product fee editing (§3 — "fees configurable, not hard-coded") ──
export async function updatePriceAction(_prev: { error?: string } | undefined, formData: FormData) {
  const admin = await requireUser("configure_system");
  const productId = String(formData.get("productId"));
  const price = Math.round(Number(formData.get("price")) * 100);
  if (!Number.isFinite(price) || price <= 0) return { error: "Enter a valid fee." };
  const before = await db.product.findUniqueOrThrow({ where: { id: productId } });
  await db.product.update({ where: { id: productId }, data: { priceMinor: price } });
  await audit({
    actorId: admin.id, actorName: admin.name, action: "product.price_change",
    entityType: "Product", entityId: productId,
    before: { priceMinor: before.priceMinor }, after: { priceMinor: price },
  });
  revalidatePath("/portal/admin/settings");
  return {};
}

// ── Sales: leads + manual enrolment ──
export async function saveLeadAction(_prev: { error?: string } | undefined, formData: FormData) {
  const rep = await requireUser("enrol_members");
  const id = String(formData.get("id") ?? "");
  const data = {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    company: String(formData.get("company") ?? "") || null,
    stage: String(formData.get("stage") ?? "NEW") as LeadStage,
    notes: String(formData.get("notes") ?? "") || null,
  };
  if (!data.name || !data.email) return { error: "Name and email are required." };
  if (id) {
    const lead = await db.lead.findUnique({ where: { id } });
    if (!lead || (lead.salesRepId !== rep.id && rep.role !== "ADMIN")) return { error: "Not your lead." };
    await db.lead.update({ where: { id }, data });
  } else {
    await db.lead.create({ data: { ...data, salesRepId: rep.id } });
  }
  revalidatePath("/portal/sales");
  return {};
}

export async function manualEnrolAction(_prev: { error?: string } | undefined, formData: FormData) {
  const rep = await requireUser("enrol_members");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const productCode = String(formData.get("productCode"));
  if (!name || !email) return { error: "Name and email are required." };
  const { membershipId } = await startEnrolment({
    name, email, company: String(formData.get("company") ?? "") || undefined,
    productCode, via: "MANUAL", salesRepId: rep.id,
  });
  redirect(`/sign/${membershipId}?manual=1`);
}

// ── Mentor/Consultant: log delivery ──
export async function logSessionAction(_prev: { error?: string } | undefined, formData: FormData) {
  const actor = await requireUser("access_assigned_members");
  const id = String(formData.get("sessionId"));
  const notes = String(formData.get("notes") ?? "").trim();
  const session = await db.mentoringSession.findUnique({
    where: { id }, include: { assignment: true },
  });
  if (!session || session.assignment.mentorId !== actor.id) return { error: "Not your session." };
  await db.mentoringSession.update({
    where: { id },
    data: { status: "DELIVERED", notes: notes || null, loggedById: actor.id },
  });
  await audit({
    actorId: actor.id, actorName: actor.name, action: "mentoring.delivered",
    entityType: "MentoringSession", entityId: id, after: { durationMin: session.durationMin },
  });
  revalidatePath("/portal/mentor");
  return {};
}

// ── Investor: express interest (consent-scoped) ──
export async function expressInterestAction(_prev: { error?: string } | undefined, formData: FormData) {
  const investor = await requireUser("view_dealflow");
  const pitchId = String(formData.get("pitchId"));
  const pitch = await db.pitch.findUnique({ where: { id: pitchId } });
  if (!pitch || !pitch.visibilityConsent) return { error: "This pitch is not visible to investors." };
  await db.investorInterest.upsert({
    where: { pitchId_investorId: { pitchId, investorId: investor.id } },
    create: { pitchId, investorId: investor.id, note: String(formData.get("note") ?? "") || null },
    update: { note: String(formData.get("note") ?? "") || null },
  });
  await audit({
    actorId: investor.id, actorName: investor.name, action: "dealflow.interest",
    entityType: "Pitch", entityId: pitchId,
  });
  revalidatePath("/portal/investor");
  return {};
}

// ── Admin: settings ──
export async function saveSettingAction(formData: FormData) {
  const admin = await requireUser("configure_system");
  const key = String(formData.get("key"));
  const raw = String(formData.get("value"));
  const value = raw === "true" ? true : raw === "false" ? false : Number.isFinite(Number(raw)) && raw !== "" ? Number(raw) : raw;
  const before = await db.setting.findUnique({ where: { key } });
  await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  await audit({
    actorId: admin.id, actorName: admin.name, action: "settings.update",
    entityType: "Setting", entityId: key,
    before: before ? { value: before.value as object } : undefined,
    after: { value },
  });
  revalidatePath("/portal/admin/settings");
}
