import { NextResponse } from "next/server";
import { dataAdapter } from "@/lib/sheets/adapter";
import { getAdminSessionFromCookies } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await getAdminSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized: Administrator session required" }, { status: 401 });
    }

    const logs = await dataAdapter.getAuditLogs();
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("[AdminAudit GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
