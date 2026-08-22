"use client";

import { useState } from "react";
import {
  Users,
  ShieldCheck,
  UserPlus,
  Trash2,
  Mail,
  Check,
  X,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  GraduationCap,
  ShieldAlert,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import {
  DEFAULT_TEACHER_PERMISSIONS,
  SUPER_ADMIN_PERMISSIONS,
  type TeacherAccount,
  type TeacherPermissions,
  type Teacher,
} from "@/lib/sheets/models";
import { formatDate } from "@/lib/utils";

interface TeacherAccountsManagerProps {
  initialAccounts: Omit<TeacherAccount, "password_hash">[];
  teachersList: Teacher[];
}

export function TeacherAccountsManager({
  initialAccounts,
  teachersList,
}: TeacherAccountsManagerProps) {
  const [accounts, setAccounts] = useState<Omit<TeacherAccount, "password_hash">[]>(initialAccounts);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Omit<TeacherAccount, "password_hash"> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Omit<TeacherAccount, "password_hash"> | null>(null);
  const [createdResult, setCreatedResult] = useState<{ account: Omit<TeacherAccount, "password_hash">; plainPassword: string; emailSent: boolean } | null>(null);

  // Create Form State
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDesignation, setNewDesignation] = useState("Assistant Professor");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPermissions, setNewPermissions] = useState<TeacherPermissions>({ ...DEFAULT_TEACHER_PERMISSIONS });
  const [sendEmail, setSendEmail] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Form State
  const [editPermissions, setEditPermissions] = useState<TeacherPermissions>({ ...DEFAULT_TEACHER_PERMISSIONS });
  const [editActive, setEditActive] = useState(true);
  const [editResetPassword, setEditResetPassword] = useState("");
  const [editSendEmail, setEditSendEmail] = useState(false);

  // Fetch accounts on refresh
  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/accounts");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.accounts)) {
          setAccounts(data.accounts);
        }
      }
    } catch (err) {
      console.error("Error fetching accounts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setNewName("");
    setNewEmail("");
    setNewDesignation("Assistant Professor");
    // Generate random 10-char password
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    let pwd = "";
    for (let i = 0; i < 10; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    setNewPassword(pwd);
    setNewPermissions({ ...DEFAULT_TEACHER_PERMISSIONS });
    setSendEmail(true);
    setIsCreateOpen(true);
    setCreatedResult(null);
  };

  const handleSelectExistingTeacher = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedName = e.target.value;
    if (!selectedName) return;
    const found = teachersList.find((t) => t.name === selectedName);
    if (found) {
      setNewName(found.name);
      setNewEmail(found.superior_email || `${found.name.toLowerCase().replace(/[^a-z0-9]/g, ".")}@superior.edu.pk`);
      setNewDesignation(found.designation || "Assistant Professor");
    }
  };

  // Quick Preset Handlers
  const applyPreset = (preset: "evaluator" | "coordinator" | "full" | "restricted", isEdit = false) => {
    let perms: TeacherPermissions;
    if (preset === "evaluator") {
      perms = {
        can_view_all_projects: false,
        can_edit_projects: true,
        can_delete_projects: false,
        can_send_inquiries: true,
        can_escalate_faculty: false,
        can_manage_queries: false,
        can_view_telemetry: false,
      };
    } else if (preset === "coordinator") {
      perms = {
        can_view_all_projects: true,
        can_edit_projects: true,
        can_delete_projects: false,
        can_send_inquiries: true,
        can_escalate_faculty: true,
        can_manage_queries: true,
        can_view_telemetry: true,
      };
    } else if (preset === "full") {
      perms = { ...SUPER_ADMIN_PERMISSIONS };
    } else {
      perms = {
        can_view_all_projects: false,
        can_edit_projects: false,
        can_delete_projects: false,
        can_send_inquiries: false,
        can_escalate_faculty: false,
        can_manage_queries: false,
        can_view_telemetry: false,
      };
    }

    if (isEdit) {
      setEditPermissions(perms);
    } else {
      setNewPermissions(perms);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      setNotification({ type: "error", message: "Name and Email are required." });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          designation: newDesignation.trim(),
          password: newPassword.trim(),
          permissions: newPermissions,
          sendCredentialsEmail: sendEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setNotification({ type: "error", message: data.error || "Failed to create teacher account" });
        setIsSubmitting(false);
        return;
      }

      setCreatedResult({
        account: data.account,
        plainPassword: data.plainPassword,
        emailSent: data.emailSent,
      });

      setNotification({
        type: "success",
        message: `Account created for ${data.account.name}! ${data.emailSent ? "Credentials sent via Gmail." : ""}`,
      });

      fetchAccounts();
    } catch {
      setNotification({ type: "error", message: "Network error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (acc: Omit<TeacherAccount, "password_hash">) => {
    setEditTarget(acc);
    setEditPermissions({ ...acc.permissions });
    setEditActive(acc.is_active);
    setEditResetPassword("");
    setEditSendEmail(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    setIsSubmitting(true);
    try {
      const payload: any = {
        permissions: editPermissions,
        is_active: editActive,
      };
      if (editResetPassword.trim()) {
        payload.newPassword = editResetPassword.trim();
        payload.sendPasswordEmail = editSendEmail;
      }

      const res = await fetch(`/api/admin/accounts/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setNotification({ type: "error", message: data.error || "Failed to update account" });
        setIsSubmitting(false);
        return;
      }

      setNotification({
        type: "success",
        message: `Account for ${editTarget.name} updated successfully!`,
      });

      setEditTarget(null);
      fetchAccounts();
    } catch {
      setNotification({ type: "error", message: "Network error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/accounts/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setNotification({ type: "error", message: data.error || "Failed to delete account" });
        setIsSubmitting(false);
        return;
      }

      setNotification({ type: "success", message: `Account for ${deleteTarget.name} removed.` });
      setDeleteTarget(null);
      fetchAccounts();
    } catch {
      setNotification({ type: "error", message: "Network error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCount = accounts.filter((a) => a.is_active).length;
  const suspendedCount = accounts.length - activeCount;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl p-4 text-xs font-mono border transition-all ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? <Check className="h-4 w-4 text-emerald-400" /> : <AlertCircle className="h-4 w-4 text-red-400" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white p-1">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-[#1f293d] bg-[#111827] p-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Users className="h-5 w-5" />
            </div>
            <h2 className="font-display text-xl font-bold text-white">Faculty Accounts & Access Control</h2>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Super Admin authority to provision faculty credentials, configure role-based permissions, and restrict project scopes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchAccounts}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-xl border border-[#1f293d] bg-[#0a0f1d] px-3.5 py-2.5 text-xs font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-blue-400" : ""}`} />
            <span>Sync</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-mono font-bold text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 transition-all cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ Create Faculty Account</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#1f293d] bg-[#0a0f1d] p-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Total Faculty Users</span>
            <p className="font-display text-2xl font-bold text-white">{accounts.length}</p>
          </div>
          <GraduationCap className="h-8 w-8 text-blue-400/40" />
        </div>

        <div className="rounded-2xl border border-[#1f293d] bg-[#0a0f1d] p-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">Active Credentials</span>
            <p className="font-display text-2xl font-bold text-emerald-400">{activeCount}</p>
          </div>
          <ShieldCheck className="h-8 w-8 text-emerald-400/40" />
        </div>

        <div className="rounded-2xl border border-[#1f293d] bg-[#0a0f1d] p-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider">Suspended / Inactive</span>
            <p className="font-display text-2xl font-bold text-amber-400">{suspendedCount}</p>
          </div>
          <ShieldAlert className="h-8 w-8 text-amber-400/40" />
        </div>
      </div>

      {/* Accounts Table */}
      <div className="rounded-3xl border border-[#1f293d] bg-[#111827] overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-[#1f293d] flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
            Registered Faculty Accounts ({accounts.length})
          </h3>
          <span className="text-[11px] text-slate-400">Passwords stored with SHA-512 salted hashing</span>
        </div>

        {accounts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="h-12 w-12 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">No faculty accounts provisioned yet.</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click &ldquo;+ Create Faculty Account&rdquo; above to set up login credentials and role permissions for university teachers.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0a0f1d] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1f293d]">
                <tr>
                  <th className="px-6 py-3.5">Faculty Member</th>
                  <th className="px-6 py-3.5">University Email</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Assigned Permissions</th>
                  <th className="px-6 py-3.5">Last Login</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f293d] text-slate-300">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-[#1a2333]/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white font-sans text-sm">{acc.name}</div>
                      <div className="text-[11px] text-slate-400">{acc.designation || "Faculty Member"}</div>
                    </td>

                    <td className="px-6 py-4 text-slate-200">
                      <span className="font-mono text-xs">{acc.email}</span>
                    </td>

                    <td className="px-6 py-4">
                      {acc.is_active ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-0.5 text-[10px] font-bold text-red-400 border border-red-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                          Suspended
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {acc.permissions?.can_view_all_projects ? (
                          <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-300 border border-blue-500/20">
                            All Projects
                          </span>
                        ) : (
                          <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] text-indigo-300 border border-indigo-500/20">
                            Supervised Only
                          </span>
                        )}
                        {acc.permissions?.can_edit_projects && (
                          <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300 border border-emerald-500/20">
                            Edit
                          </span>
                        )}
                        {acc.permissions?.can_delete_projects && (
                          <span className="rounded bg-red-500/10 px-2 py-0.5 text-[10px] text-red-300 border border-red-500/20">
                            Delete
                          </span>
                        )}
                        {acc.permissions?.can_send_inquiries && (
                          <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300 border border-amber-500/20">
                            Inquiries
                          </span>
                        )}
                        {acc.permissions?.can_manage_queries && (
                          <span className="rounded bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-300 border border-purple-500/20">
                            Queries
                          </span>
                        )}
                        {acc.permissions?.can_view_telemetry && (
                          <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-300 border border-cyan-500/20">
                            Telemetry
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-[11px] text-slate-400">
                      {acc.last_login_at ? formatDate(acc.last_login_at) : "Never logged in"}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(acc)}
                          className="flex items-center gap-1 rounded-lg bg-[#0a0f1d] px-2.5 py-1.5 text-xs text-blue-400 border border-blue-500/30 hover:bg-blue-600/20 transition-all cursor-pointer"
                        >
                          <Sliders className="h-3 w-3" />
                          <span>Permissions</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(acc)}
                          className="p-1.5 rounded-lg bg-[#0a0f1d] text-slate-400 hover:text-red-400 border border-[#1f293d] hover:border-red-500/40 transition-all cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE TEACHER ACCOUNT MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl border border-[#1f293d] bg-[#111827] p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#1e293b] text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            {createdResult ? (
              <div className="text-center space-y-6 py-4 animate-in fade-in duration-300">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display text-2xl font-bold text-white">Faculty Account Provisioned!</h3>
                  <p className="text-xs text-slate-300 max-w-md mx-auto">
                    Account for <strong className="text-white">{createdResult.account.name}</strong> is now live.
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-500/30 bg-[#0a0f1d] p-5 text-left space-y-3 font-mono text-xs">
                  <div className="flex justify-between border-b border-[#1f293d] pb-2">
                    <span className="text-slate-400">Login Email:</span>
                    <strong className="text-white">{createdResult.account.email}</strong>
                  </div>
                  <div className="flex justify-between border-b border-[#1f293d] pb-2">
                    <span className="text-slate-400">Temporary Password:</span>
                    <code className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      {createdResult.plainPassword}
                    </code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Gmail Dispatch:</span>
                    <span className={createdResult.emailSent ? "text-emerald-400" : "text-amber-400"}>
                      {createdResult.emailSent ? "✓ Sent to Faculty Inbox" : "⚠ Not Dispatched"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-mono font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500"
                >
                  Done & Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateSubmit} className="space-y-6">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-mono text-blue-400 border border-blue-500/20">
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>SUPER ADMIN FACULTY PROVISIONING</span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-white">Create New Teacher Account</h3>
                  <p className="text-xs text-slate-400">
                    Set up credentials and configure role-based permissions for university faculty.
                  </p>
                </div>

                {/* Quick Select from Verified Faculty */}
                {teachersList.length > 0 && (
                  <div className="space-y-1.5 rounded-2xl bg-[#0a0f1d] p-3.5 border border-[#1f293d]">
                    <label className="text-[11px] font-mono text-slate-300 block">
                      Quick-Select from Directory (Optional):
                    </label>
                    <select
                      onChange={handleSelectExistingTeacher}
                      className="w-full rounded-xl border border-[#1f293d] bg-[#111827] px-3.5 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">-- Choose existing faculty member --</option>
                      {teachersList.map((t) => (
                        <option key={t.slug} value={t.name}>
                          {t.name} ({t.designation || "Faculty"})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-300">Teacher Name *</label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Dr. Ahmed Bilal"
                      className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-300">University Email *</label>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="e.g. ahmed.bilal@superior.edu.pk"
                      className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-300">Designation / Role</label>
                    <input
                      type="text"
                      value={newDesignation}
                      onChange={(e) => setNewDesignation(e.target.value)}
                      placeholder="e.g. FYP Committee Member"
                      className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono text-slate-300">Initial Password *</label>
                      <button
                        type="button"
                        onClick={() => {
                          const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
                          let pwd = "";
                          for (let i = 0; i < 10; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
                          setNewPassword(pwd);
                        }}
                        className="text-[10px] font-mono text-blue-400 hover:text-blue-300 underline"
                      >
                        🎲 Regenerate
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] pr-10 pl-3.5 py-2.5 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1"
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 1-Click Policy Presets */}
                <div className="space-y-2 border-t border-[#1f293d] pt-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono font-bold uppercase text-slate-300">
                      Configure Role Permissions
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">1-Click Presets:</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyPreset("evaluator")}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono bg-[#0a0f1d] text-slate-300 border border-[#1f293d] hover:border-blue-500/40 hover:text-white"
                    >
                      🔍 Viva Evaluator
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("coordinator")}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono bg-[#0a0f1d] text-slate-300 border border-[#1f293d] hover:border-blue-500/40 hover:text-white"
                    >
                      🛡️ FYP Coordinator
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("full")}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono bg-[#0a0f1d] text-slate-300 border border-[#1f293d] hover:border-blue-500/40 hover:text-white"
                    >
                      👑 Full Access
                    </button>
                  </div>

                  {/* Permission Checkboxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    <label className="flex items-start gap-2.5 rounded-xl border border-[#1f293d] bg-[#0a0f1d] p-3 text-xs cursor-pointer hover:border-slate-700">
                      <input
                        type="checkbox"
                        checked={newPermissions.can_view_all_projects}
                        onChange={(e) =>
                          setNewPermissions({ ...newPermissions, can_view_all_projects: e.target.checked })
                        }
                        className="mt-0.5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                      />
                      <div>
                        <div className="font-semibold text-white">View All Projects</div>
                        <div className="text-[11px] text-slate-400">If unchecked, sees only supervised submissions.</div>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 rounded-xl border border-[#1f293d] bg-[#0a0f1d] p-3 text-xs cursor-pointer hover:border-slate-700">
                      <input
                        type="checkbox"
                        checked={newPermissions.can_edit_projects}
                        onChange={(e) =>
                          setNewPermissions({ ...newPermissions, can_edit_projects: e.target.checked })
                        }
                        className="mt-0.5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                      />
                      <div>
                        <div className="font-semibold text-white">Edit Projects</div>
                        <div className="text-[11px] text-slate-400">Can modify title, status, and metadata.</div>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 rounded-xl border border-[#1f293d] bg-[#0a0f1d] p-3 text-xs cursor-pointer hover:border-slate-700">
                      <input
                        type="checkbox"
                        checked={newPermissions.can_delete_projects}
                        onChange={(e) =>
                          setNewPermissions({ ...newPermissions, can_delete_projects: e.target.checked })
                        }
                        className="mt-0.5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                      />
                      <div>
                        <div className="font-semibold text-white">Delete Projects</div>
                        <div className="text-[11px] text-slate-400">Can permanently delete or unpublish.</div>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 rounded-xl border border-[#1f293d] bg-[#0a0f1d] p-3 text-xs cursor-pointer hover:border-slate-700">
                      <input
                        type="checkbox"
                        checked={newPermissions.can_send_inquiries}
                        onChange={(e) =>
                          setNewPermissions({ ...newPermissions, can_send_inquiries: e.target.checked })
                        }
                        className="mt-0.5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                      />
                      <div>
                        <div className="font-semibold text-white">Send Inquiries</div>
                        <div className="text-[11px] text-slate-400">Can dispatch plagiarism inquiry emails.</div>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 rounded-xl border border-[#1f293d] bg-[#0a0f1d] p-3 text-xs cursor-pointer hover:border-slate-700">
                      <input
                        type="checkbox"
                        checked={newPermissions.can_manage_queries}
                        onChange={(e) =>
                          setNewPermissions({ ...newPermissions, can_manage_queries: e.target.checked })
                        }
                        className="mt-0.5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                      />
                      <div>
                        <div className="font-semibold text-white">Manage Queries</div>
                        <div className="text-[11px] text-slate-400">Resolve student help desk requests.</div>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 rounded-xl border border-[#1f293d] bg-[#0a0f1d] p-3 text-xs cursor-pointer hover:border-slate-700">
                      <input
                        type="checkbox"
                        checked={newPermissions.can_view_telemetry}
                        onChange={(e) =>
                          setNewPermissions({ ...newPermissions, can_view_telemetry: e.target.checked })
                        }
                        className="mt-0.5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                      />
                      <div>
                        <div className="font-semibold text-white">View Telemetry</div>
                        <div className="text-[11px] text-slate-400">Access visitor analytics and graphs.</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Email Dispatch Checkbox */}
                <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
                  <label className="flex items-center gap-3 text-xs font-mono text-blue-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      className="rounded border-blue-500 bg-slate-900 text-blue-600"
                    />
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-4 w-4 text-blue-400" />
                      <span>Email login credentials & temporary password to teacher via Gmail SMTP</span>
                    </div>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="rounded-xl border border-[#1f293d] px-4 py-2.5 text-xs font-mono text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-xs font-mono font-bold text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    <span>Provision Account</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* EDIT PERMISSIONS / RESET PASSWORD MODAL */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-3xl border border-[#1f293d] bg-[#111827] p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditTarget(null)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#1e293b] text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <form onSubmit={handleEditSubmit} className="space-y-5">
              <div className="space-y-1">
                <h3 className="font-display text-xl font-bold text-white">Edit Permissions: {editTarget.name}</h3>
                <p className="text-xs text-slate-400 font-mono">{editTarget.email}</p>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between rounded-2xl border border-[#1f293d] bg-[#0a0f1d] p-3.5">
                <div>
                  <div className="text-xs font-mono font-semibold text-white">Account Status</div>
                  <div className="text-[11px] text-slate-400">Active accounts can log in to workbench.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditActive(!editActive)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                    editActive
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                      : "bg-red-600 text-white shadow-md shadow-red-500/20"
                  }`}
                >
                  {editActive ? "🟢 Active" : "🔴 Suspended"}
                </button>
              </div>

              {/* Permission Presets */}
              <div className="space-y-2 border-t border-[#1f293d] pt-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold uppercase text-slate-300">
                    Permissions Configuration
                  </label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => applyPreset("evaluator", true)}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#0a0f1d] text-slate-300 border border-[#1f293d]"
                    >
                      Evaluator
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("coordinator", true)}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#0a0f1d] text-slate-300 border border-[#1f293d]"
                    >
                      Coordinator
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("full", true)}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#0a0f1d] text-slate-300 border border-[#1f293d]"
                    >
                      Full
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 rounded-xl border border-[#1f293d] bg-[#0a0f1d] p-2.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPermissions.can_view_all_projects}
                      onChange={(e) => setEditPermissions({ ...editPermissions, can_view_all_projects: e.target.checked })}
                      className="rounded border-slate-700 bg-slate-900 text-blue-600"
                    />
                    <span>View All Projects</span>
                  </label>

                  <label className="flex items-center gap-2 rounded-xl border border-[#1f293d] bg-[#0a0f1d] p-2.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPermissions.can_edit_projects}
                      onChange={(e) => setEditPermissions({ ...editPermissions, can_edit_projects: e.target.checked })}
                      className="rounded border-slate-700 bg-slate-900 text-blue-600"
                    />
                    <span>Edit Projects</span>
                  </label>

                  <label className="flex items-center gap-2 rounded-xl border border-[#1f293d] bg-[#0a0f1d] p-2.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPermissions.can_delete_projects}
                      onChange={(e) => setEditPermissions({ ...editPermissions, can_delete_projects: e.target.checked })}
                      className="rounded border-slate-700 bg-slate-900 text-blue-600"
                    />
                    <span>Delete Projects</span>
                  </label>

                  <label className="flex items-center gap-2 rounded-xl border border-[#1f293d] bg-[#0a0f1d] p-2.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPermissions.can_send_inquiries}
                      onChange={(e) => setEditPermissions({ ...editPermissions, can_send_inquiries: e.target.checked })}
                      className="rounded border-slate-700 bg-slate-900 text-blue-600"
                    />
                    <span>Send Inquiries</span>
                  </label>

                  <label className="flex items-center gap-2 rounded-xl border border-[#1f293d] bg-[#0a0f1d] p-2.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPermissions.can_manage_queries}
                      onChange={(e) => setEditPermissions({ ...editPermissions, can_manage_queries: e.target.checked })}
                      className="rounded border-slate-700 bg-slate-900 text-blue-600"
                    />
                    <span>Manage Queries</span>
                  </label>

                  <label className="flex items-center gap-2 rounded-xl border border-[#1f293d] bg-[#0a0f1d] p-2.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPermissions.can_view_telemetry}
                      onChange={(e) => setEditPermissions({ ...editPermissions, can_view_telemetry: e.target.checked })}
                      className="rounded border-slate-700 bg-slate-900 text-blue-600"
                    />
                    <span>View Telemetry</span>
                  </label>
                </div>
              </div>

              {/* Optional Reset Password */}
              <div className="space-y-2 border-t border-[#1f293d] pt-3">
                <label className="text-xs font-mono text-slate-300 flex justify-between">
                  <span>Reset Password (Optional)</span>
                  <span className="text-[10px] text-slate-500">Leave blank to keep current</span>
                </label>
                <input
                  type="text"
                  value={editResetPassword}
                  onChange={(e) => setEditResetPassword(e.target.value)}
                  placeholder="Enter new password to overwrite..."
                  className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] px-3.5 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
                />

                {editResetPassword && (
                  <label className="flex items-center gap-2 text-[11px] font-mono text-blue-300 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editSendEmail}
                      onChange={(e) => setEditSendEmail(e.target.checked)}
                      className="rounded border-blue-500 bg-slate-900 text-blue-600"
                    />
                    <span>Email new password to {editTarget.email}</span>
                  </label>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="rounded-xl border border-[#1f293d] px-4 py-2.5 text-xs font-mono text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-mono font-bold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-500 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-3xl border border-red-500/30 bg-[#111827] p-6 sm:p-8 shadow-2xl space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/20 text-red-400">
              <Trash2 className="h-7 w-7" />
            </div>

            <div className="space-y-1">
              <h3 className="font-display text-xl font-bold text-white">Delete Teacher Account?</h3>
              <p className="text-xs text-slate-400">
                Are you sure you want to permanently delete access for <strong className="text-white">{deleteTarget.name}</strong> ({deleteTarget.email})?
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-[#1f293d] px-4 py-2.5 text-xs font-mono text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={isSubmitting}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-mono font-bold text-white shadow-lg shadow-red-500/25 hover:bg-red-500 disabled:opacity-50"
              >
                {isSubmitting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
