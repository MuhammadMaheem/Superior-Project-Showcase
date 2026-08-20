import { NextRequest, NextResponse } from "next/server";
import { dataAdapter } from "@/lib/sheets/adapter";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let queries = await dataAdapter.getQueries();
    if (status === "open" || status === "resolved") {
      queries = queries.filter((q) => q.status === status);
    }

    // Fetch related projects for each query with related_project_id
    const projects = await dataAdapter.getProjects({ publishedOnly: false });
    const projectMap = new Map(projects.map((p) => [p.id, p]));

    const enrichedQueries = queries.map((q) => ({
      ...q,
      related_project: q.related_project_id ? projectMap.get(q.related_project_id) || null : null,
    }));

    return NextResponse.json({ queries: enrichedQueries });
  } catch (error) {
    console.error("[AdminQueries GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch queries" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.id) {
      return NextResponse.json({ error: "Query ID is required" }, { status: 400 });
    }

    const { id, admin_response, status = "resolved" } = body;
    const updated = await dataAdapter.respondToQuery(id, admin_response || "", status);

    if (!updated) {
      return NextResponse.json({ error: "Query not found" }, { status: 404 });
    }

    await dataAdapter.logAdminAction(
      "QUERY_RESPONDED",
      "QUERY",
      id,
      `Query from "${updated.name}" marked as ${status}`
    );

    return NextResponse.json({ success: true, query: updated });
  } catch (error) {
    console.error("[AdminQueries POST] Error:", error);
    return NextResponse.json({ error: "Failed to respond to query" }, { status: 500 });
  }
}
