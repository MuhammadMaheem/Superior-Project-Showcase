import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromCookies } from "@/lib/auth/session";
import {
  getTeacherAccounts,
  createTeacherAccount,
} from "@/lib/auth/accounts";
import { generateTeacherCredentialsEmail, sendEmail } from "@/lib/email/mailer";
import { dataAdapter } from "@/lib/sheets/adapter";

export async function GET() {
  try {
    const session = await getAdminSessionFromCookies();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Access denied: Super Admin authorization required" },
        { status: 403 }
      );
    }

    const accounts = await getTeacherAccounts();
    // Return sanitized accounts (omitting password hashes)
    const sanitized = accounts.map(({ password_hash, ...rest }) => rest);
    return NextResponse.json({ accounts: sanitized });
  } catch (error: any) {
    console.error("[Accounts API] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch accounts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSessionFromCookies();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Access denied: Super Admin authorization required" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      name,
      email,
      designation,
      password,
      permissions,
      assigned_subjects,
      sendCredentialsEmail,
    } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Teacher Name and University Email are required." },
        { status: 400 }
      );
    }

    const { account, plainPassword } = await createTeacherAccount({
      name,
      email,
      designation,
      password,
      permissions,
      assigned_subjects,
    });

    try {
      await dataAdapter.logAdminAction(
        "CREATE_TEACHER_ACCOUNT",
        "FACULTY",
        account.id,
        `Created account for ${account.name} (${account.email})`
      );
    } catch {}

    // Dispatch credentials email via Gmail SMTP if requested
    let emailResult = null;
    if (sendCredentialsEmail) {
      const proto = request.headers.get("x-forwarded-proto") || "http";
      const host =
        request.headers.get("x-forwarded-host") ||
        request.headers.get("host") ||
        "localhost:3000";
      const loginUrl = `${proto}://${host}/admin/login`;

      const permissionsList: string[] = [];
      if (account.permissions.can_view_all_projects) {
        permissionsList.push("Full Project Directory Access (All Batches & Departments)");
      } else {
        permissionsList.push("Supervised Projects Access Only");
      }
      if (account.permissions.can_edit_projects) {
        permissionsList.push("Edit Project Status & Student Metadata");
      }
      if (account.permissions.can_delete_projects) {
        permissionsList.push("Delete & Unpublish Submissions");
      }
      if (account.permissions.can_send_inquiries) {
        permissionsList.push("Dispatch Student Similarity & Plagiarism Inquiries");
      }
      if (account.permissions.can_manage_queries) {
        permissionsList.push("Resolve Student Help Desk Queries");
      }
      if (account.permissions.can_view_telemetry) {
        permissionsList.push("Access Real-time Traffic Telemetry");
      }

      const emailData = generateTeacherCredentialsEmail({
        teacherName: account.name,
        teacherEmail: account.email,
        temporaryPassword: plainPassword,
        designation: account.designation,
        loginUrl,
        permissionsList,
      });

      emailResult = await sendEmail({
        to: account.email,
        subject: emailData.subject,
        html: emailData.html,
      });
    }

    const { password_hash, ...sanitizedAccount } = account;

    return NextResponse.json({
      success: true,
      account: sanitizedAccount,
      plainPassword,
      emailSent: emailResult?.success ?? false,
      message: `Account successfully created for ${account.name}`,
    });
  } catch (error: any) {
    console.error("[Accounts API] Create error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create teacher account" },
      { status: 400 }
    );
  }
}
