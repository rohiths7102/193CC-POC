import type { SlotKind } from "@prisma/client";

/**
 * ONE vocabulary for the whole site. The landing tier cards, the /join/[code]
 * detail page and the Summit surfaces previously each hand-wrote their own
 * copy for the same DB rows, so identical benefits read differently one click
 * apart. Every consumer renders through these two maps now.
 */

/** Summit category display names — canonical, everywhere. */
export const SLOT_KIND_LABEL: Record<SlotKind, string> = {
  PRESENTATION: "Business Opportunity Presentation",
  BRAND_LAUNCH: "Brand Launch",
  AWARD: "Business Award",
};

/** Benefit copy per entitlement key. `short` = card bullet; default = full. */
export function entitlementLabel(
  key: string,
  params: Record<string, unknown> | null,
  opts?: { short?: boolean }
): string {
  const p = params ?? {};
  const words = Number(p.maxWords ?? 1400).toLocaleString("en-GB");
  const images = Number(p.maxImages ?? 2);
  const hours = Number(p.hours ?? 2);
  const kind = String(p.kind ?? "senior");
  const short = opts?.short;

  switch (key) {
    case "main_event_delegate":
      return short
        ? "Major Event, delegate capacity"
        : "Major Event attendance in delegate capacity — House of Lords";
    case "summit_slot":
      return short
        ? "One Summit slot per annum"
        : "UK Investors Summit — one slot per annum (presentation, launch or award)";
    case "branding_video":
      return short
        ? "Featured branding video"
        : "Featured branding video with a consortium CXO";
    case "article":
      return short
        ? `${words}-word article + ${images} HD images`
        : `Website article up to ${words} words with ${images} HD images`;
    case "mentoring_hours":
      return short
        ? `${hours} hrs/month ${kind} mentoring`
        : `${hours} hours of ${kind} mentoring every month`;
    case "networking_news":
      return short
        ? "News & networking access"
        : "News and online networking areas";
    case "business_model_guidance":
      return short
        ? "Business-model guidance"
        : "Business-model guidance incl. franchise & distributorship strategies";
    case "eis_guidance":
      return short
        ? "EIS-readiness guidance"
        : "EIS-readiness and investment-portfolio guidance (UK companies)";
    case "investor_visibility":
      return short
        ? "Investor deal-flow visibility, by consent"
        : "Opt-in visibility to accredited investors ahead of the Summit";
    default:
      return key;
  }
}
