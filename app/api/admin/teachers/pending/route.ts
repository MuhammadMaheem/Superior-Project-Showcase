import { NextRequest, NextResponse } from "next/server";
import { dataAdapter } from "@/lib/sheets/adapter";

// GET pending teachers, sync logs, and metadata
export async function GET() {
  try {
    const [pending, logs, meta, live] = await Promise.all([
      dataAdapter.getTeachersPending(),
      dataAdapter.getSyncLogs(),
      dataAdapter.getSyncMeta(),
      dataAdapter.getTeachers(),
    ]);

    return NextResponse.json({
      pending,
      logs: logs.slice(0, 50),
      meta,
      liveCount: live.length,
    });
  } catch (error) {
    console.error("[AdminTeachersPending GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch pending teachers" }, { status: 500 });
  }
}

// PUT inline edit of a pending teacher before approval
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.slug) {
      return NextResponse.json({ error: "Teacher slug is required" }, { status: 400 });
    }

    const { slug, ...updates } = body;
    const updated = await dataAdapter.updatePendingTeacher(slug, updates);

    if (!updated) {
      return NextResponse.json({ error: "Pending teacher not found" }, { status: 404 });
    }

    await dataAdapter.logAdminAction(
      "TEACHER_PENDING_EDITED",
      "TEACHER_PENDING",
      slug,
      `Pending teacher "${updated.name}" was modified inline prior to approval`
    );

    return NextResponse.json({ success: true, teacher: updated });
  } catch (error) {
    console.error("[AdminTeachersPending PUT] Error:", error);
    return NextResponse.json({ error: "Failed to update pending teacher" }, { status: 500 });
  }
}
