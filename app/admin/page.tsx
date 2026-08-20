import { dataAdapter } from "@/lib/sheets/adapter";
import { AdminTour } from "@/components/AdminTour";
import Link from "next/link";
import {
  Layers,
  CheckCircle2,
  EyeOff,
  Users,
  MessageSquare,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export const revalidate = 0;

export default async function AdminDashboardPage() {
  const [projects, teachers, pendingTeachers, queries, syncMeta] = await Promise.all([
    dataAdapter.getProjects({ publishedOnly: false }),
    dataAdapter.getTeachers(),
    dataAdapter.getTeachersPending(),
    dataAdapter.getQueries(),
    dataAdapter.getSyncMeta(),
  ]);

  const publishedCount = projects.filter((p) => p.status === "published").length;
  const hiddenCount = projects.filter((p) => p.status === "hidden").length;
  const openQueries = queries.filter((q) => q.status === "open");

  return (
    <div className="space-y-8">
      <AdminTour />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-blue-500/10 px-2.5 py-0.5 text-xs font-mono font-semibold text-blue-400 border border-blue-500/20">
              SUPER-ADMIN CONSOLE
            </span>
            <span className="text-xs font-mono text-slate-500">
              Single-Admin Authority
            </span>
          </div>
          <h1 className="font-display text-3xl font-extrabold text-white tracking-tight mt-1">
            System Overview & Metrics
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/teachers"
            className="flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-xs font-semibold text-blue-300 hover:bg-blue-500/20 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Faculty Sync Status</span>
          </Link>
          <Link
            href="/admin/projects"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-500 transition-colors"
          >
            <Layers className="h-4 w-4" />
            <span>Manage All Projects</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div id="tour-overview-stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Projects */}
        <div className="rounded-3xl border border-[#1f293d] bg-[#111827] p-5 shadow-xl">
          <div className="flex items-center justify-between text-blue-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Total Projects</span>
            <Layers className="h-5 w-5" />
          </div>
          <p className="font-display text-3xl font-bold text-white">{projects.length}</p>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">{publishedCount} active on showcase</p>
        </div>

        {/* Published */}
        <div className="rounded-3xl border border-[#1f293d] bg-[#111827] p-5 shadow-xl">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Published</span>
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <p className="font-display text-3xl font-bold text-emerald-400">{publishedCount}</p>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">Publicly visible</p>
        </div>

        {/* Hidden */}
        <div className="rounded-3xl border border-[#1f293d] bg-[#111827] p-5 shadow-xl">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Hidden / Draft</span>
            <EyeOff className="h-5 w-5" />
          </div>
          <p className="font-display text-3xl font-bold text-amber-400">{hiddenCount}</p>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">Moderated from public</p>
        </div>

        {/* Faculty Live */}
        <div className="rounded-3xl border border-[#1f293d] bg-[#111827] p-5 shadow-xl">
          <div className="flex items-center justify-between text-purple-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Faculty Live</span>
            <Users className="h-5 w-5" />
          </div>
          <p className="font-display text-3xl font-bold text-purple-400">{teachers.length}</p>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            {pendingTeachers.length > 0 ? (
              <span className="text-amber-400 font-semibold">{pendingTeachers.length} updates pending</span>
            ) : (
              "All synced & approved"
            )}
          </p>
        </div>

        {/* Open Queries */}
        <div className="rounded-3xl border border-[#1f293d] bg-[#111827] p-5 shadow-xl">
          <div className="flex items-center justify-between text-rose-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Open Queries</span>
            <MessageSquare className="h-5 w-5" />
          </div>
          <p className="font-display text-3xl font-bold text-rose-400">{openQueries.length}</p>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">Awaiting response</p>
        </div>
      </div>

      {/* Action Alerts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pending Faculty Sync Review Alert */}
        <div className="rounded-3xl border border-[#1f293d] bg-[#111827] p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-white">Faculty 24h Sync Staging</h3>
                <p className="text-xs text-slate-400">Automated university faculty ingestion status</p>
              </div>
            </div>
            <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[11px] font-mono text-blue-400">
              {syncMeta.last_check_status}
            </span>
          </div>

          <div className="rounded-2xl border border-[#1f293d] bg-[#0a0f1d] p-4 text-xs font-mono space-y-1.5 text-slate-400">
            <p><span className="text-slate-500">Last Synced:</span> {formatDate(syncMeta.last_synced_at)}</p>
            <p><span className="text-slate-500">SHA-256 Hash:</span> {syncMeta.last_hash.slice(0, 16)}...</p>
            <p><span className="text-slate-500">Staged Queue:</span> <strong className="text-white">{pendingTeachers.length} changes awaiting review</strong></p>
          </div>

          <Link
            href="/admin/teachers"
            className="flex items-center justify-between rounded-xl bg-[#1e293b] px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            <span>Review & Edit Pending Faculty</span>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </Link>
        </div>

        {/* Student Queries Alert */}
        <div className="rounded-3xl border border-[#1f293d] bg-[#111827] p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-white">Student Edit Requests & Queries</h3>
                <p className="text-xs text-slate-400">Corrections and edit proposals</p>
              </div>
            </div>
            <span className="rounded bg-rose-500/10 px-2 py-0.5 text-[11px] font-mono font-bold text-rose-400">
              {openQueries.length} Open
            </span>
          </div>

          {openQueries.length > 0 ? (
            <div className="rounded-2xl border border-[#1f293d] bg-[#0a0f1d] p-4 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-bold text-white">{openQueries[0].name} ({openQueries[0].roll_number || "Student"})</span>
                <span className="text-[10px] font-mono">{formatDate(openQueries[0].submitted_at)}</span>
              </div>
              <p className="text-slate-300 line-clamp-2 italic">&ldquo;{openQueries[0].message}&rdquo;</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#1f293d] bg-[#0a0f1d] p-4 text-center text-xs text-slate-400">
              No open student queries at this moment.
            </div>
          )}

          <Link
            href="/admin/queries"
            className="flex items-center justify-between rounded-xl bg-[#1e293b] px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            <span>Open Query Resolution Inbox</span>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* Recent Submissions Snapshot */}
      <div className="rounded-3xl border border-[#1f293d] bg-[#111827] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-white">Recent Project Submissions</h3>
          <Link
            href="/admin/projects"
            className="text-xs font-mono text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>View Full Project Table</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#1f293d] text-slate-400 font-mono uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Project Title</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Roll No</th>
                <th className="py-3 px-4">Supervisor</th>
                <th className="py-3 px-4">Batch</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f293d]/60 text-slate-300">
              {projects.slice(0, 5).map((p) => (
                <tr key={p.id} className="hover:bg-[#1e293b]/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-white max-w-xs truncate">
                    {p.project_title}
                  </td>
                  <td className="py-3.5 px-4">{p.student_name}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">{p.roll_number}</td>
                  <td className="py-3.5 px-4 text-emerald-400 font-medium">{p.supervisor_name}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">{p.batch_section}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold ${
                        p.status === "published"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">{formatDate(p.submitted_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
