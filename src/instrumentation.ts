export async function register() {
  // On a long-lived server (local dev, Docker, Render, Railway) run the
  // housekeeping loop in-process every 60s. On serverless hosts the process
  // is torn down between requests, so Vercel Cron calls /api/cron/tick
  // instead — same work, different trigger. VERCEL is set automatically there.
  if (process.env.NEXT_RUNTIME === "nodejs" && !process.env.VERCEL) {
    const { runTick } = await import("./server/tick");
    setInterval(() => {
      runTick().catch((e) => console.error("[tick]", e));
    }, 60_000);
  }
}
