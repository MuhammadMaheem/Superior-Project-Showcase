import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAdminSessionToken, SESSION_COOKIE_NAME } from "./lib/auth/session";

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");
  const isLoginPage = pathname === "/admin/login";

  if (!isAdminPage && !isAdminApi) {
    const res = NextResponse.next();
    return applySecurityHeaders(res);
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifyAdminSessionToken(token) : null;
  const isAuthenticated = session !== null;

  // Determine client origin for reverse proxies like ngrok / tunnels
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  const clientOrigin = `${proto}://${host}`;

  // If already logged in and visiting /admin/login, redirect to /admin dashboard
  if (isLoginPage) {
    if (isAuthenticated) {
      return applySecurityHeaders(NextResponse.redirect(new URL("/admin", clientOrigin)));
    }
    const res = NextResponse.next();
    return applySecurityHeaders(res);
  }

  // Protecting /admin/* and /api/admin/*
  if (!isAuthenticated) {
    if (isAdminApi) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Unauthorized access: valid session required" },
          { status: 401 }
        )
      );
    }
    // Redirect to login with returnUrl
    const loginUrl = new URL("/admin/login", clientOrigin);
    loginUrl.searchParams.set("returnUrl", pathname);
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  const res = NextResponse.next();
  return applySecurityHeaders(res);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
