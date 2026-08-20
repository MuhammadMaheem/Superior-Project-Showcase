import { NextRequest, NextResponse } from "next/server";
import { dataAdapter } from "@/lib/sheets/adapter";
import type { Teacher } from "@/lib/sheets/models";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const selectedSlugs: string[] | undefined = body.slugs; // If undefined, approve all pending

    const pendingList = await dataAdapter.getTeachersPending();
    const liveTeachers = await dataAdapter.getTeachers();

    const toApprove = selectedSlugs
      ? pendingList.filter((p) => selectedSlugs.includes(p.slug))
      : pendingList;

    if (toApprove.length === 0) {
      return NextResponse.json({ message: "No pending teachers to approve" });
    }

    // Merge into live teachers
    const liveMap = new Map<string, Teacher>(liveTeachers.map((t) => [t.name, t]));

    for (const pending of toApprove) {
      // Strip status and detected_at
      const { status: _s, detected_at: _d, ...cleanTeacher } = pending;
      liveMap.set(cleanTeacher.name, {
        ...cleanTeacher,
        last_synced_at: new Date().toISOString(),
      });
    }

    const updatedLiveList = Array.from(liveMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    // Save updated live teachers
    await dataAdapter.setTeachers(updatedLiveList);

    // Remove approved from pending
    const remainingPending = selectedSlugs
      ? pendingList.filter((p) => !selectedSlugs.includes(p.slug))
      : [];
    await dataAdapter.setTeachersPending(remainingPending);

    // Mark sync logs as approved
    const approvedNames = new Set(toApprove.map((t) => t.name));
    const syncLogs = await dataAdapter.getSyncLogs();
    for (const log of syncLogs) {
      if (approvedNames.has(log.teacher_name) && log.resolution === "pending") {
        await dataAdapter.updateSyncLogResolution(log.sync_id, "approved");
      }
    }

    await dataAdapter.logAdminAction(
      "TEACHERS_APPROVED",
      "FACULTY",
      `${toApprove.length} teachers`,
      `Approved and merged ${toApprove.length} faculty members into live Teachers database`
    );

    return NextResponse.json({
      success: true,
      approvedCount: toApprove.length,
      remainingPendingCount: remainingPending.length,
    });
  } catch (error) {
    console.error("[AdminTeachersApprove] Error:", error);
    return NextResponse.json({ error: "Failed to approve pending teachers" }, { status: 500 });
  }
}
