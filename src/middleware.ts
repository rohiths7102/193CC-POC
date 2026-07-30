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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
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

export const config = { matcher: ["/portal/:path*"] };
