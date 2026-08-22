import { NextRequest, NextResponse } from "next/server";
import { dataAdapter } from "@/lib/sheets/adapter";
import { sendEmail, generateQueryResolutionEmail } from "@/lib/email/mailer";
import { getAdminSessionFromCookies } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized: Administrator session required" }, { status: 401 });
    }

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
    const session = await getAdminSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized: Administrator session required" }, { status: 401 });
    }

    if (!session.permissions.can_manage_queries) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to manage helpdesk queries" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.id) {
      return NextResponse.json({ error: "Query ID is required" }, { status: 400 });
    }

    const { id, admin_response, status = "resolved", send_email = false, custom_subject, custom_message, admin_name } = body;
    const updated = await dataAdapter.respondToQuery(id, admin_response || custom_message || "", status);

    if (!updated) {
      return NextResponse.json({ error: "Query not found" }, { status: 404 });
    }

    let emailResult = null;
    if (send_email && updated.email) {
      const emailDraft = generateQueryResolutionEmail({
        queryId: updated.id,
        studentName: updated.name,
        studentEmail: updated.email,
        queryType: updated.related_project_id ? "Project Record Inquiry" : "Academic Support Query",
        originalMessage: updated.message,
        resolutionNote: admin_response || custom_message || "Your query has been reviewed and resolved.",
        adminName: admin_name || session.name || "Superior University Directorate",
      });

      emailResult = await sendEmail({
        to: updated.email,
        subject: custom_subject || emailDraft.subject,
        html: emailDraft.html,
        text: custom_message || emailDraft.text,
      });
    }

    await dataAdapter.logAdminAction(
      "QUERY_RESPONDED",
      "QUERY",
      id,
      `Query from "${updated.name}" marked as ${status}${send_email ? " (Reply dispatched via Email)" : ""} by ${session.name}`
    );

    return NextResponse.json({ success: true, query: updated, emailResult });
  } catch (error) {
    console.error("[AdminQueries POST] Error:", error);
    return NextResponse.json({ error: "Failed to respond to query" }, { status: 500 });
  }
}
