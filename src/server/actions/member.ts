"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { resolveEntitlements } from "@/server/entitlements";
import { submitIntent, acceptOffer } from "@/server/summit";
import { saveUpload } from "@/server/storage";
import { audit } from "@/server/audit";
import { sendMail } from "@/server/mail";

/** Major Event booking — the benefit the £2,600 wallet (or Individual tier) unlocks.
 *  Entitlement checked server-side; capacity enforced under a row lock. */
export async function bookMainEventAction(_prev: { error?: string } | undefined, formData: FormData) {
  const user = await requireUser("view_own_dashboard");
  const ent = await resolveEntitlements(user.id);
  if (!ent.has("main_event_delegate")) {
    return { error: "The Major Event benefit is not unlocked on your account yet." };
  }
  const eventId = String(formData.get("eventId"));

  try {
    await db.$transaction(async (tx) => {
      const event = await tx.event.findUniqueOrThrow({ where: { id: eventId } });
      if (event.kind !== "MAIN_EVENT") throw new Error("Not a Main Event.");
      if (event.startsAt < new Date()) throw new Error("This event has already taken place.");

      // Row lock so simultaneous bookings cannot exceed venue capacity.
      await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${eventId} FOR UPDATE`;
      const confirmed = await tx.eventRegistration.count({
        where: { eventId, status: "CONFIRMED" },
      });
      if (event.capacity && confirmed >= event.capacity) {
        throw new Error("This event is at capacity — the team will be notified of your interest.");
      }
      await tx.eventRegistration.upsert({
        where: { eventId_userId: { eventId, userId: user.id } },
        create: { eventId, userId: user.id, roleAt: "delegate" },
        update: { status: "CONFIRMED" },
      });
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not book." };
  }

  const event = await db.event.findUniqueOrThrow({ where: { id: eventId } });
  await audit({
    actorId: user.id, actorName: user.name, action: "event.register",
    entityType: "Event", entityId: eventId, after: { event: event.name, roleAt: "delegate" },
  });
  await sendMail(user.email, `You're confirmed — ${event.name}`,
    `Dear ${user.name}, your delegate place at ${event.name} (${event.venue}) is confirmed. Event-day guidance will follow closer to the date.`);
  revalidatePath("/portal/dashboard");
  return {};
}

/** Summit: upload intent letter (deadline enforced server-side in submitIntent). */
export async function submitIntentAction(_prev: { error?: string } | undefined, formData: FormData) {
  const user = await requireUser("book_manage_summit");
  const applicationId = String(formData.get("applicationId"));
  const file = formData.get("intentLetter") as File | null;
  if (!file || file.size === 0) return { error: "Attach your signed intent letter (PDF)." };
  try {
    const key = await saveUpload(file, "intent");
    await submitIntent(user.id, applicationId, key);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not submit." };
  }
  revalidatePath("/portal/summit");
  return {};
}

export async function acceptOfferAction(formData: FormData) {
  const user = await requireUser("book_manage_summit");
  await acceptOffer(user.id, String(formData.get("applicationId")));
  revalidatePath("/portal/summit");
}

/** Mentoring: book a session against the monthly allowance — checked server-side. */
export async function bookSessionAction(_prev: { error?: string } | undefined, formData: FormData) {
  const user = await requireUser("view_log_mentoring");
  const assignmentId = String(formData.get("assignmentId"));
  const scheduledAt = new Date(String(formData.get("scheduledAt")));
  const durationMin = Number(formData.get("durationMin"));
  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt < new Date()) return { error: "Pick a future date and time." };
  if (![30, 60, 90, 120].includes(durationMin)) return { error: "Invalid duration." };

  // Both parties can book (§5.5): the member themselves, or the assigned
  // mentor/consultant on the member's behalf. The allowance is always the MEMBER's.
  const assignment = await db.mentorAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment || (assignment.memberId !== user.id && assignment.mentorId !== user.id)) {
    return { error: "Not your mentoring assignment." };
  }
  const memberId = assignment.memberId;

  const ent = await resolveEntitlements(memberId);
  let allowanceMin = ent.mentoringHours * 60;
  const monthStart = new Date(scheduledAt.getFullYear(), scheduledAt.getMonth(), 1);
  const monthEnd = new Date(scheduledAt.getFullYear(), scheduledAt.getMonth() + 1, 1);

  // Rollover policy (client Q5, configurable): if enabled, last month's unused
  // hours carry forward — capped at one extra month's allowance.
  const rollover = await db.setting.findUnique({ where: { key: "mentoring.rollover_enabled" } });
  if (rollover?.value === true) {
    const prevStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
    const prevUsed = await db.mentoringSession.aggregate({
      where: {
        assignment: { memberId },
        scheduledAt: { gte: prevStart, lt: monthStart },
        status: { in: ["BOOKED", "DELIVERED"] },
      },
      _sum: { durationMin: true },
    });
    allowanceMin += Math.max(0, ent.mentoringHours * 60 - (prevUsed._sum.durationMin ?? 0));
  }

  const used = await db.mentoringSession.aggregate({
    where: {
      assignment: { memberId },
      scheduledAt: { gte: monthStart, lt: monthEnd },
      status: { in: ["BOOKED", "DELIVERED"] },
    },
    _sum: { durationMin: true },
  });
  if ((used._sum.durationMin ?? 0) + durationMin > allowanceMin) {
    return { error: `That booking exceeds the ${Math.floor(allowanceMin / 60)} hr allowance for that month.` };
  }

  await db.mentoringSession.create({
    data: { assignmentId, scheduledAt, durationMin, loggedById: user.id },
  });
  revalidatePath("/portal/mentoring");
  revalidatePath("/portal/mentor");
  return {};
}

