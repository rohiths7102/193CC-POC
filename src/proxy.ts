import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET ?? "dev-secret");

/** Coarse portal gate: role → allowed path prefixes. Deep checks (permission
 *  + row scoping) run again server-side in every action/page via requireUser. */
const ROLE_PREFIXES: Record<string, string[]> = {
  MEMBER: ["/portal/dashboard", "/portal/membership", "/portal/mentoring", "/portal/summit", "/portal/content", "/portal/pitch", "/portal/news", "/portal/profile"],
  // Admins also open members' contracts from the 360° view — that page
  // re-checks ownership/role server-side (member sees own, admin sees all).
  ADMIN: ["/portal/admin", "/portal/membership/contract"],
  // Sales reps get the shared verification queue AND the Summit console
  // (permission matrix §4.3: "Approve intent letters & waitlist" = Admin +
  // Sales Rep). Each page re-checks the permission server-side; this only
  // routes them there.
  SALES_REP: ["/portal/sales", "/portal/admin/verification", "/portal/admin/summit"],
  MENTOR: ["/portal/mentor"],
  INVESTOR: ["/portal/investor"],
  CONSULTANT: ["/portal/consultant"],
};
const HOME: Record<string, string> = {
  MEMBER: "/portal/dashboard", ADMIN: "/portal/admin", SALES_REP: "/portal/sales",
  MENTOR: "/portal/mentor", INVESTOR: "/portal/investor", CONSULTANT: "/portal/consultant",
};

/** "Site under development" gate. ON in production; never in local dev, so
 *  work continues normally. Lift it by setting UNDER_CONSTRUCTION=false on
 *  the host and redeploying, or by reverting the commit that added this. */
const UNDER_CONSTRUCTION =
  process.env.NODE_ENV === "production" && process.env.UNDER_CONSTRUCTION !== "false";

/** Stays reachable while the gate is up: the way in for staff, and the
 *  tokenised member flows that are emailed as direct links — blocking those
 *  would strand someone mid-enrolment. Everything else shows /holding. */
const HOLDING_BYPASS = [
  "/holding", "/login", "/portal", "/api",
  "/pay", "/sign", "/status", "/verify-email", "/privacy",
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (UNDER_CONSTRUCTION && !HOLDING_BYPASS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    // Rewrite, not redirect: the URL is preserved, and the holding page's
    // own `noindex` metadata is what gets served for every gated URL.
    return NextResponse.rewrite(new URL("/holding", req.url));
  }

  if (!pathname.startsWith("/portal")) return NextResponse.next();

  const token = req.cookies.get("mp_session")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", req.url));

  try {
    const { payload } = await jwtVerify(token, secret());
    const role = String(payload.role);
    const allowed = ROLE_PREFIXES[role] ?? [];
    if (pathname === "/portal" || pathname === "/portal/") {
      return NextResponse.redirect(new URL(HOME[role] ?? "/login", req.url));
    }
    if (!allowed.some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL(HOME[role] ?? "/login", req.url));
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

/** Broadened from "/portal/:path*" so the holding gate above can see public
 *  routes too. Excludes Next internals, API, metadata image routes and any
 *  path with a file extension (robots.txt, sitemap.xml, /brand/*, /videos/*)
 *  — those must keep serving their real bytes, not HTML. */
export const config = {
  matcher: ["/((?!_next/|api/|.*opengraph-image|.*\\.[\\w]+$).*)"],
};
