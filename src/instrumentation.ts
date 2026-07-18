export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runTick } = await import("./server/tick");
    // Housekeeping every 60s: deadline auto-close, offer expiry, lapse sweep.
    setInterval(() => {
      runTick().catch((e) => console.error("[tick]", e));
    }, 60_000);
  }
}
