import { NextResponse } from "next/server";
import { dataAdapter } from "@/lib/sheets/adapter";

export async function GET() {
  try {
    const logs = await dataAdapter.getAuditLogs();
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("[AdminAudit GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
