import { NextResponse } from "next/server";
import { getAdminSessionFromCookies } from "@/lib/auth/session";

export async function GET() {
  const session = await getAdminSessionFromCookies();
  return NextResponse.json({
    authenticated: session !== null,
  });
}
