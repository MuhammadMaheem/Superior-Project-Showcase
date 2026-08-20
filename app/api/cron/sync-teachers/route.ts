import { NextRequest, NextResponse } from "next/server";
import { runTeacherSync } from "@/lib/sync/teachers";
import { dataAdapter } from "@/lib/sheets/adapter";

export async function GET(request: NextRequest) {
  try {
    // Check Authorization header against CRON_SECRET if configured
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized cron execution" }, { status: 401 });
    }

    const result = await runTeacherSync();
    await dataAdapter.logAdminAction(
      "CRON_FACULTY_SYNC",
      "FACULTY",
      "CRON",
      `Automated faculty sync executed. Changes detected: ${result.hasChanges}`
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[CronSync] Error:", error);
    return NextResponse.json(
      { error: "Faculty sync failed", details: String(error) },
      { status: 500 }
    );
  }
}
