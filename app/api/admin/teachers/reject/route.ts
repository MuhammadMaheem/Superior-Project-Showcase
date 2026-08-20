import { NextRequest, NextResponse } from "next/server";
import { dataAdapter } from "@/lib/sheets/adapter";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const selectedSlugs: string[] | undefined = body.slugs;

    const pendingList = await dataAdapter.getTeachersPending();
    const toReject = selectedSlugs
      ? pendingList.filter((p) => selectedSlugs.includes(p.slug))
      : pendingList;

    if (toReject.length === 0) {
      return NextResponse.json({ message: "No pending teachers to reject" });
    }

    const remainingPending = selectedSlugs
      ? pendingList.filter((p) => !selectedSlugs.includes(p.slug))
      : [];
    await dataAdapter.setTeachersPending(remainingPending);

    // Mark sync logs as rejected
    const rejectedNames = new Set(toReject.map((t) => t.name));
    const syncLogs = await dataAdapter.getSyncLogs();
    for (const log of syncLogs) {
      if (rejectedNames.has(log.teacher_name) && log.resolution === "pending") {
        await dataAdapter.updateSyncLogResolution(log.sync_id, "rejected");
      }
    }

    await dataAdapter.logAdminAction(
      "TEACHERS_REJECTED",
      "FACULTY",
      `${toReject.length} teachers`,
      `Rejected ${toReject.length} pending faculty sync proposals`
    );

    return NextResponse.json({
      success: true,
      rejectedCount: toReject.length,
      remainingPendingCount: remainingPending.length,
    });
  } catch (error) {
    console.error("[AdminTeachersReject] Error:", error);
    return NextResponse.json({ error: "Failed to reject pending teachers" }, { status: 500 });
  }
}
