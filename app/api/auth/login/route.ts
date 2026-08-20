import { NextRequest, NextResponse } from "next/server";
import { verifyAdminPassword } from "@/lib/auth/password";
import { createAdminSessionToken, setAdminSessionCookie } from "@/lib/auth/session";
import { checkRateLimit, getClientIp, resetRateLimit } from "@/lib/auth/rate-limit";
import { dataAdapter } from "@/lib/sheets/adapter";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`admin-login:${ip}`, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
    });

    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "Too many failed login attempts. Please wait 15 minutes before trying again." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    const isMatch = await verifyAdminPassword(password);
    if (!isMatch) {
      await dataAdapter.logAdminAction("LOGIN_FAILED", "SECURITY", ip, "Failed password attempt");
      return NextResponse.json(
        { error: "Invalid super-admin credentials" },
        { status: 401 }
      );
    }

    // Generate JWT and set httpOnly cookie
    resetRateLimit(`admin-login:${ip}`);
    const token = await createAdminSessionToken();
    await setAdminSessionCookie(token);

    await dataAdapter.logAdminAction("LOGIN_SUCCESS", "ADMIN", "SESSION", `Admin authenticated from IP ${ip}`);

    return NextResponse.json({ success: true, message: "Authentication successful" });
  } catch (error) {
    console.error("[AdminLogin] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
