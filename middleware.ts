import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAdminSessionToken, SESSION_COOKIE_NAME } from "./lib/auth/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");
  const isLoginPage = pathname === "/admin/login";

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
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
      return NextResponse.redirect(new URL("/admin", clientOrigin));
    }
    return NextResponse.next();
  }

  // Protecting /admin/* and /api/admin/*
  if (!isAuthenticated) {
    if (isAdminApi) {
      return NextResponse.json(
        { error: "Unauthorized access: valid super-admin session required" },
        { status: 401 }
      );
    }
    // Redirect to login with returnUrl
    const loginUrl = new URL("/admin/login", clientOrigin);
    loginUrl.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
