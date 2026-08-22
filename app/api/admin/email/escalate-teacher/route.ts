import { NextRequest, NextResponse } from "next/server";
import { sendEmail, generateTeacherEscalationEmail } from "@/lib/email/mailer";
import { dataAdapter } from "@/lib/sheets/adapter";
import { getAdminSessionFromCookies } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized: Administrator session required" }, { status: 401 });
    }

    if (!session.permissions.can_escalate_faculty) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to escalate plagiarism cases to faculty" }, { status: 403 });
    }

    const body = await request.json();
    const {
      teacherEmail,
      teacherName,
      studentName,
      studentRollNumber,
      projectTitle,
      submittedGithubUrl,
      matchedProjectTitle,
      matchedRollNumber,
      matchedGithubUrl,
      similarityScore,
      adminNotes,
      studentResponse,
      projectId,
    } = body;

    if (!teacherEmail || !teacherName || !studentName || !projectTitle || !submittedGithubUrl) {
      return NextResponse.json(
        { error: "Missing required escalation fields (teacherEmail, teacherName, studentName, projectTitle, submittedGithubUrl)" },
        { status: 400 }
      );
    }

    const emailTemplate = generateTeacherEscalationEmail({
      teacherName,
      studentName,
      studentRollNumber: studentRollNumber || "N/A",
      projectTitle,
      submittedGithubUrl,
      matchedProjectTitle,
      matchedRollNumber,
      matchedGithubUrl,
      similarityScore: Number(similarityScore) || undefined,
      adminNotes,
      studentResponse,
    });

    const result = await sendEmail({
      to: teacherEmail,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to send email to teacher" }, { status: 500 });
    }

    // If projectId is provided, hide or mark project status
    if (projectId) {
      try {
        await dataAdapter.updateProject(projectId, { status: "hidden" });
      } catch (err) {
        console.warn("[EscalateTeacher] Failed to auto-hide project:", err);
      }
    }

    // Log admin audit action
    await dataAdapter.logAdminAction(
      "ESCALATE_TO_TEACHER_DISCIPLINARY",
      "project",
      projectId || studentRollNumber || projectTitle,
      `Transferred plagiarism dossier for "${projectTitle}" (${studentName}, ${studentRollNumber}) to supervising teacher ${teacherName} (${teacherEmail}). Project auto-hidden pending disciplinary review. Mocked: ${result.mocked ? "true" : "false"}`
    );

    return NextResponse.json({
      success: true,
      mocked: result.mocked,
      messageId: result.messageId,
      refCode: emailTemplate.refCode,
      message: result.mocked
        ? `Simulated escalation dossier transmission to ${teacherEmail} [Dossier Ref: ${emailTemplate.refCode}].`
        : `Disciplinary dossier [${emailTemplate.refCode}] successfully delivered to ${teacherName} (${teacherEmail}).`,
    });
  } catch (error: any) {
    console.error("[EscalateTeacher] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
