import { NextResponse } from "next/server";
import { runTick } from "@/server/tick";

export const dynamic = "force-dynamic";
// Pro plan: the Companies House sweep can make up to 100 outbound calls.
export const maxDuration = 300;

/**
 * Housekeeping entrypoint for serverless hosts (Vercel Cron), which cannot
 * run the always-on 60-second interval used on a long-lived server. Does the
 * same work: close passed Summit deadlines, expire waitlist offers, lapse
 * overdue memberships, collect due Direct Debit instalments, auto-verify
 * clean Companies House matches, send renewal and content-review reminders.
 * Scheduled daily at 03:00 (vercel.json — Hobby plans allow daily crons only); every job is idempotent, so a duplicate
 * delivery or a manual re-run is harmless.
 *
 * Protected two ways:
 *  - Vercel signs its own cron calls with CRON_SECRET (Authorization header)
 *  - otherwise the secret may be passed as ?key= for manual/other schedulers
 * If CRON_SECRET is unset the endpoint refuses to run rather than sitting
 * open to the internet.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured; refusing to run." },
      { status: 503 }
    );
  }

  const auth = req.headers.get("authorization");
  const key = new URL(req.url).searchParams.get("key");
  if (auth !== `Bearer ${secret}` && key !== secret) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const report = await runTick();
    return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), report });
  } catch (e) {
    console.error("[cron/tick]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "tick failed" },
      { status: 500 }
    );
  }
}
