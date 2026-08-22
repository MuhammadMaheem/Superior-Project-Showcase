import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { SUPER_ADMIN_PERMISSIONS, type TeacherAccount, type TeacherPermissions } from "@/lib/sheets/models";

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
  role: "SUPER_ADMIN" | "TEACHER" | "admin"; // 'admin' supported for backward compatibility
  userId: string;
  name: string;
  email: string;
  permissions: TeacherPermissions;
  assigned_subjects?: string[];
  loggedInAt: number;
}

/**
 * Creates session token for Master Super Admin
 */
export async function createSuperAdminSessionToken(): Promise<string> {
  const secret = getSecretKey();
  const payload: SessionPayload = {
    role: "SUPER_ADMIN",
    userId: "super-admin-root",
    name: "Super Administrator",
    email: process.env.SMTP_USER || "admin@superior.edu.pk",
    permissions: SUPER_ADMIN_PERMISSIONS,
    loggedInAt: Date.now(),
  };

  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

/**
 * Creates session token for a Teacher / Faculty Member
 */
export async function createTeacherSessionToken(account: TeacherAccount): Promise<string> {
  const secret = getSecretKey();
  const payload: SessionPayload = {
    role: "TEACHER",
    userId: account.id,
    name: account.name,
    email: account.email,
    permissions: account.permissions,
    assigned_subjects: account.assigned_subjects || [],
    loggedInAt: Date.now(),
  };

  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

// Backward compatibility alias
export async function createAdminSessionToken(): Promise<string> {
  return createSuperAdminSessionToken();
}

/**
 * Verifies JWT session token and returns decoded session payload
 */
export async function verifyAdminSessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secret = getSecretKey();
    const { payload } = await jwtVerify(token, secret);

    const rawRole = (payload.role as string) || "SUPER_ADMIN";
    const role: "SUPER_ADMIN" | "TEACHER" =
      rawRole === "TEACHER" ? "TEACHER" : "SUPER_ADMIN";

    const sessionPayload: SessionPayload = {
      role,
      userId: (payload.userId as string) || "super-admin-root",
      name: (payload.name as string) || (role === "SUPER_ADMIN" ? "Super Administrator" : "Faculty Member"),
      email: (payload.email as string) || "",
      permissions: (payload.permissions as TeacherPermissions) || (role === "SUPER_ADMIN" ? SUPER_ADMIN_PERMISSIONS : {
        can_view_all_projects: false,
        can_edit_projects: true,
        can_delete_projects: false,
        can_send_inquiries: true,
        can_escalate_faculty: false,
        can_manage_queries: false,
        can_view_telemetry: false,
      }),
      assigned_subjects: (payload.assigned_subjects as string[]) || [],
      loggedInAt: (payload.loggedInAt as number) || Date.now(),
    };

    return sessionPayload;
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
