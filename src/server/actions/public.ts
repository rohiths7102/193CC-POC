"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db";
import { createSession, destroySession, verifyPassword } from "@/server/auth";
import { ROLE_HOME } from "@/server/rbac";
import { startEnrolment, markSigned, mockCardPayment, startDirectDebit } from "@/server/enrolment";
import { checkCompany, isValidCompanyNumber } from "@/server/companies-house";
import { issueEmailCode, confirmEmailCode } from "@/server/email-verification";

// Brute-force guard: 5 failures per identity per 15 minutes (in-memory; move
// to Redis if the app is ever scaled beyond one node).
const loginFails = new Map<string, { n: number; until: number }>();

export async function loginAction(_prev: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");

  const gate = loginFails.get(email);
  if (gate && gate.n >= 5 && Date.now() < gate.until) {
    return { error: "Too many attempts — try again in a few minutes." };
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    const prev = loginFails.get(email);
    loginFails.set(email, { n: (prev?.n ?? 0) + 1, until: Date.now() + 15 * 60_000 });
    return { error: "Invalid email or password." };
  }
  loginFails.delete(email);
  if (user.status === "SUSPENDED") return { error: "This account is suspended." };
  await createSession(user.id, user.role);
  redirect(ROLE_HOME[user.role]);
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

/** Live, pre-submit preview — applicant sees the Companies House match
 *  instantly as they type, before the account even exists. Nothing is
 *  persisted here; the authoritative check re-runs inside startEnrolment(). */
export async function previewCompanyCheckAction(orgNumber: string, orgName: string, applicantName = "") {
  if (!orgNumber?.trim() || !orgName?.trim()) return null;
  return checkCompany(orgNumber.trim(), orgName.trim(), applicantName.trim());
}

/** Resend the 6-digit code from the verify-email step. */
export async function resendEmailCodeAction(_prev: { error?: string; sent?: boolean } | undefined, formData: FormData) {
  const membershipId = String(formData.get("membershipId"));
  const m = await db.membership.findUnique({ where: { id: membershipId } });
  if (!m) return { error: "Application not found." };
  await issueEmailCode(m.userId);
  return { sent: true };
}

/** Confirm the emailed code, then continue to the contract. */
export async function confirmEmailCodeAction(_prev: { error?: string } | undefined, formData: FormData) {
  const membershipId = String(formData.get("membershipId"));
  const code = String(formData.get("code") ?? "");
  const m = await db.membership.findUnique({ where: { id: membershipId } });
  if (!m) return { error: "Application not found." };

  const result = await confirmEmailCode(m.userId, code);
  if (!result.ok) return { error: result.error ?? "Could not confirm that code." };
  redirect(`/sign/${membershipId}`);
}

const EnrolSchema = z.object({
  name: z.string().min(2, "Please enter your full name."),
  email: z.string().email("Please enter a valid email address."),
  company: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  productCode: z.string(),
});

export async function startEnrolmentAction(_prev: { error?: string } | undefined, formData: FormData) {
  const parsed = EnrolSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    company: formData.get("company") || undefined,
    password: formData.get("password"),
    productCode: formData.get("productCode"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const summitCategoryId = String(formData.get("summitCategoryId") || "") || undefined;

  // Business memberships (Enterprise tiers AND the event-linked Temporary
  // membership) must supply organisation details + documents at enrolment;
  // these are verified by staff before activation. Must stay in step with the
  // `org` prop on EnrolForm — only the Individual tier is exempt.
  const isOrgTier = parsed.data.productCode !== "INDIVIDUAL";
  let orgName: string | undefined, orgNumber: string | undefined;
  const orgDocs: string[] = [];
  if (isOrgTier) {
    orgName = String(formData.get("orgName") ?? "").trim() || undefined;
    orgNumber = String(formData.get("orgNumber") ?? "").trim() || undefined;
    if (!orgName) return { error: "Enter your organisation's registered name." };
    // Reject malformed company numbers outright rather than letting a
    // meaningless value flow through and look "checked".
    if (orgNumber && !isValidCompanyNumber(orgNumber)) {
      return { error: "That company registration number isn't valid. UK numbers are 8 digits (e.g. 14499310), or 2 letters followed by 6 digits (e.g. SC123456). Leave it blank if you don't have one." };
    }
    const files = formData.getAll("orgDocs").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) return { error: "Upload at least one organisation document (e.g. certificate of incorporation)." };
    const { saveUpload } = await import("@/server/storage");
    for (const f of files) orgDocs.push(await saveUpload(f, "orgdoc"));
  }

  const existing = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (existing) {
    const open = await db.membership.findFirst({
      where: { userId: existing.id, status: { in: ["DRAFT", "AWAITING_SIGNATURE", "AWAITING_PAYMENT"] } },
    });
    if (open) redirect(`/sign/${open.id}`);
  }

  let result: { membershipId: string; userId: string };
  try {
    result = await startEnrolment({
      ...parsed.data, via: "ONLINE", summitCategoryId,
      orgName, orgNumber, orgDocs: orgDocs.length ? orgDocs : undefined,
      company: parsed.data.company ?? orgName,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not start enrolment." };
  }
  const { membershipId, userId } = result;
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  await createSession(user.id, user.role); // pending member session so they can sign & pay

  // Prove they own the address before anything gets signed in their name.
  if (!user.emailVerifiedAt) {
    await issueEmailCode(user.id);
    redirect(`/verify-email/${membershipId}`);
  }
  redirect(`/sign/${membershipId}`);
}

export async function signContractAction(_prev: { error?: string } | undefined, formData: FormData) {
  const membershipId = String(formData.get("membershipId"));
  const signerName = String(formData.get("signerName") ?? "").trim();
  const agreed = formData.get("agreed") === "on";
  if (signerName.length < 2) return { error: "Type your full legal name to sign." };
  if (!agreed) return { error: "You must confirm you have read the agreement." };

  const m = await db.membership.findUnique({ where: { id: membershipId }, include: { user: true } });
  if (!m) return { error: "Enrolment not found." };
  try {
    await markSigned(membershipId, signerName, m.user.email);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not sign." };
  }
  redirect(`/pay/${membershipId}`);
}

export async function payCardAction(_prev: { error?: string } | undefined, formData: FormData) {
  const membershipId = String(formData.get("membershipId"));
  try {
    await mockCardPayment(membershipId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Payment failed." };
  }
  redirect(`/status/${membershipId}`);
}

export async function payDirectDebitAction(_prev: { error?: string } | undefined, formData: FormData) {
  const membershipId = String(formData.get("membershipId"));
  const months = Number(formData.get("months")) === 3 ? 3 : 6;
  try {
    await startDirectDebit(membershipId, months as 3 | 6);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not set up Direct Debit." };
  }
  redirect(`/status/${membershipId}`);
}
