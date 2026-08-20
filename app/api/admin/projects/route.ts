import { NextRequest, NextResponse } from "next/server";
import { dataAdapter } from "@/lib/sheets/adapter";
import type { Project } from "@/lib/sheets/models";

// GET all projects (including hidden ones)
export async function GET() {
  try {
    const projects = await dataAdapter.getProjects({ publishedOnly: false });
    return NextResponse.json({ projects });
  } catch (error) {
    console.error("[AdminProjects GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

// PUT update project fields
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const { id, ...updates } = body;
    const updated = await dataAdapter.updateProject(id, updates);

    if (!updated) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await dataAdapter.logAdminAction(
      "PROJECT_EDITED",
      "PROJECT",
      id,
      `Project "${updated.project_title}" updated by admin`
    );

    return NextResponse.json({ success: true, project: updated });
  } catch (error) {
    console.error("[AdminProjects PUT] Error:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

// PATCH toggle project status (published / hidden)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.id || !body.status) {
      return NextResponse.json({ error: "Project ID and status ('published' | 'hidden') are required" }, { status: 400 });
    }

    const { id, status } = body;
    if (status !== "published" && status !== "hidden") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updated = await dataAdapter.updateProject(id, { status });
    if (!updated) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await dataAdapter.logAdminAction(
      "PROJECT_STATUS_TOGGLED",
      "PROJECT",
      id,
      `Project "${updated.project_title}" status changed to ${status}`
    );

    return NextResponse.json({ success: true, project: updated });
  } catch (error) {
    console.error("[AdminProjects PATCH] Error:", error);
    return NextResponse.json({ error: "Failed to toggle status" }, { status: 500 });
  }
}

// DELETE project
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const existing = await dataAdapter.getProjectById(id);
    const deleted = await dataAdapter.deleteProject(id);

    if (!deleted) {
      return NextResponse.json({ error: "Project not found or already deleted" }, { status: 404 });
    }

    await dataAdapter.logAdminAction(
      "PROJECT_DELETED",
      "PROJECT",
      id,
      `Project "${existing?.project_title || id}" was permanently removed`
    );

    return NextResponse.json({ success: true, message: "Project deleted" });
  } catch (error) {
    console.error("[AdminProjects DELETE] Error:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
