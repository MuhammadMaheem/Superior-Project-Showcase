"use client";

import { useState } from "react";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Edit3,
  Check,
  X,
  AlertCircle,
  Users,
  Search,
  Sparkles,
  Loader2,
  Clock,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import type { Teacher, TeacherPending, TeacherSyncLog, TeacherSyncMeta } from "@/lib/sheets/models";
import { formatDate } from "@/lib/utils";

interface AdminTeacherSyncReviewProps {
  initialPending: TeacherPending[];
  initialLogs: TeacherSyncLog[];
  initialMeta: TeacherSyncMeta;
  liveTeachers: Teacher[];
}

export function AdminTeacherSyncReview({
  initialPending,
  initialLogs,
  initialMeta,
  liveTeachers: initialLiveTeachers,
}: AdminTeacherSyncReviewProps) {
  const [pending, setPending] = useState<TeacherPending[]>(initialPending);
  const [logs, setLogs] = useState<TeacherSyncLog[]>(initialLogs);
  const [meta, setMeta] = useState<TeacherSyncMeta>(initialMeta);
  const [liveTeachers, setLiveTeachers] = useState<Teacher[]>(initialLiveTeachers);

  // Sync execution state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Inline editing state for pending faculty
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<TeacherPending>>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Approval / Rejection state
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Live search
  const [liveSearch, setLiveSearch] = useState("");

  // Trigger Manual Sync
  const handleRunSync = async () => {
    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      const res = await fetch("/api/admin/sync-teachers", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setSyncStatusMsg(`Sync error: ${data.error}`);
        return;
      }

      if (data.data.hasChanges) {
        setSyncStatusMsg(`Sync complete: ${data.data.addedCount} additions, ${data.data.modifiedCount} modifications detected.`);
        // Reload pending
        const pendingRes = await fetch("/api/admin/teachers/pending");
        const pendingData = await pendingRes.json();
        setPending(pendingData.pending || []);
        setLogs(pendingData.logs || []);
        setMeta(pendingData.meta);
      } else {
        setSyncStatusMsg("Faculty data is up to date. No changes detected from source API.");
      }
    } catch {
      setSyncStatusMsg("Network error running faculty sync.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Start Inline Edit
  const startEdit = (teacher: TeacherPending) => {
    setEditingSlug(teacher.slug);
    setEditForm({
      name: teacher.name,
      designation: teacher.designation,
      subjects: teacher.subjects,
      sections: teacher.sections,
      office_number: teacher.office_number,
      workload_tier: teacher.workload_tier,
    });
  };

  // Save Inline Edit
  const saveEdit = async (slug: string) => {
    setIsSavingEdit(true);
    try {
      const res = await fetch("/api/admin/teachers/pending", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, ...editForm }),
      });
      const data = await res.json();
      if (res.ok) {
        setPending((prev) =>
          prev.map((t) => (t.slug === slug ? { ...t, ...data.teacher } : t))
        );
        setEditingSlug(null);
      }
    } catch (err) {
      console.error("Save edit failed:", err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Approve All or Specific Pending Teachers
  const handleApprove = async (slugs?: string[]) => {
    setIsApproving(true);
    try {
      const res = await fetch("/api/admin/teachers/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs }),
      });
      const data = await res.json();
      if (res.ok) {
        if (slugs) {
          setPending((prev) => prev.filter((t) => !slugs.includes(t.slug)));
        } else {
          setPending([]);
        }
        // Refresh live teachers
        const liveRes = await fetch("/api/teachers");
        const liveData = await liveRes.json();
        setLiveTeachers(liveData.teachers || []);
        setSyncStatusMsg(`Successfully approved and merged ${data.approvedCount} faculty updates.`);
      }
    } catch (err) {
      console.error("Approval failed:", err);
    } finally {
      setIsApproving(false);
    }
  };

  // Reject Pending
  const handleReject = async (slugs?: string[]) => {
    setIsRejecting(true);
    try {
      const res = await fetch("/api/admin/teachers/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs }),
      });
      const data = await res.json();
      if (res.ok) {
        if (slugs) {
          setPending((prev) => prev.filter((t) => !slugs.includes(t.slug)));
        } else {
          setPending([]);
        }
        setSyncStatusMsg(`Rejected ${data.rejectedCount} pending updates.`);
      }
    } catch (err) {
      console.error("Reject failed:", err);
    } finally {
      setIsRejecting(false);
    }
  };

  const filteredLive = liveTeachers.filter(
    (t) =>
      t.name.toLowerCase().includes(liveSearch.toLowerCase()) ||
      t.subjects.toLowerCase().includes(liveSearch.toLowerCase()) ||
      t.sections.toLowerCase().includes(liveSearch.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* 1. Sync Status Banner */}
      <div className="rounded-3xl border border-[#1f293d] bg-[#111827] p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="font-display text-lg font-bold text-white">
                Automated 24h Faculty Sync Engine
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Source: <code className="text-blue-400">https://superior-academic-tool.onrender.com/get_teachers</code>
            </p>
          </div>

          <button
            onClick={handleRunSync}
            disabled={isSyncing}
            className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-500 disabled:opacity-50 transition-all"
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Checking Remote API...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                <span>Check For Updates Now</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#1f293d]/80 text-xs font-mono">
          <div className="rounded-xl bg-[#0a0f1d] p-3 text-slate-400">
            <span className="text-slate-500">Last Synced:</span>{" "}
            <strong className="text-slate-200">{formatDate(meta.last_synced_at)}</strong>
          </div>
          <div className="rounded-xl bg-[#0a0f1d] p-3 text-slate-400">
            <span className="text-slate-500">SHA-256 Hash:</span>{" "}
            <strong className="text-slate-200">{meta.last_hash.slice(0, 14)}...</strong>
          </div>
          <div className="rounded-xl bg-[#0a0f1d] p-3 text-slate-400">
            <span className="text-slate-500">Status:</span>{" "}
            <strong className="text-emerald-400">{meta.last_check_status}</strong>
          </div>
        </div>

        {syncStatusMsg && (
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-300">
            {syncStatusMsg}
          </div>
        )}
      </div>

      {/* 2. Pending Faculty Review Queue (§4.4 & §7.5) */}
      <div className="rounded-3xl border border-[#1f293d] bg-[#111827] p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-amber-500/10 px-2.5 py-0.5 text-xs font-mono font-semibold text-amber-400 border border-amber-500/20">
                STAGING DIFF QUEUE
              </span>
              <span className="text-xs font-mono text-slate-400">
                {pending.length} changes awaiting moderation
              </span>
            </div>
            <h3 className="font-display text-xl font-bold text-white mt-1">
              Review & Inline-Correct Pending Faculty
            </h3>
            <p className="text-xs text-slate-400">
              The live source contains real typos (e.g. "Thoery" vs "Theory"). Click <strong>Edit</strong> to fix mistakes before clicking <strong>Approve</strong>.
            </p>
          </div>

          {pending.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleReject()}
                disabled={isRejecting || isApproving}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-colors"
              >
                <XCircle className="h-4 w-4" />
                <span>Reject All</span>
              </button>
              <button
                onClick={() => handleApprove()}
                disabled={isApproving || isRejecting}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-500 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Approve & Merge All</span>
              </button>
            </div>
          )}
        </div>

        {pending.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#1f293d] bg-[#0a0f1d] p-8 text-center text-xs text-slate-400 space-y-1">
            <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
            <p className="font-semibold text-white">Staging Queue is Clean</p>
            <p>All faculty records match the live approved database. No pending changes.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((t) => {
              const isEditing = editingSlug === t.slug;

              return (
                <div
                  key={t.slug}
                  className="rounded-2xl border border-[#1f293d] bg-[#0a0f1d] p-5 space-y-4 transition-all hover:border-slate-600"
                >
                  {isEditing ? (
                    /* Inline Edit Mode */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-amber-400">
                          Editing Pending Record ({t.slug})
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingSlug(null)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1e293b] text-slate-400 hover:text-white"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => saveEdit(t.slug)}
                            disabled={isSavingEdit}
                            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500"
                          >
                            {isSavingEdit ? "Saving..." : "Save Correction"}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-mono text-slate-400">Name</label>
                          <input
                            type="text"
                            value={editForm.name || ""}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full rounded-lg border border-[#1f293d] bg-[#111827] px-3 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-mono text-slate-400">Designation</label>
                          <input
                            type="text"
                            value={editForm.designation || ""}
                            onChange={(e) =>
                              setEditForm({ ...editForm, designation: e.target.value })
                            }
                            className="w-full rounded-lg border border-[#1f293d] bg-[#111827] px-3 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-[11px] font-mono text-slate-400">
                            Subjects (Correct typos here)
                          </label>
                          <input
                            type="text"
                            value={editForm.subjects || ""}
                            onChange={(e) =>
                              setEditForm({ ...editForm, subjects: e.target.value })
                            }
                            className="w-full rounded-lg border border-[#1f293d] bg-[#111827] px-3 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-[11px] font-mono text-slate-400">Sections</label>
                          <input
                            type="text"
                            value={editForm.sections || ""}
                            onChange={(e) =>
                              setEditForm({ ...editForm, sections: e.target.value })
                            }
                            className="w-full rounded-lg border border-[#1f293d] bg-[#111827] px-3 py-1.5 text-xs text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Display Diff Mode */
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-display font-bold text-white text-base">
                            {t.name}
                          </h4>
                          <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-mono text-blue-400 border border-blue-500/20">
                            {t.designation || "Faculty"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">
                          <strong className="text-slate-400">Subjects:</strong> {t.subjects}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">
                          <strong>Sections:</strong> {t.sections}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(t)}
                          className="flex items-center gap-1 rounded-xl bg-[#1e293b] px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Inline Edit</span>
                        </button>
                        <button
                          onClick={() => handleReject([t.slug])}
                          className="flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => handleApprove([t.slug])}
                          className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 shadow-md shadow-emerald-500/20 transition-colors"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Approve</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Live Approved Teachers Database Inspector */}
      <div className="rounded-3xl border border-[#1f293d] bg-[#111827] p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-lg font-bold text-white">
              Live Approved Teachers Tab ({liveTeachers.length})
            </h3>
            <p className="text-xs text-slate-400">
              The public showcase and student submission dropdowns read strictly from this live list.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={liveSearch}
              onChange={(e) => setLiveSearch(e.target.value)}
              placeholder="Search faculty by name or subject..."
              className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-[#0a0f1d] border-b border-[#1f293d] text-slate-400 font-mono uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Faculty Name</th>
                <th className="py-2.5 px-3">Designation</th>
                <th className="py-2.5 px-3">Subjects</th>
                <th className="py-2.5 px-3">Sections</th>
                <th className="py-2.5 px-3">Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f293d]/50 text-slate-300">
              {filteredLive.map((t) => (
                <tr key={t.slug} className="hover:bg-[#1e293b]/40">
                  <td className="py-2.5 px-3 font-semibold text-white">{t.name}</td>
                  <td className="py-2.5 px-3 text-slate-400">{t.designation}</td>
                  <td className="py-2.5 px-3 text-blue-400">{t.subjects}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-400">{t.sections}</td>
                  <td className="py-2.5 px-3 font-mono text-emerald-400">{t.workload_tier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
