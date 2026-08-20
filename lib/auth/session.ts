import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "superior_admin_session";
const DEFAULT_SECRET = "superior-showcase-jwt-secret-key-32-chars-long-secure";

function getSecretKey(): Uint8Array {
  let secret = (process.env.SESSION_SECRET || DEFAULT_SECRET).trim();
  if ((secret.startsWith('"') && secret.endsWith('"')) || (secret.startsWith("'") && secret.endsWith("'"))) {
    secret = secret.slice(1, -1);
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  role: "admin";
  loggedInAt: number;
}

export async function createAdminSessionToken(): Promise<string> {
  const secret = getSecretKey();
  return await new SignJWT({ role: "admin", loggedInAt: Date.now() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyAdminSessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secret = getSecretKey();
    const { payload } = await jwtVerify(token, secret);
    if (payload.role === "admin") {
      return payload as unknown as SessionPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setAdminSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getAdminSessionFromRequest(request: NextRequest): Promise<SessionPayload | null> {
  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) return null;
  return await verifyAdminSessionToken(cookie);
}

export async function getAdminSessionFromCookies(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) return null;
  return await verifyAdminSessionToken(cookie);
}

export { SESSION_COOKIE_NAME };
