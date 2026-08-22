import { NextResponse } from "next/server";
import { runTeacherSync } from "@/lib/sync/teachers";
import { dataAdapter } from "@/lib/sheets/adapter";
import { getAdminSessionFromCookies } from "@/lib/auth/session";

export async function POST() {
  try {
    const session = await getAdminSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized: Administrator session required" }, { status: 401 });
    }

    if (session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden: Super Administrator access required to trigger faculty sync" }, { status: 403 });
    }

    const result = await runTeacherSync();
    await dataAdapter.logAdminAction(
      "MANUAL_FACULTY_SYNC",
      "FACULTY",
      "SOURCE_API",
      `Faculty sync check initiated by ${session.name}. Changes detected: ${result.hasChanges}`
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[AdminSyncTeachers] Error:", error);
    return NextResponse.json(
      { error: "Faculty sync failed", details: String(error) },
      { status: 500 }
    );
  }
}
