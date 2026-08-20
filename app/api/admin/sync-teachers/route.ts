import { NextResponse } from "next/server";
import { runTeacherSync } from "@/lib/sync/teachers";
import { dataAdapter } from "@/lib/sheets/adapter";

export async function POST() {
  try {
    const result = await runTeacherSync();
    await dataAdapter.logAdminAction(
      "MANUAL_FACULTY_SYNC",
      "FACULTY",
      "SOURCE_API",
      `Admin initiated faculty sync check. Changes detected: ${result.hasChanges}`
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
