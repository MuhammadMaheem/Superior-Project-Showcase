"use client";

import { useState } from "react";
import {
  MessageSquare,
  CheckCircle2,
  Clock,
  Send,
  BookOpen,
  User,
  Hash,
  Mail,
  ExternalLink,
  ChevronRight,
  Loader2,
  Check,
} from "lucide-react";
import type { QueryMessage, Project } from "@/lib/sheets/models";
import { formatDate } from "@/lib/utils";

interface EnrichedQuery extends QueryMessage {
  related_project?: Project | null;
}

interface AdminQueriesInboxProps {
  initialQueries: EnrichedQuery[];
}

export function AdminQueriesInbox({ initialQueries }: AdminQueriesInboxProps) {
  const [queries, setQueries] = useState<EnrichedQuery[]>(initialQueries);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "resolved">("open");
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(
    initialQueries[0]?.id || null
  );
  const [responseText, setResponseText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredQueries = queries.filter((q) => {
    if (statusFilter !== "all" && q.status !== statusFilter) return false;
    return true;
  });

  const activeQuery = queries.find((q) => q.id === selectedQueryId) || null;

  const handleSendResponse = async (id: string, markResolved = true) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          admin_response: responseText.trim(),
          status: markResolved ? "resolved" : "open",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setQueries((prev) =>
          prev.map((q) =>
            q.id === id
              ? { ...q, admin_response: responseText.trim(), status: markResolved ? "resolved" : "open" }
              : q
          )
        );
        setResponseText("");
      }
    } catch (err) {
      console.error("Failed to respond to query:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setStatusFilter("open")}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            statusFilter === "open"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "bg-[#111827] text-slate-400 hover:text-white"
          }`}
        >
          Open Queries ({queries.filter((q) => q.status === "open").length})
        </button>
        <button
          onClick={() => setStatusFilter("resolved")}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            statusFilter === "resolved"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "bg-[#111827] text-slate-400 hover:text-white"
          }`}
        >
          Resolved ({queries.filter((q) => q.status === "resolved").length})
        </button>
        <button
          onClick={() => setStatusFilter("all")}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            statusFilter === "all"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "bg-[#111827] text-slate-400 hover:text-white"
          }`}
        >
          All ({queries.length})
        </button>
      </div>

      {/* Split Pane: Query List on Left, Active Query Detail & Project Context on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
        {/* Left Column: Query Items */}
        <div className="lg:col-span-5 rounded-3xl border border-[#1f293d] bg-[#111827] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#1f293d] bg-[#0a0f1d]/50 font-mono text-[11px] text-slate-400 uppercase">
            Inbound Student Inquiries ({filteredQueries.length})
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#1f293d]/50">
            {filteredQueries.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                No queries in this view.
              </div>
            ) : (
              filteredQueries.map((q) => (
                <div
                  key={q.id}
                  onClick={() => {
                    setSelectedQueryId(q.id);
                    setResponseText(q.admin_response || "");
                  }}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedQueryId === q.id
                      ? "bg-blue-600/10 border-l-4 border-blue-500"
                      : "hover:bg-[#1e293b]/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-white truncate max-w-[180px]">
                      {q.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {formatDate(q.submitted_at)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2">{q.message}</p>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1f293d]/40 text-[10px] font-mono">
                    <span className="text-slate-400">{q.roll_number || "No Roll No"}</span>
                    {q.status === "open" ? (
                      <span className="text-rose-400 font-bold">OPEN</span>
                    ) : (
                      <span className="text-emerald-400 font-bold">RESOLVED</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Query Details & Inline Linked Project (§4.3) */}
        <div className="lg:col-span-7 rounded-3xl border border-[#1f293d] bg-[#111827] p-6 space-y-6 flex flex-col justify-between shadow-xl">
          {activeQuery ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#1f293d] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-bold text-white">
                      {activeQuery.name}
                    </h3>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold ${
                        activeQuery.status === "open"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}
                    >
                      {activeQuery.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                    {activeQuery.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span>{activeQuery.email}</span>
                      </span>
                    )}
                    {activeQuery.roll_number && (
                      <span className="flex items-center gap-1 font-mono">
                        <Hash className="h-3 w-3" />
                        <span>{activeQuery.roll_number}</span>
                      </span>
                    )}
                    <span>{formatDate(activeQuery.submitted_at)}</span>
                  </div>
                </div>
              </div>

              {/* Inbound Message */}
              <div className="rounded-2xl border border-[#1f293d] bg-[#0a0f1d] p-4 space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase">
                  Student Request Message
                </span>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                  {activeQuery.message}
                </p>
              </div>

              {/* INLINE LINKED PROJECT CONTEXT (§4.3 SPEC ENFORCEMENT) */}
              {activeQuery.related_project ? (
                <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-blue-400">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>Linked Project Context (Automatic Ingestion)</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {activeQuery.related_project.batch_section}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">
                      {activeQuery.related_project.project_title}
                    </h4>
                    <p className="text-xs text-slate-300 line-clamp-2">
                      {activeQuery.related_project.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-500/20 text-[11px] font-mono text-slate-400">
                    <p><span className="text-slate-500">Supervisor:</span> <strong className="text-emerald-400">{activeQuery.related_project.supervisor_name}</strong></p>
                    <p><span className="text-slate-500">Subject:</span> {activeQuery.related_project.subject}</p>
                    <p><span className="text-slate-500">GitHub:</span> <a href={activeQuery.related_project.github_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Repo Link</a></p>
                    <p><span className="text-slate-500">Live URL:</span> {activeQuery.related_project.live_url || "None"}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-[#1f293d] bg-[#0a0f1d]/40 p-3 text-xs text-slate-500 italic">
                  No specific project linked to this general query.
                </div>
              )}

              {/* Admin Response & Resolution Box */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-mono text-slate-300">
                  Administrator Response / Internal Resolution Notes
                </label>
                <textarea
                  rows={3}
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Record what action was taken (e.g. 'Updated live link in Projects database', 'Corrected supervisor name')..."
                  className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] p-3 text-xs text-white focus:border-blue-500 focus:outline-none"
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500">
                    Saves reply and marks query as resolved
                  </span>
                  <button
                    onClick={() => handleSendResponse(activeQuery.id, true)}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-500 disabled:opacity-50 transition-all"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    <span>Mark as Resolved</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-slate-500 text-xs font-mono">
              Select an inquiry from the inbox to inspect details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
