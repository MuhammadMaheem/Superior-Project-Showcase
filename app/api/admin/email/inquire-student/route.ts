import { NextRequest, NextResponse } from "next/server";
import { sendEmail, generateStudentInquiryEmail } from "@/lib/email/mailer";
import { dataAdapter } from "@/lib/sheets/adapter";
import { getAdminSessionFromCookies } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized: Administrator session required" }, { status: 401 });
    }

    if (!session.permissions.can_send_inquiries) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to dispatch student inquiries" }, { status: 403 });
    }

    const body = await request.json();
    const {
      studentEmail,
      studentName,
      studentRollNumber,
      projectTitle,
      submittedGithubUrl,
      matchedProjectTitle,
      matchedRollNumber,
      matchedGithubUrl,
      similarityScore,
      customMessage,
    } = body;

    if (!studentEmail || !studentName || !projectTitle || !submittedGithubUrl) {
      return NextResponse.json(
        { error: "Missing required student inquiry fields (studentEmail, studentName, projectTitle, submittedGithubUrl)" },
        { status: 400 }
      );
    }

    const emailTemplate = generateStudentInquiryEmail({
      studentName,
      studentRollNumber: studentRollNumber || "N/A",
      projectTitle,
      submittedGithubUrl,
      matchedProjectTitle,
      matchedRollNumber,
      matchedGithubUrl,
      similarityScore: Number(similarityScore) || undefined,
      customMessage,
    });

    const result = await sendEmail({
      to: studentEmail,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to send email" }, { status: 500 });
    }

    // Log admin audit action
    await dataAdapter.logAdminAction(
      "INQUIRE_STUDENT_SIMILARITY",
      "project",
      studentRollNumber || projectTitle,
      `Sent plagiarism inquiry email to ${studentName} (${studentEmail}) for project "${projectTitle}". Similarity: ${similarityScore || 0}%. Mocked: ${result.mocked ? "true" : "false"}`
    );

    return NextResponse.json({
      success: true,
      mocked: result.mocked,
      messageId: result.messageId,
      refCode: emailTemplate.refCode,
      message: result.mocked
        ? `Simulated email transmission to ${studentEmail} [Case ID: ${emailTemplate.refCode}].`
        : `Official inquiry notice [${emailTemplate.refCode}] successfully dispatched to ${studentEmail}.`,
    });
  } catch (error: any) {
    console.error("[InquireStudent] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
