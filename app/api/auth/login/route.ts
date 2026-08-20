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
      try {
        await dataAdapter.logAdminAction("LOGIN_FAILED", "SECURITY", ip, "Failed password attempt");
      } catch (logErr) {
        console.warn("[AdminLogin] Log failed attempt error:", logErr);
      }
      return NextResponse.json(
        { error: "Invalid super-admin credentials" },
        { status: 401 }
      );
    }

    // Generate JWT and set httpOnly cookie
    resetRateLimit(`admin-login:${ip}`);
    const token = await createAdminSessionToken();
    await setAdminSessionCookie(token);

    try {
      await dataAdapter.logAdminAction("LOGIN_SUCCESS", "ADMIN", "SESSION", `Admin authenticated from IP ${ip}`);
    } catch (logErr) {
      console.warn("[AdminLogin] Log success error:", logErr);
    }

    const response = NextResponse.json({ success: true, message: "Authentication successful" });
    response.cookies.set("superior_admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error("[AdminLogin] Error:", error?.message || error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
