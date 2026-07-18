import "server-only";

/**
 * UK Companies House cross-check (free government API — confirmed to
 * require a real API key even for read-only lookups; there is no keyless
 * tier). Register a free key at
 * https://developer.company-information.service.gov.uk and set
 * COMPANIES_HOUSE_API_KEY to go live; without it every lookup falls back to
 * clearly-labelled simulated data so the feature stays fully demoable.
 *
 * This turns "an admin eyeballed a PDF" into "we confirmed the company
 * exists, is active, and its registered name matches what the applicant
 * typed" — at zero ongoing cost once a key is set.
 */

export type CompanyCheck = {
  status: "active" | "dissolved" | "not_found" | "not_configured" | "error";
  officialName: string | null;
  incorporatedAt: Date | null;
  nameMatches: boolean | null;
  simulated: boolean;
};

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(ltd|limited|plc|llp|the)\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

/** Deterministic offline stand-in — same shape as the real API response,
 *  clearly flagged `simulated: true` everywhere it's displayed. */
function simulateCheck(number: string, claimedName: string): CompanyCheck {
  const clean = number.replace(/\s+/g, "").toUpperCase();
  if (clean.length < 6) {
    return { status: "not_found", officialName: null, incorporatedAt: null, nameMatches: null, simulated: true };
  }
  // A couple of demo numbers deliberately show the mismatch/dissolved cases
  // so the verification queue has something real to demonstrate.
  if (clean.endsWith("00")) {
    return {
      status: "dissolved", officialName: `${claimedName.toUpperCase()} (DISSOLVED)`,
      incorporatedAt: new Date("2016-03-11"), nameMatches: false, simulated: true,
    };
  }
  if (clean.endsWith("13")) {
    return {
      status: "active", officialName: "HOLDINGS GROUP TRADING LTD", // deliberately different — mismatch demo
      incorporatedAt: new Date("2019-09-02"), nameMatches: false, simulated: true,
    };
  }
  return {
    status: "active", officialName: claimedName.toUpperCase(),
    incorporatedAt: new Date("2020-01-14"), nameMatches: true, simulated: true,
  };
}

export async function checkCompany(number: string, claimedName: string): Promise<CompanyCheck> {
  const cleanNumber = number.replace(/\s+/g, "").toUpperCase();
  const key = process.env.COMPANIES_HOUSE_API_KEY;

  if (!key) return simulateCheck(cleanNumber, claimedName);

  try {
    const res = await fetch(`https://api.company-information.service.gov.uk/company/${encodeURIComponent(cleanNumber)}`, {
      headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}` },
      cache: "no-store",
    });
    if (res.status === 404) {
      return { status: "not_found", officialName: null, incorporatedAt: null, nameMatches: null, simulated: false };
    }
    if (!res.ok) {
      return { status: "error", officialName: null, incorporatedAt: null, nameMatches: null, simulated: false };
    }
    const data = await res.json();
    const officialName: string = data.company_name ?? "";
    const status = data.company_status === "active" ? "active" as const : "dissolved" as const;
    return {
      status,
      officialName,
      incorporatedAt: data.date_of_creation ? new Date(data.date_of_creation) : null,
      nameMatches: normalizeName(officialName) === normalizeName(claimedName),
      simulated: false,
    };
  } catch {
    return { status: "error", officialName: null, incorporatedAt: null, nameMatches: null, simulated: false };
  }
}

export const companiesHousePublicUrl = (number: string) =>
  `https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(number.replace(/\s+/g, ""))}`;
