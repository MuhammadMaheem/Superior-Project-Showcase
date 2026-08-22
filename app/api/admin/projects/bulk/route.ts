import { NextRequest, NextResponse } from "next/server";
import { dataAdapter } from "@/lib/sheets/adapter";
import { getAdminSessionFromCookies } from "@/lib/auth/session";

// PATCH bulk update project statuses (published | hidden)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getAdminSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized: Administrator session required" }, { status: 401 });
    }

    if (!session.permissions.can_edit_projects) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to modify project visibility" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !Array.isArray(body.ids) || body.ids.length === 0 || !body.status) {
      return NextResponse.json(
        { error: "ids (array of project IDs) and status ('published' | 'hidden') are required" },
        { status: 400 }
      );
    }

    const { ids, status } = body;
    if (status !== "published" && status !== "hidden") {
      return NextResponse.json({ error: "Invalid status ('published' | 'hidden')" }, { status: 400 });
    }

    let updatedCount = 0;
    for (const id of ids) {
      try {
        const updated = await dataAdapter.updateProject(id, { status });
        if (updated) {
          updatedCount++;
        }
      } catch (err) {
        console.warn(`[BulkProjects] Failed to update project ${id}:`, err);
      }
    }

    await dataAdapter.logAdminAction(
      "PROJECT_STATUS_TOGGLED",
      "PROJECT",
      "BULK_OPERATION",
      `Bulk updated ${updatedCount} capstones to status: ${status} by ${session.name}`
    );

    return NextResponse.json({
      success: true,
      updatedCount,
      totalRequested: ids.length,
      status,
    });
  } catch (error) {
    console.error("[AdminProjects Bulk PATCH] Error:", error);
    return NextResponse.json({ error: "Failed to perform bulk update" }, { status: 500 });
  }
}
