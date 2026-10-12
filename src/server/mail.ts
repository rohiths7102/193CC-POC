import "server-only";
import { db } from "./db";

/**
 * Transactional mail. Every message is recorded in EmailOutbox (admin Email
 * log = delivery audit trail). When POSTMARK_SERVER_TOKEN is set the message
 * is ALSO delivered for real via Postmark; without it the outbox is the
 * (clearly labelled) demo delivery. Call sites never change.
 */
export async function sendMail(toEmail: string, subject: string, body: string) {
  await db.emailOutbox.create({ data: { toEmail, subject, body } });

  const token = process.env.POSTMARK_SERVER_TOKEN;
  if (!token) return;
  try {
    const res = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Postmark-Server-Token": token,
      },
      body: JSON.stringify({
        From: process.env.MAIL_FROM ?? "membership@193countriesconsortium.com",
        To: toEmail,
        Subject: subject,
        TextBody: body,
        MessageStream: "outbound",
      }),
    });
    if (!res.ok) console.error("[mail] postmark", res.status, await res.text());
  } catch (e) {
    console.error("[mail] postmark delivery failed", e);
  }
}
