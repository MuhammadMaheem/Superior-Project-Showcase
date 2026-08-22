import { NextResponse } from "next/server";
import { getAdminSessionFromCookies } from "@/lib/auth/session";

export async function GET() {
  const session = await getAdminSessionFromCookies();
  if (!session) {
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      userId: session.userId,
      name: session.name,
      email: session.email,
      role: session.role,
      permissions: session.permissions,
      assigned_subjects: session.assigned_subjects || [],
    },
  });
}