/** Articles (Enterprise benefit) — word cap hard-enforced server-side. */
export async function saveArticleAction(_prev: { error?: string } | undefined, formData: FormData) {
  const user = await requireUser("submit_edit_content");
  const ent = await resolveEntitlements(user.id);
  if (!ent.has("article")) return { error: "Your membership does not include the website article benefit." };

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const submit = formData.get("submit") === "true";
  const wordCount = body ? body.split(/\s+/).filter(Boolean).length : 0;

  if (!title) return { error: "Give your article a title." };
  if (wordCount > ent.articleMaxWords) {
    return { error: `Articles are capped at ${ent.articleMaxWords} words — you are at ${wordCount}.` };
  }

  const images: string[] = [];
  for (const f of formData.getAll("images")) {
    if (f instanceof File && f.size > 0) images.push(await saveUpload(f, "article"));
  }
  if (images.length > 2) return { error: "A maximum of 2 images is allowed." };

  const data = {
    title, body, wordCount,
    status: submit ? ("SUBMITTED" as const) : ("DRAFT" as const),
    ...(images.length ? { images } : {}),
  };

  if (id) {
    const existing = await db.article.findUnique({ where: { id } });
    if (!existing || (existing.memberId !== user.id && user.role === "MEMBER")) return { error: "Not found." };
    if (["APPROVED", "PUBLISHED"].includes(existing.status)) return { error: "Approved articles are locked." };
    await db.article.update({ where: { id }, data });
  } else {
    await db.article.create({ data: { ...data, memberId: user.id, images } });
  }
  if (submit) {
    await audit({ actorId: user.id, actorName: user.name, action: "article.submit", entityType: "Article", entityId: id || "new", after: { title, wordCount } });
  }
  revalidatePath("/portal/content");
  return {};
}

export async function submitVideoBriefAction(_prev: { error?: string } | undefined, formData: FormData) {
  const user = await requireUser("submit_edit_content");
  const ent = await resolveEntitlements(user.id);
  if (!ent.has("branding_video")) return { error: "Your membership does not include the branding video benefit." };
  const brief = String(formData.get("brief") ?? "").trim();
  if (brief.length < 30) return { error: "Give the production team a fuller brief (at least 30 characters)." };
  await db.videoTask.create({ data: { memberId: user.id, brief } });
  revalidatePath("/portal/content");
  return {};
}

/** Public profile (Enterprise benefit, client change Jul 13): logo, photo,
 *  bio, shareable slug, and a public/private toggle. Award status is pulled
 *  live from the Summit AWARD category — never self-declared. */
export async function updateProfileAction(_prev: { error?: string } | undefined, formData: FormData) {
  const user = await requireUser("view_own_dashboard");
  const ent = await resolveEntitlements(user.id);
  if (!ent.has("investor_visibility")) {
    return { error: "The public profile is an Enterprise membership benefit." };
  }

  const bio = String(formData.get("bio") ?? "").trim().slice(0, 600) || null;
  const makePublic = formData.get("public") === "on";

  let slug = String(formData.get("slug") ?? "").trim().toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  if (!slug) {
    slug = (user.company ?? user.name).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  }
  const clash = await db.user.findFirst({ where: { profileSlug: slug, NOT: { id: user.id } } });
  if (clash) return { error: `The link "${slug}" is already taken — choose another.` };

  let logoPath: string | undefined, photoPath: string | undefined;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) logoPath = await saveUpload(logo, "logo");
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) photoPath = await saveUpload(photo, "photo");

  const before = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { profilePublic: true } });
  await db.user.update({
    where: { id: user.id },
    data: {
      profileSlug: slug, profileBio: bio, profilePublic: makePublic,
      ...(logoPath ? { logoPath } : {}), ...(photoPath ? { photoPath } : {}),
    },
  });
  if (before.profilePublic !== makePublic) {
    await audit({
      actorId: user.id, actorName: user.name,
      action: makePublic ? "profile.published" : "profile.unpublished",
      entityType: "User", entityId: user.id, after: { slug },
    });
  }
  revalidatePath("/portal/profile");
  revalidatePath(`/profile/${slug}`);
  return {};
}

/** Deal-flow consent + pitch (Enterprise benefit). */
export async function savePitchAction(_prev: { error?: string } | undefined, formData: FormData) {
  const user = await requireUser("view_own_dashboard");
  const ent = await resolveEntitlements(user.id);
  if (!ent.has("investor_visibility")) return { error: "Pitching to investors is an Enterprise benefit." };

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const consent = formData.get("consent") === "on";
  if (!title || !summary) return { error: "Title and summary are required." };

  const newMaterials: string[] = [];
  for (const f of formData.getAll("materials")) {
    if (f instanceof File && f.size > 0) newMaterials.push(await saveUpload(f, "pitch"));
  }

  if (id) {
    const existing = await db.pitch.findUnique({ where: { id } });
    if (!existing || existing.memberId !== user.id) return { error: "Not found." };
    const materials = [...((existing.materials as string[]) ?? []), ...newMaterials];
    await db.pitch.update({ where: { id }, data: { title, summary, visibilityConsent: consent, materials } });
  } else {
    await db.pitch.create({ data: { memberId: user.id, title, summary, materials: newMaterials, visibilityConsent: consent } });
  }
  await audit({
    actorId: user.id, actorName: user.name, action: consent ? "pitch.consent_on" : "pitch.consent_off",
    entityType: "Pitch", entityId: id || "new", after: { title },
  });
  revalidatePath("/portal/pitch");
  return {};
}
