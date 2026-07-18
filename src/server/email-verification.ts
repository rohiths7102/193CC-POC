import "server-only";
import crypto from "crypto";
import { db } from "./db";
import { sendMail } from "./mail";
import { audit } from "./audit";

/**
 * Email ownership verification: a 6-digit code is emailed at enrolment and
 * must be entered before the applicant can reach the contract. Proves the
 * address is real and belongs to them — a signature sent to an address
 * nobody controls is worthless.
 *
 * In demo mode the code also appears in the admin Email log, so it can be
 * completed without leaving the platform.
 */

const CODE_TTL_MIN = 15;

export async function issueEmailCode(userId: string): Promise<void> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.emailVerifiedAt) return; // already proven, don't nag

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await db.user.update({
    where: { id: userId },
    data: { emailCode: code, emailCodeExpires: new Date(Date.now() + CODE_TTL_MIN * 60_000) },
  });
  await sendMail(
    user.email,
    `Your verification code: ${code}`,
    `Hello ${user.name}, your 193 Countries Consortium verification code is ${code}. ` +
      `It expires in ${CODE_TTL_MIN} minutes. If you did not start a membership application, ignore this email.`
  );
}

export async function confirmEmailCode(userId: string, entered: string): Promise<{ ok: boolean; error?: string }> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.emailVerifiedAt) return { ok: true };

  const code = entered.replace(/\s+/g, "");
  if (!user.emailCode || !user.emailCodeExpires) return { ok: false, error: "No code has been issued — request a new one." };
  if (user.emailCodeExpires < new Date()) return { ok: false, error: "That code has expired — request a new one." };
  if (user.emailCode !== code) return { ok: false, error: "That code is not correct." };

  await db.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: new Date(), emailCode: null, emailCodeExpires: null },
  });
  await audit({
    actorId: user.id, actorName: user.name, action: "email.verified",
    entityType: "User", entityId: user.id, after: { email: user.email },
  });
  return { ok: true };
}
