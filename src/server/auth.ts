import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import * as bcrypt from "bcryptjs";
import type { Role, User } from "@prisma/client";
import { db } from "./db";
import { can, type Permission } from "./rbac";

const COOKIE = "mp_session";
const PROD = process.env.NODE_ENV === "production";
const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s && PROD) throw new Error("SESSION_SECRET must be set in production.");
  return new TextEncoder().encode(s ?? "dev-secret");
};

export async function createSession(userId: string, role: Role) {
  const jwt = await new SignJWT({ uid: userId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
  (await cookies()).set(COOKIE, jwt, {
    httpOnly: true, sameSite: "lax",
    secure: PROD && (process.env.APP_URL ?? "").startsWith("https"),
    path: "/", maxAge: 7 * 24 * 3600,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<{ uid: string; role: Role } | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { uid: payload.uid as string, role: payload.role as Role };
  } catch {
    return null;
  }
}

/** Load the full user for the current session, or null. */
export async function currentUser(): Promise<User | null> {
  const s = await getSession();
  if (!s) return null;
  const user = await db.user.findUnique({ where: { id: s.uid } });
  if (!user || user.status === "SUSPENDED") return null;
  return user;
}

/**
 * THE enforcement gate. Every server action / portal page calls this.
 * Throws a redirect to /login when unauthenticated, and a hard error when
 * the role lacks the permission — API-layer RBAC, not UI hiding.
 */
export async function requireUser(permission?: Permission): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (permission && !can(user.role, permission)) {
    throw new Error(`Forbidden: role ${user.role} lacks permission "${permission}"`);
  }
  return user;
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);
