/**
 * The platform's own public base URL.
 *
 * Resolution order:
 *  1. APP_URL — set it explicitly on any host you control (use this for a
 *     custom domain).
 *  2. VERCEL_PROJECT_PRODUCTION_URL / RENDER_EXTERNAL_URL — injected by the
 *     host, so a deploy gets correct share links and secure cookies with no
 *     manual configuration.
 *  3. localhost fallback for development.
 */
export function appUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL;
  return "http://127.0.0.1:3000";
}
