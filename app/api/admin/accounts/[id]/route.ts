import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromCookies } from "@/lib/auth/session";
import {
  updateTeacherAccount,
  deleteTeacherAccount,
  getTeacherAccountById,
} from "@/lib/auth/accounts";
import { generateTeacherCredentialsEmail, sendEmail } from "@/lib/email/mailer";
import { dataAdapter } from "@/lib/sheets/adapter";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSessionFromCookies();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Access denied: Super Admin authorization required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const {
      name,
      designation,
      is_active,
      permissions,
      assigned_subjects,
      newPassword,
      sendPasswordEmail,
    } = body;

    const existing = await getTeacherAccountById(id);
    if (!existing) {
      return NextResponse.json({ error: "Teacher account not found" }, { status: 404 });
    }

    const updated = await updateTeacherAccount(id, {
      name,
      designation,
      is_active,
      permissions,
      assigned_subjects,
      newPassword,
    });

    if (!updated) {
      return NextResponse.json({ error: "Failed to update account" }, { status: 400 });
    }

    try {
      await dataAdapter.logAdminAction(
        "UPDATE_TEACHER_ACCOUNT",
        "FACULTY",
        id,
        `Updated permissions/status for ${updated.name}`
      );
    } catch {}

    // If new password was set and user wants to email it
    let emailSent = false;
    if (newPassword && sendPasswordEmail) {
      const proto = request.headers.get("x-forwarded-proto") || "http";
      const host =
        request.headers.get("x-forwarded-host") ||
        request.headers.get("host") ||
        "localhost:3000";
      const loginUrl = `${proto}://${host}/admin/login`;

      const emailData = generateTeacherCredentialsEmail({
        teacherName: updated.name,
        teacherEmail: updated.email,
        temporaryPassword: newPassword,
        designation: updated.designation,
        loginUrl,
        permissionsList: ["Updated credentials issued by Super Administrator"],
      });

      const res = await sendEmail({
        to: updated.email,
        subject: emailData.subject,
        html: emailData.html,
      });
      emailSent = res.success;
    }

    const { password_hash, ...sanitized } = updated;

    return NextResponse.json({
      success: true,
      account: sanitized,
      emailSent,
      message: `Account for ${updated.name} updated successfully`,
    });
  } catch (error: any) {
    console.error("[Account Update API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update account" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSessionFromCookies();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Access denied: Super Admin authorization required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existing = await getTeacherAccountById(id);
    if (!existing) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    await deleteTeacherAccount(id);

    try {
      await dataAdapter.logAdminAction(
        "DELETE_TEACHER_ACCOUNT",
        "FACULTY",
        id,
        `Deleted account for ${existing.name} (${existing.email})`
      );
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Account for ${existing.name} has been deleted.`,
    });
  } catch (error: any) {
    console.error("[Account Delete API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete account" },
      { status: 500 }
    );
  }
}
