import "server-only";

/**
 * UK Companies House verification.
 *
 * Live mode: set COMPANIES_HOUSE_API_KEY (free, from
 * https://developer.company-information.service.gov.uk). Two calls are made —
 * the company record and its officers list — so we can check both that the
 * company is real/active and that the applicant is actually one of its
 * directors.
 *
 * Demo mode (no key): returns data from a small FIXTURE table keyed on the
 * company number. It deliberately does NOT echo back whatever the applicant
 * typed — an earlier version did, which meant a nonsense number like
 * "MIDDLESE" produced a confident "found, name matches" result. Fabricated
 * verification is worse than none, so unknown numbers now honestly return
 * "not found".
 */

export type CompanyCheck = {
  status: "active" | "dissolved" | "not_found" | "invalid_format" | "not_configured" | "error";
  officialName: string | null;
  incorporatedAt: Date | null;
  nameMatches: boolean | null;
  officers: string[];
  directorMatch: boolean | null;
  simulated: boolean;
};

/** UK company numbers: 8 digits, or 2 letters followed by 6 digits (SC, NI, OC…). */
export function isValidCompanyNumber(raw: string): boolean {
  const n = raw.replace(/\s+/g, "").toUpperCase();
  return /^\d{8}$/.test(n) || /^[A-Z]{2}\d{6}$/.test(n);
}

const norm = (s: string) =>
  s.toLowerCase().replace(/\b(ltd|limited|plc|llp|the|uk)\b/g, "").replace(/[^a-z0-9]+/g, "").trim();

/** Loose person-name match: every part of the applicant's name appears in an
 *  officer's name (handles "Jane Smith" vs "SMITH, Jane Elizabeth"). */
function personMatches(applicant: string, officer: string): boolean {
  const a = applicant.toLowerCase().split(/\s+/).filter((p) => p.length > 1);
  const o = officer.toLowerCase();
  return a.length > 0 && a.every((part) => o.includes(part));
}

/** Fixtures for demo mode — keyed on company number, never invented from input. */
const FIXTURES: Record<string, { name: string; status: "active" | "dissolved"; incorporated: string; officers: string[] }> = {
  // The client's own real company — good for a live-feeling demo.
  "14499310": {
    name: "193 COUNTRIES CONSORTIUM LTD", status: "active", incorporated: "2022-11-22",
    officers: ["UALIKKARA SUDHAN, Aashin"],
  },
  // Our own company. Every field below was read from the live Companies
  // House API, not guessed — fixtures must never contain invented facts.
  "17125057": {
    name: "KRONEUS ZTS SECURITY LTD", status: "active", incorporated: "2026-03-30",
    officers: ["SHANKAR, Rohith"],
  },
  "12345678": {
    name: "HARBOR LANE TRADING LTD", status: "active", incorporated: "2020-01-14",
    officers: ["RAHMAN, Yusuf", "DIALLO, Amara"],
  },
  "10298761": {
    name: "MERIDIAN HOLDINGS LTD", status: "active", incorporated: "2019-09-02",
    officers: ["KAPOOR, Priya"],
  },
  // Deliberately unhappy paths so staff review can be demonstrated:
  "99887766": {
    name: "OLDPORT VENTURES LTD", status: "dissolved", incorporated: "2016-03-11",
    officers: ["BLAKE, Thomas"],
  },
  "11223344": {
    name: "ORBIT LOGISTICS LTD", status: "active", incorporated: "2021-06-30",
    officers: ["OKAFOR, Ngozi"], // applicant will NOT match → director flag fires
  },
};

function simulate(number: string, claimedName: string, applicantName: string): CompanyCheck {
  const f = FIXTURES[number.replace(/\s+/g, "").toUpperCase()];
  if (!f) {
    return {
      status: "not_found", officialName: null, incorporatedAt: null,
      nameMatches: null, officers: [], directorMatch: null, simulated: true,
    };
  }
  return {
    status: f.status,
    officialName: f.name,
    incorporatedAt: new Date(f.incorporated),
    nameMatches: norm(f.name) === norm(claimedName),
    officers: f.officers,
    // null = "we don't know" (no officer list available). Only claim a
    // mismatch when there is a register to be absent from — otherwise the
    // reviewer sees an accusation we can't support.
    directorMatch: f.officers.length === 0 || !applicantName
      ? null
      : f.officers.some((o) => personMatches(applicantName, o)),
    simulated: true,
  };
}

export async function checkCompany(
  number: string,
  claimedName: string,
  applicantName = "",
): Promise<CompanyCheck> {
  const clean = number.replace(/\s+/g, "").toUpperCase();

  if (!isValidCompanyNumber(clean)) {
    return {
      status: "invalid_format", officialName: null, incorporatedAt: null,
      nameMatches: null, officers: [], directorMatch: null, simulated: false,
    };
  }

  const key = process.env.COMPANIES_HOUSE_API_KEY;
  if (!key) return simulate(clean, claimedName, applicantName);

  const auth = { Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}` };
  try {
    const res = await fetch(`https://api.company-information.service.gov.uk/company/${encodeURIComponent(clean)}`, {
      headers: auth, cache: "no-store",
    });
    if (res.status === 404) {
      return { status: "not_found", officialName: null, incorporatedAt: null, nameMatches: null, officers: [], directorMatch: null, simulated: false };
    }
    if (!res.ok) {
      return { status: "error", officialName: null, incorporatedAt: null, nameMatches: null, officers: [], directorMatch: null, simulated: false };
    }
    const data = await res.json();
    const officialName: string = data.company_name ?? "";

    // Second call: the officers register, for the director/founder check.
    let officers: string[] = [];
    try {
      const oRes = await fetch(`https://api.company-information.service.gov.uk/company/${encodeURIComponent(clean)}/officers`, {
        headers: auth, cache: "no-store",
      });
      if (oRes.ok) {
        const oData = await oRes.json();
        officers = (oData.items ?? [])
          .filter((i: { resigned_on?: string }) => !i.resigned_on)
          .map((i: { name: string }) => i.name)
          .filter(Boolean);
      }
    } catch { /* officers are best-effort; the company result still stands */ }

    return {
      status: data.company_status === "active" ? "active" : "dissolved",
      officialName,
      incorporatedAt: data.date_of_creation ? new Date(data.date_of_creation) : null,
      nameMatches: norm(officialName) === norm(claimedName),
      officers,
      directorMatch: applicantName && officers.length
        ? officers.some((o) => personMatches(applicantName, o))
        : null,
      simulated: false,
    };
  } catch {
    return { status: "error", officialName: null, incorporatedAt: null, nameMatches: null, officers: [], directorMatch: null, simulated: false };
  }
}

/** Free/consumer email providers — a corporate domain is a (weak) positive signal. */
const FREE_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "hotmail.com", "hotmail.co.uk",
  "outlook.com", "live.com", "aol.com", "icloud.com", "me.com", "proton.me", "protonmail.com",
  "gmx.com", "mail.com", "yandex.com", "zoho.com",
]);

export function emailDomainKind(email: string): "corporate" | "free" | "unknown" {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return "unknown";
  return FREE_DOMAINS.has(domain) ? "free" : "corporate";
}

export const companiesHousePublicUrl = (number: string) =>
  `https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(number.replace(/\s+/g, ""))}`;
