"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Send, CheckCircle2, AlertCircle, HelpCircle, Loader2, BookOpen } from "lucide-react";
import type { Project } from "@/lib/sheets/models";

interface QueryFormProps {
  projects: Project[];
}

export function QueryForm({ projects }: QueryFormProps) {
  const searchParams = useSearchParams();
  const preselectedProjectId = searchParams.get("projectId") || "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [relatedProjectId, setRelatedProjectId] = useState(preselectedProjectId);
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const selectedProject = projects.find((p) => p.id === relatedProjectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/queries/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          roll_number: rollNumber.trim().toUpperCase(),
          related_project_id: relatedProjectId,
          message: message.trim(),
          honeypot,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to send query. Please check your fields.");
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
    } catch {
      setFormError("A network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="mx-auto max-w-xl text-center space-y-6 rounded-3xl border border-[#1f293d] bg-[#111827] p-8 sm:p-12 shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-bold text-white">Request Dispatched</h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Thank you, <strong className="text-white">{name}</strong>. Your query has been logged in the faculty super-admin inbox. If you provided an email, an update will be communicated directly.
          </p>
        </div>
        <button
          onClick={() => {
            setIsSuccess(false);
            setMessage("");
          }}
          className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-[#1f293d] bg-[#111827] p-6 sm:p-8 shadow-xl">
      {/* Honeypot */}
      <div className="hidden" aria-hidden="true">
        <input
          type="text"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
        />
      </div>

      {formError && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs sm:text-sm text-rose-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Project Selector Highlight (§4.3) */}
      <div className="space-y-2 rounded-2xl border border-blue-500/20 bg-[#0a0f1d] p-4">
        <label className="flex items-center gap-2 text-xs font-mono font-medium text-blue-300">
          <BookOpen className="h-4 w-4 text-blue-400" />
          <span>Is this about one of your submitted projects? (Recommended)</span>
        </label>
        <select
          value={relatedProjectId}
          onChange={(e) => setRelatedProjectId(e.target.value)}
          className="w-full rounded-xl border border-[#1f293d] bg-[#111827] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">-- Select a Project (or leave unselected for general queries) --</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.project_title} (by {p.student_name} · {p.roll_number})
            </option>
          ))}
        </select>
        {selectedProject && (
          <p className="text-[11px] text-slate-400">
            Selected: <strong className="text-slate-200">{selectedProject.project_title}</strong> (Supervisor: {selectedProject.supervisor_name})
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-slate-300">Your Full Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ayesha Malik"
            className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] px-3.5 py-2 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-slate-300">Email Address (Optional)</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@superior.edu.pk"
            className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] px-3.5 py-2 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Roll Number */}
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-mono text-slate-300">Roll Number (Optional)</label>
          <input
            type="text"
            value={rollNumber}
            onChange={(e) => setRollNumber(e.target.value)}
            placeholder="e.g. BSSE-F21-118"
            className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] px-3.5 py-2 text-xs sm:text-sm text-white font-mono uppercase focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Message */}
      <div className="space-y-1.5">
        <label className="text-xs font-mono text-slate-300">
          Correction Details / Message *
        </label>
        <textarea
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Please specify what change or correction is needed (e.g. updated demo link, typo in title, new tech stack tag)..."
          className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] p-3.5 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-none leading-relaxed"
        />
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 disabled:opacity-50 transition-all"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Transmitting...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>Submit Request</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
