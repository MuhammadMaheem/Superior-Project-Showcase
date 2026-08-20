import { dataAdapter } from "@/lib/sheets/adapter";
import { ShieldCheck, Clock, Layers, User } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const revalidate = 0;

export default async function AdminAuditPage() {
  const logs = await dataAdapter.getAuditLogs();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-extrabold text-white tracking-tight">
            Security & Administrative Audit Trail
          </h1>
          <p className="text-xs text-slate-400">
            Append-only cryptographic timeline of administrative logins, moderation toggles, and faculty sync approvals.
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-[#1f293d] bg-[#111827] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#1f293d] bg-[#0a0f1d]/50 text-slate-400 font-mono uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Type</th>
                <th className="py-3 px-4">Target ID</th>
                <th className="py-3 px-4">Event Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f293d]/50 text-slate-300 font-mono">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 font-mono">
                    No audit records registered yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#1e293b]/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/20">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{log.target_type}</td>
                    <td className="py-3 px-4 text-slate-400 max-w-[120px] truncate">{log.target_id}</td>
                    <td className="py-3 px-4 font-sans text-xs text-slate-200">{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
