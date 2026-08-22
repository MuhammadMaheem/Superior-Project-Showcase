import { NextRequest, NextResponse } from "next/server";
import { verifyAdminPassword } from "@/lib/auth/password";
import { verifyTeacherCredentials } from "@/lib/auth/accounts";
import {
  createSuperAdminSessionToken,
  createTeacherSessionToken,
  setAdminSessionCookie,
} from "@/lib/auth/session";
import { checkRateLimit, getClientIp, resetRateLimit } from "@/lib/auth/rate-limit";
import { dataAdapter } from "@/lib/sheets/adapter";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`admin-login:${ip}`, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 10,
    });

    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "Too many failed login attempts. Please wait 15 minutes before trying again." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { password, email, mode } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    let token = "";
    let userDisplayName = "Super Administrator";
    let userRole = "SUPER_ADMIN";

    // 1. Teacher / Faculty Authentication
    if ((mode === "teacher" || email) && email) {
      if (typeof email !== "string" || !email.includes("@")) {
        return NextResponse.json({ error: "Valid university email is required" }, { status: 400 });
      }

      try {
        const teacherAccount = await verifyTeacherCredentials(email, password);
        if (!teacherAccount) {
          try {
            await dataAdapter.logAdminAction("TEACHER_LOGIN_FAILED", "SECURITY", ip, `Failed login for email: ${email}`);
          } catch {}
          return NextResponse.json(
            { error: "Invalid email or password. Please check your credentials." },
            { status: 401 }
          );
        }

        token = await createTeacherSessionToken(teacherAccount);
        userDisplayName = teacherAccount.name;
        userRole = "TEACHER";

        try {
          await dataAdapter.logAdminAction(
            "TEACHER_LOGIN_SUCCESS",
            "TEACHER",
            teacherAccount.id,
            `Faculty login: ${teacherAccount.name} (${teacherAccount.email}) from IP ${ip}`
          );
        } catch {}
      } catch (err: any) {
        return NextResponse.json({ error: err.message || "Account authentication failed" }, { status: 403 });
      }
    } else {
      // 2. Super Admin Master Authentication
      const isMatch = await verifyAdminPassword(password);
      if (!isMatch) {
        try {
          await dataAdapter.logAdminAction("LOGIN_FAILED", "SECURITY", ip, "Failed master admin password attempt");
        } catch {}
        return NextResponse.json(
          { error: "Invalid super-admin master password" },
          { status: 401 }
        );
      }

      token = await createSuperAdminSessionToken();
      try {
        await dataAdapter.logAdminAction("LOGIN_SUCCESS", "ADMIN", "SESSION", `Super Admin authenticated from IP ${ip}`);
      } catch {}
    }

    // Generate JWT and set httpOnly cookie
    resetRateLimit(`admin-login:${ip}`);
    await setAdminSessionCookie(token);

    const response = NextResponse.json({
      success: true,
      message: `Welcome back, ${userDisplayName}`,
      role: userRole,
      name: userDisplayName,
    });

    response.cookies.set("superior_admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error("[Login] Error:", error?.message || error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
