"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  ExternalLink,
  Check,
  X,
  AlertTriangle,
  Loader2,
  PlusCircle,
  User,
  BookOpen,
  Layers,
  Globe,
  Mail,
  Send,
  ShieldAlert,
  ShieldCheck,
  GraduationCap,
  GitCompare,
  Download,
} from "lucide-react";
import { GithubIcon } from "@/components/Icons";
import { FacultyCombobox } from "@/components/FacultyCombobox";
import {
  evaluateProjectSimilarity,
  compareProjectsDetail,
  type SimilarityMatch,
  type ProjectComparisonDetail,
} from "@/lib/similarity/detector";
import type { Project, Teacher, SessionUser } from "@/lib/sheets/models";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

interface AdminProjectsManagerProps {
  initialProjects: Project[];
  teachers: Teacher[];
}

export function AdminProjectsManager({
  initialProjects,
  teachers,
}: AdminProjectsManagerProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [compareDetail, setCompareDetail] = useState<ProjectComparisonDetail | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "hidden">("all");
  const [supervisorFilter, setSupervisorFilter] = useState("all");
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setSessionUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const isSuperAdmin = !sessionUser || sessionUser.role === "SUPER_ADMIN";
  const canViewAll = isSuperAdmin || Boolean(sessionUser?.permissions?.can_view_all_projects);
  const canEdit = isSuperAdmin || Boolean(sessionUser?.permissions?.can_edit_projects);
  const canDelete = isSuperAdmin || Boolean(sessionUser?.permissions?.can_delete_projects);
  const canInquire = isSuperAdmin || Boolean(sessionUser?.permissions?.can_send_inquiries);
  const canEscalate = isSuperAdmin || Boolean(sessionUser?.permissions?.can_escalate_faculty);

  // Distinct supervisors for filter (including teachers directory and custom project supervisors)
  const allSupervisors = useMemo(() => {
    const set = new Set<string>();
    teachers.forEach((t) => set.add(t.name));
    projects.forEach((p) => {
      if (p.supervisor_name && p.supervisor_name.trim()) {
        set.add(p.supervisor_name.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [teachers, projects]);

  // Compute similarity for each project against the whole catalog
  const similarityMap = useMemo(() => {
    const map = new Map<string, SimilarityMatch>();
    for (const p of projects) {
      map.set(p.id, evaluateProjectSimilarity(p, projects));
    }
    return map;
  }, [projects]);

  // Edit Modal State
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Delete Confirmation State
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Inquire Student Modal State (Gmail)
  const [inquireTarget, setInquireTarget] = useState<{ project: Project; similarity: SimilarityMatch } | null>(null);
  const [inquireEmail, setInquireEmail] = useState("");
  const [inquireNotes, setInquireNotes] = useState("");
  const [isInquiring, setIsInquiring] = useState(false);
  const [inquireStatus, setInquireStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Escalate to Teacher Modal State
  const [escalateTarget, setEscalateTarget] = useState<{ project: Project; similarity: SimilarityMatch } | null>(null);
  const [escalateTeacherEmail, setEscalateTeacherEmail] = useState("");
  const [escalateTeacherName, setEscalateTeacherName] = useState("");
  const [escalateNotes, setEscalateNotes] = useState("");
  const [isEscalating, setIsEscalating] = useState(false);
  const [escalateStatus, setEscalateStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Bulk Actions State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const handleBulkStatus = async (status: "published" | "hidden") => {
    if (selectedIds.size === 0) return;
    setIsBulkUpdating(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await fetch("/api/admin/projects/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status }),
      });
      if (res.ok) {
        setProjects((prev) =>
          prev.map((p) => (selectedIds.has(p.id) ? { ...p, status } : p))
        );
        setSelectedIds(new Set());
      }
    } catch (err) {
      console.error("Bulk update failed:", err);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkExportCsv = () => {
    const selectedProjects = projects.filter((p) => selectedIds.has(p.id));
    if (selectedProjects.length === 0) return;

    const headers = [
      "Project ID",
      "Project Title",
      "Student Name",
      "Roll Number",
      "Batch Section",
      "Supervising Faculty",
      "Subject",
      "Status",
      "Similarity Flag",
      "Similarity Score (%)",
      "GitHub URL",
      "Live Demo URL",
    ];

    const escapeCsv = (val: string | number | undefined) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = selectedProjects.map((p) => {
      const sim = similarityMap.get(p.id);
      return [
        escapeCsv(p.id),
        escapeCsv(p.project_title),
        escapeCsv(p.student_name),
        escapeCsv(p.roll_number),
        escapeCsv(p.batch_section),
        escapeCsv(p.supervisor_name),
        escapeCsv(p.subject),
        escapeCsv(p.status),
        escapeCsv(sim?.flag || "original"),
        escapeCsv(sim?.score || 0),
        escapeCsv(p.github_url),
        escapeCsv(p.live_url),
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SPS-Faculty-Export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered List
  const filtered = projects.filter((p) => {
    // 1. Scoped access for teachers without 'can_view_all_projects'
    if (!canViewAll && sessionUser) {
      const isMySupervisor =
        p.supervisor_name.toLowerCase().includes(sessionUser.name.toLowerCase()) ||
        sessionUser.name.toLowerCase().includes(p.supervisor_name.toLowerCase());
      const isMySubject =
        sessionUser.assigned_subjects &&
        sessionUser.assigned_subjects.includes(p.subject);
      if (!isMySupervisor && !isMySubject) return false;
    }

    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (supervisorFilter !== "all" && p.supervisor_name !== supervisorFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.project_title.toLowerCase().includes(q) ||
        p.student_name.toLowerCase().includes(q) ||
        p.roll_number.toLowerCase().includes(q) ||
        p.tech_stack.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Toggle Published / Hidden status
  const handleToggleStatus = async (project: Project) => {
    const nextStatus = project.status === "published" ? "hidden" : "published";
    try {
      const res = await fetch("/api/admin/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: project.id, status: nextStatus }),
      });
      if (res.ok) {
        setProjects((prev) =>
          prev.map((p) => (p.id === project.id ? { ...p, status: nextStatus } : p))
        );
      }
    } catch {
      alert("Failed to update project status");
    }
  };

  // Open Inquiry Modal with automatic intelligent draft
  const handleOpenInquire = (project: Project, sim?: SimilarityMatch) => {
    const similarity = sim || similarityMap.get(project.id) || {
      score: 0,
      flag: "unique",
      reason: "Standard project inquiry",
    };
    setInquireTarget({ project, similarity });
    setInquireEmail(project.email || `${project.roll_number.toLowerCase().replace(/[^a-z0-9]/g, "")}@superior.edu.pk`);
    
    // Auto-draft intelligent context-aware message
    const autoDraft = similarity.exactUrlMatch || similarity.flag === "duplicate"
      ? `During our automated originality screening, your submitted GitHub repository was identified as an identical duplicate of the historical archive project "${similarity.matchedProject?.project_title || "Archived Work"}" (by ${similarity.matchedProject?.student_name || "Previous Student"}, Roll: ${similarity.matchedProject?.roll_number || "N/A"}). Please provide your written clarification and rationale regarding this duplicate submission within 48 hours.`
      : similarity.score >= 40
      ? `Our automated review system detected a ${similarity.score}% semantic and structural overlap with "${similarity.matchedProject?.project_title || "Archived Work"}". Please clarify whether this is an authorized continuation, and provide supervisory documentation if applicable.`
      : `Please provide formal technical documentation and supervisory verification regarding the original scope and individual contribution for this capstone project.`;

    setInquireNotes(autoDraft);
    setInquireStatus(null);
  };

  // Submit Inquiry via Gmail SMTP
  const handleSendInquiry = async () => {
    if (!inquireTarget) return;
    setIsInquiring(true);
    setInquireStatus(null);

    try {
      const res = await fetch("/api/admin/email/inquire-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentEmail: inquireEmail,
          studentName: inquireTarget.project.student_name,
          studentRollNumber: inquireTarget.project.roll_number,
          projectTitle: inquireTarget.project.project_title,
          submittedGithubUrl: inquireTarget.project.github_url,
          matchedProjectTitle: inquireTarget.similarity.matchedProject?.project_title,
          matchedRollNumber: inquireTarget.similarity.matchedProject?.roll_number,
          matchedGithubUrl: inquireTarget.similarity.matchedProject?.github_url,
          similarityScore: inquireTarget.similarity.score,
          customMessage: inquireNotes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setInquireStatus({
          type: "success",
          text: data.message || "Inquiry email successfully dispatched.",
        });
      } else {
        setInquireStatus({
          type: "error",
          text: data.error || "Failed to send email via SMTP.",
        });
      }
    } catch {
      setInquireStatus({ type: "error", text: "Network error sending email." });
    } finally {
      setIsInquiring(false);
    }
  };

  // Open Escalation Modal with automatic intelligent draft
  const handleOpenEscalate = (project: Project, sim?: SimilarityMatch) => {
    const similarity = sim || similarityMap.get(project.id) || {
      score: 100,
      flag: "duplicate",
      reason: "Disciplinary transfer",
    };
    setEscalateTarget({ project, similarity });

    // Lookup teacher's email from roster
    const matchedTeacher = teachers.find(
      (t) => t.name.toLowerCase() === (project.supervisor_name || "").toLowerCase()
    );
    const teacherEmail = matchedTeacher?.superior_email || "hod.cs@superior.edu.pk";

    setEscalateTeacherName(project.supervisor_name || "Supervising Faculty");
    setEscalateTeacherEmail(teacherEmail);

    // Auto-draft intelligent faculty escalation dossier notes
    const autoEscalateDraft = similarity.exactUrlMatch || similarity.flag === "duplicate"
      ? `Student ${project.student_name} (${project.roll_number}) submitted a repository identical to archived capstone "${similarity.matchedProject?.project_title || "Archived Work"}" (${similarity.matchedProject?.github_url || "Historical Repo"}). The project has been auto-hidden from the showcase. Forwarded for supervisory review and final departmental grading penalty.`
      : `Student ${project.student_name} (${project.roll_number}) submitted a project exhibiting ${similarity.score}% similarity with archived capstone "${similarity.matchedProject?.project_title || "Archived Work"}". The project has been hidden pending your supervisory evaluation and originality hearing.`;

    setEscalateNotes(autoEscalateDraft);
    setEscalateStatus(null);
  };

  // Open Side-by-Side Originality Comparison Modal
  const handleOpenCompare = (project: Project, sim?: SimilarityMatch) => {
    const similarity = sim || similarityMap.get(project.id);
    if (!similarity?.matchedProject) return;
    const detail = compareProjectsDetail(project, similarity.matchedProject);
    setCompareDetail(detail);
  };

  // Submit Escalation via Gmail SMTP
  const handleSendEscalation = async () => {
    if (!escalateTarget) return;
    setIsEscalating(true);
    setEscalateStatus(null);

    try {
      const res = await fetch("/api/admin/email/escalate-teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherEmail: escalateTeacherEmail,
          teacherName: escalateTeacherName,
          studentName: escalateTarget.project.student_name,
          studentRollNumber: escalateTarget.project.roll_number,
          projectTitle: escalateTarget.project.project_title,
          submittedGithubUrl: escalateTarget.project.github_url,
          matchedProjectTitle: escalateTarget.similarity.matchedProject?.project_title,
          matchedRollNumber: escalateTarget.similarity.matchedProject?.roll_number,
          matchedGithubUrl: escalateTarget.similarity.matchedProject?.github_url,
          similarityScore: escalateTarget.similarity.score,
          adminNotes: escalateNotes,
          projectId: escalateTarget.project.id,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEscalateStatus({
          type: "success",
          text: data.message || "Disciplinary dossier delivered to faculty. Project auto-hidden.",
        });
        // Auto-hide project on client
        setProjects((prev) =>
          prev.map((p) => (p.id === escalateTarget.project.id ? { ...p, status: "hidden" } : p))
        );
      } else {
        setEscalateStatus({
          type: "error",
          text: data.error || "Failed to escalate dossier.",
        });
      }
    } catch {
      setEscalateStatus({ type: "error", text: "Network error during escalation." });
    } finally {
      setIsEscalating(false);
    }
  };

  // Save Edit Changes
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const res = await fetch("/api/admin/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingProject),
      });

      const result = await res.json();
      if (!res.ok) {
        setSaveError(result.error || "Failed to save project.");
        setIsSaving(false);
        return;
      }

      setProjects((prev) =>
        prev.map((p) => (p.id === editingProject.id ? editingProject : p))
      );
      setIsSaving(false);
      setEditingProject(null);
    } catch {
      setSaveError("Network error while updating project.");
      setIsSaving(false);
    }
  };

  // Delete Project
  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/admin/projects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        setDeletingProjectId(null);
      } else {
        alert("Failed to delete project");
      }
    } catch {
      alert("Network error while deleting project");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Action Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-[#111827] p-4 sm:p-5 rounded-3xl border border-[#1f293d] shadow-xl">
        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, student, roll no, or tech stack..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-xl border border-[#1f293d] bg-[#0a0f1d] px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Statuses ({projects.length})</option>
            <option value="published">
              Published ({projects.filter((p) => p.status === "published").length})
            </option>
            <option value="hidden">
              Hidden ({projects.filter((p) => p.status === "hidden").length})
            </option>
          </select>

          {/* Supervisor Filter */}
          <select
            value={supervisorFilter}
            onChange={(e) => setSupervisorFilter(e.target.value)}
            className="rounded-xl border border-[#1f293d] bg-[#0a0f1d] px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none max-w-xs truncate"
          >
            <option value="all">All Supervisors ({allSupervisors.length})</option>
            {allSupervisors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Create Project Button */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/submit"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            <span>New Submission</span>
          </Link>
        </div>
      </div>

      {/* Scoped View Notice for Teachers */}
      {!canViewAll && sessionUser && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-xs font-mono text-indigo-300">
          <GraduationCap className="h-4 w-4 text-indigo-400 shrink-0" />
          <span>
            <strong>Scoped Faculty View</strong>: Showing capstone submissions supervised by <strong>{sessionUser.name}</strong> ({filtered.length} projects).
          </span>
        </div>
      )}

      {/* Projects Table */}
      <div className="rounded-3xl border border-[#1f293d] bg-[#111827] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#1f293d] bg-[#0a0f1d]/50 text-slate-400 font-mono uppercase text-[10px]">
              <tr>
                <th className="py-3.5 px-4 w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all visible projects"
                    checked={filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(filtered.map((p) => p.id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                    className="h-4 w-4 rounded border-[#1f293d] bg-[#0a0f1d] text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">Project</th>
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Roll No</th>
                <th className="py-3.5 px-4">Originality</th>
                <th className="py-3.5 px-4">Supervisor & Subject</th>
                <th className="py-3.5 px-4">Class</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f293d]/60 text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-mono">
                    No matching project records found.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const sim = similarityMap.get(p.id);

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-[#1a2333]/50 transition-colors ${
                        selectedIds.has(p.id) ? "bg-blue-600/10" : ""
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <td className="py-3.5 px-4 w-10">
                        <input
                          type="checkbox"
                          aria-label={`Select ${p.project_title}`}
                          checked={selectedIds.has(p.id)}
                          onChange={(e) => {
                            const next = new Set(selectedIds);
                            if (e.target.checked) {
                              next.add(p.id);
                            } else {
                              next.delete(p.id);
                            }
                            setSelectedIds(next);
                          }}
                          className="h-4 w-4 rounded border-[#1f293d] bg-[#0a0f1d] text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* Project Title & Link */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-white truncate text-xs sm:text-sm">{p.project_title}</p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                            {p.github_url && (
                              <a
                                href={p.github_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-blue-400 flex items-center gap-1"
                              >
                                <GithubIcon className="h-3 w-3" />
                                <span>Code</span>
                              </a>
                            )}
                            {p.live_url && (
                              <a
                                href={p.live_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-emerald-400 flex items-center gap-1 text-emerald-400/80"
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span>Live Demo</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Student Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          {p.student_avatar_url ? (
                            <img
                              src={p.student_avatar_url}
                              alt={p.student_name}
                              className="h-6 w-6 rounded-full border border-slate-700 object-cover"
                            />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-400">
                              <User className="h-3 w-3" />
                            </div>
                          )}
                          <span className="font-medium text-slate-200">{p.student_name}</span>
                        </div>
                      </td>

                      {/* Roll Number */}
                      <td className="py-3.5 px-4 font-mono text-slate-300">{p.roll_number}</td>

                      {/* Originality / Similarity Badge */}
                      <td className="py-3.5 px-4">
                        {sim && sim.flag === "duplicate" ? (
                          <button
                            type="button"
                            onClick={() => handleOpenCompare(p, sim)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[11px] font-mono font-bold text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 transition-all cursor-pointer"
                            title="Click for Side-by-Side Comparison"
                          >
                            <ShieldAlert className="h-3 w-3 shrink-0" />
                            <span>{sim.score}% Matched</span>
                          </button>
                        ) : sim && sim.flag === "warning" ? (
                          <button
                            type="button"
                            onClick={() => handleOpenCompare(p, sim)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-mono font-bold text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-all cursor-pointer"
                            title="Click for Side-by-Side Comparison"
                          >
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>{sim.score}% Similarity</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-mono font-semibold text-emerald-400 border border-emerald-500/20">
                            <ShieldCheck className="h-3 w-3" />
                            <span>Original</span>
                          </span>
                        )}
                      </td>

                      {/* Supervisor & Subject */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-medium text-slate-200">{p.supervisor_name}</p>
                          <p className="text-[11px] text-purple-400 font-mono">{p.subject}</p>
                        </div>
                      </td>

                      {/* Section */}
                      <td className="py-3.5 px-4 font-mono text-blue-400 font-semibold">{p.batch_section}</td>

                      {/* Status Toggle */}
                      <td className="py-3.5 px-4">
                        {canEdit ? (
                          <button
                            onClick={() => handleToggleStatus(p)}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase transition-all ${
                              p.status === "published"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                                : "bg-slate-700/50 text-slate-400 border border-slate-600 hover:bg-slate-700"
                            }`}
                          >
                            {p.status === "published" ? (
                              <>
                                <Eye className="h-3 w-3" /> Published
                              </>
                            ) : (
                              <>
                                <EyeOff className="h-3 w-3" /> Hidden
                              </>
                            )}
                          </button>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase ${
                              p.status === "published"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-slate-700/50 text-slate-400 border border-slate-600"
                            }`}
                          >
                            {p.status === "published" ? (
                              <>
                                <Eye className="h-3 w-3" /> Published
                              </>
                            ) : (
                              <>
                                <EyeOff className="h-3 w-3" /> Hidden
                              </>
                            )}
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Side-by-Side Comparison */}
                          {sim?.matchedProject && (
                            <button
                              onClick={() => handleOpenCompare(p, sim)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1e293b] text-purple-400 hover:bg-purple-600 hover:text-white transition-colors cursor-pointer"
                              title="Side-by-Side Codebase & Abstract Comparison"
                            >
                              <GitCompare className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Mail Student Inquiry */}
                          {canInquire && (
                            <button
                              onClick={() => handleOpenInquire(p, sim)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1e293b] text-blue-400 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
                              title="Send Plagiarism / Inquiry Notice (Gmail)"
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Escalate to Faculty */}
                          {canEscalate && (
                            <button
                              onClick={() => handleOpenEscalate(p, sim)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1e293b] text-amber-400 hover:bg-amber-600 hover:text-white transition-colors cursor-pointer"
                              title="Escalate Dossier to Faculty Supervisor"
                            >
                              <ShieldAlert className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Edit */}
                          {canEdit && (
                            <button
                              onClick={() => setEditingProject(p)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1e293b] text-slate-300 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
                              title="Edit Project"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Delete */}
                          {canDelete && (
                            <button
                              onClick={() => setDeletingProjectId(p.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1e293b] text-rose-400 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                              title="Delete Project"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Sticky Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-wrap items-center gap-3 rounded-2xl border border-blue-500/40 bg-[#0d1424]/95 px-5 py-3.5 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2 border-r border-[#1f293d] pr-3 text-xs font-mono">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-[11px]">
              {selectedIds.size}
            </span>
            <span className="text-slate-300 font-semibold">Selected</span>
          </div>

          {/* Bulk Publish */}
          {canEdit && (
            <button
              onClick={() => handleBulkStatus("published")}
              disabled={isBulkUpdating}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600/20 px-3 py-1.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isBulkUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
              <span>Bulk Publish</span>
            </button>
          )}

          {/* Bulk Hide */}
          {canEdit && (
            <button
              onClick={() => handleBulkStatus("hidden")}
              disabled={isBulkUpdating}
              className="flex items-center gap-1.5 rounded-xl bg-amber-600/20 px-3 py-1.5 text-xs font-semibold text-amber-400 border border-amber-500/30 hover:bg-amber-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isBulkUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
              <span>Bulk Hide</span>
            </button>
          )}

          {/* Bulk Export CSV */}
          <button
            onClick={handleBulkExportCsv}
            className="flex items-center gap-1.5 rounded-xl bg-[#1e293b] px-3 py-1.5 text-xs font-semibold text-slate-200 border border-slate-700 hover:bg-slate-700 transition-all cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-blue-400" />
            <span>Export CSV</span>
          </button>

          {/* Deselect All */}
          <button
            onClick={() => setSelectedIds(new Set())}
            className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
            <span>Clear</span>
          </button>
        </div>
      )}

      {/* 0. Side-by-Side Originality Comparison Modal */}
      {compareDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border border-purple-500/30 bg-[#111827] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#1f293d] bg-[#0a0f1d]/90 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                  <GitCompare className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-base font-bold text-white">
                      Side-by-Side Originality & Plagiarism Comparison
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold ${
                        compareDetail.flag === "duplicate"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {compareDetail.exactUrlMatch
                        ? "🔴 100% Duplicate Repository URL"
                        : `🟡 ${compareDetail.overallScore}% Similarity Overlap`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Comparing candidate submission against historical archive match
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCompareDetail(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-[#1e293b] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Audit Summary Banner */}
              <div className="rounded-2xl border border-[#1f293d] bg-[#0a0f1d] p-4 text-xs font-mono text-slate-300 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    Audit Diagnostics:
                  </span>
                  <span className="text-slate-300 font-semibold">{compareDetail.reason}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[#1f293d]">
                  <div className="bg-[#111827] rounded-xl p-2.5 border border-[#1f293d]/50">
                    <div className="text-[10px] text-slate-400 uppercase">Repo URL Match</div>
                    <div className={`font-bold text-xs ${compareDetail.exactUrlMatch ? "text-rose-400" : "text-emerald-400"}`}>
                      {compareDetail.exactUrlMatch ? "🔴 Exact Match" : "🟢 Distinct URL"}
                    </div>
                  </div>
                  <div className="bg-[#111827] rounded-xl p-2.5 border border-[#1f293d]/50">
                    <div className="text-[10px] text-slate-400 uppercase">Title Match</div>
                    <div className="font-bold text-xs text-amber-400">
                      {compareDetail.titleScore}% Similar
                    </div>
                  </div>
                  <div className="bg-[#111827] rounded-xl p-2.5 border border-[#1f293d]/50">
                    <div className="text-[10px] text-slate-400 uppercase">Shared Tech Tags</div>
                    <div className="font-bold text-xs text-blue-400">
                      {compareDetail.sharedTech.length} Technologies
                    </div>
                  </div>
                  <div className="bg-[#111827] rounded-xl p-2.5 border border-[#1f293d]/50">
                    <div className="text-[10px] text-slate-400 uppercase">Overall Overlap</div>
                    <div className="font-bold text-xs text-rose-400">
                      {compareDetail.overallScore}% Match
                    </div>
                  </div>
                </div>
              </div>

              {/* 2-Column Side-by-Side Comparison Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Column 1: Candidate Under Review */}
                <div className="rounded-2xl border border-blue-500/30 bg-[#0a0f1d] p-5 space-y-4 flex flex-col justify-between shadow-lg shadow-blue-500/5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-[#1f293d] pb-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[11px] font-mono font-bold text-blue-400 border border-blue-500/20">
                        Candidate Project (Under Review)
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {compareDetail.projectA.batch_section}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-white">
                        {compareDetail.projectA.project_title}
                      </h4>
                      <p className="text-xs text-slate-300 font-mono mt-0.5">
                        Author: <strong className="text-white">{compareDetail.projectA.student_name}</strong> ({compareDetail.projectA.roll_number})
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Supervisor: <span className="text-emerald-400">{compareDetail.projectA.supervisor_name}</span> · {compareDetail.projectA.subject}
                      </p>
                    </div>

                    {/* Repository link */}
                    <div className="rounded-xl border border-[#1f293d] bg-[#111827] p-3 space-y-1">
                      <div className="text-[10px] font-mono uppercase text-slate-400">GitHub Repository</div>
                      <a
                        href={compareDetail.projectA.github_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 break-all font-mono"
                      >
                        <GithubIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{compareDetail.projectA.github_url}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>

                    {/* Tech Stack */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono uppercase text-slate-400">Tech Stack</div>
                      <div className="flex flex-wrap gap-1.5">
                        {compareDetail.projectA.tech_stack?.split(",").map((tech, idx) => {
                          const clean = tech.trim();
                          const isShared = compareDetail.sharedTech.some((s) => s.toLowerCase() === clean.toLowerCase());
                          return (
                            <span
                              key={idx}
                              className={`rounded-md px-2 py-0.5 text-[11px] font-mono font-medium ${
                                isShared
                                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                  : "bg-blue-500/15 text-blue-300 border border-blue-500/20"
                              }`}
                            >
                              {clean} {isShared && "✓"}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Abstract */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono uppercase text-slate-400">Project Abstract / Description</div>
                      <p className="text-xs text-slate-300 bg-[#111827] rounded-xl p-3 border border-[#1f293d] leading-relaxed max-h-48 overflow-y-auto">
                        {compareDetail.projectA.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Column 2: Historical Archive Match */}
                <div className="rounded-2xl border border-rose-500/30 bg-[#0a0f1d] p-5 space-y-4 flex flex-col justify-between shadow-lg shadow-rose-500/5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-[#1f293d] pb-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-mono font-bold text-rose-400 border border-rose-500/20">
                        Historical Archive Match (Source)
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {compareDetail.projectB.batch_section}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-white">
                        {compareDetail.projectB.project_title}
                      </h4>
                      <p className="text-xs text-slate-300 font-mono mt-0.5">
                        Author: <strong className="text-white">{compareDetail.projectB.student_name}</strong> ({compareDetail.projectB.roll_number})
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Supervisor: <span className="text-emerald-400">{compareDetail.projectB.supervisor_name}</span> · {compareDetail.projectB.subject}
                      </p>
                    </div>

                    {/* Repository link */}
                    <div className="rounded-xl border border-[#1f293d] bg-[#111827] p-3 space-y-1">
                      <div className="text-[10px] font-mono uppercase text-slate-400">GitHub Repository</div>
                      <a
                        href={compareDetail.projectB.github_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 break-all font-mono"
                      >
                        <GithubIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{compareDetail.projectB.github_url}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>

                    {/* Tech Stack */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono uppercase text-slate-400">Tech Stack</div>
                      <div className="flex flex-wrap gap-1.5">
                        {compareDetail.projectB.tech_stack?.split(",").map((tech, idx) => {
                          const clean = tech.trim();
                          const isShared = compareDetail.sharedTech.some((s) => s.toLowerCase() === clean.toLowerCase());
                          return (
                            <span
                              key={idx}
                              className={`rounded-md px-2 py-0.5 text-[11px] font-mono font-medium ${
                                isShared
                                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                  : "bg-purple-500/15 text-purple-300 border border-purple-500/20"
                              }`}
                            >
                              {clean} {isShared && "✓"}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Abstract */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono uppercase text-slate-400">Project Abstract / Description</div>
                      <p className="text-xs text-slate-300 bg-[#111827] rounded-xl p-3 border border-[#1f293d] leading-relaxed max-h-48 overflow-y-auto">
                        {compareDetail.projectB.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with Direct Action Handlers */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#1f293d] bg-[#0a0f1d] shrink-0 flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setCompareDetail(null)}
                className="rounded-xl border border-[#1f293d] bg-[#1e293b] px-4 py-2 text-xs font-medium text-slate-300 hover:text-white"
              >
                Close Comparison
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const p = compareDetail.projectA;
                    setCompareDetail(null);
                    handleOpenInquire(p);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Inquire Student (Gmail)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const p = compareDetail.projectA;
                    setCompareDetail(null);
                    handleOpenEscalate(p);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-500 transition-colors shadow-lg shadow-amber-500/20"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Escalate to Faculty</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. Inquire Student via Gmail Modal */}
      {inquireTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl border border-blue-500/30 bg-[#111827] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#1f293d] bg-[#0a0f1d]/80">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-white">
                    Send Student Plagiarism / Inquiry Notice
                  </h3>
                  <p className="text-xs text-slate-400">Direct transmission via Gmail SMTP</p>
                </div>
              </div>
              <button
                onClick={() => setInquireTarget(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-[#1e293b] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {inquireStatus && (
                <div
                  className={`p-4 rounded-2xl border text-xs font-mono ${
                    inquireStatus.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                  }`}
                >
                  {inquireStatus.text}
                </div>
              )}

              {/* Evidence Snapshot */}
              <div className="rounded-2xl border border-[#1f293d] bg-[#0a0f1d] p-4 space-y-2 font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Student:</span>
                  <span className="text-white font-bold">{inquireTarget.project.student_name} ({inquireTarget.project.roll_number})</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Project:</span>
                  <span className="text-blue-400 truncate max-w-xs">{inquireTarget.project.project_title}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Repository:</span>
                  <span className="text-slate-300 truncate max-w-xs">{inquireTarget.project.github_url}</span>
                </div>
                {inquireTarget.similarity.matchedProject && (
                  <div className="pt-2 border-t border-[#1f293d] text-rose-400">
                    <p className="font-bold">⚠️ Matched Archive: {inquireTarget.similarity.matchedProject.project_title}</p>
                    <p className="text-slate-400 text-[11px]">Author: {inquireTarget.similarity.matchedProject.student_name} ({inquireTarget.similarity.matchedProject.roll_number}) · Score: {inquireTarget.similarity.score}%</p>
                  </div>
                )}
              </div>

              {/* Recipient Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium text-slate-300">
                  Student Gmail / University Email *
                </label>
                <input
                  type="email"
                  required
                  value={inquireEmail}
                  onChange={(e) => setInquireEmail(e.target.value)}
                  placeholder="student@superior.edu.pk or student@gmail.com"
                  className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] px-3.5 py-2.5 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Admin Note with 1-Click Quick Presets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-medium text-slate-300">
                    Custom Admin Instructions / Case Directives *
                  </label>
                  <span className="text-[10px] font-mono text-blue-400">⚡ Auto-drafted & ready to send</span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap pb-1">
                  <button
                    type="button"
                    onClick={() => {
                      const matched = inquireTarget.similarity.matchedProject;
                      setInquireNotes(
                        `During our automated originality screening, your submitted GitHub repository was identified as an identical duplicate of the historical archive project "${matched?.project_title || "Archived Work"}" (by ${matched?.student_name || "Previous Student"}, Roll: ${matched?.roll_number || "N/A"}). Please provide your written clarification and rationale regarding this duplicate submission within 48 hours.`
                      );
                    }}
                    className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-mono text-rose-300 hover:bg-rose-500/20 transition-colors"
                  >
                    🔴 Duplicate Repo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const matched = inquireTarget.similarity.matchedProject;
                      setInquireNotes(
                        `Our automated review system detected a ${inquireTarget.similarity.score || 60}% semantic and structural overlap with "${matched?.project_title || "Archived Work"}". Please clarify whether this is an authorized continuation, and provide supervisory documentation if applicable.`
                      );
                    }}
                    className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-mono text-amber-300 hover:bg-amber-500/20 transition-colors"
                  >
                    🟡 50%+ Overlap
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInquireNotes(
                        `Please provide formal written documentation and supervisor verification confirming your individual contribution and originality for this capstone submission within 48 hours.`
                      );
                    }}
                    className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[11px] font-mono text-blue-300 hover:bg-blue-500/20 transition-colors"
                  >
                    📑 Missing Authorization
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={inquireNotes}
                  onChange={(e) => setInquireNotes(e.target.value)}
                  placeholder="Auto-drafted notice..."
                  className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] p-3 text-xs text-white focus:border-blue-500 focus:outline-none leading-relaxed"
                />
              </div>

              <p className="text-slate-500 text-[11px] italic">
                The student will receive an official university template with a 48-hour response deadline and your reply-to address.
              </p>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-[#1f293d] bg-[#0a0f1d]">
              <button
                type="button"
                onClick={() => setInquireTarget(null)}
                className="rounded-xl border border-[#1f293d] bg-[#1e293b] px-4 py-2 text-xs font-medium text-slate-300 hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSendInquiry}
                disabled={isInquiring || !inquireEmail}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20"
              >
                {isInquiring ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Transmitting Notice...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Dispatch Notice (Gmail)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Escalate to Supervising Teacher Modal */}
      {escalateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl border border-amber-500/30 bg-[#111827] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#1f293d] bg-[#0a0f1d]/80">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-white">
                    Transfer & Escalate Dossier to Faculty Supervisor
                  </h3>
                  <p className="text-xs text-slate-400">Formal disciplinary transfer & auto-hide project</p>
                </div>
              </div>
              <button
                onClick={() => setEscalateTarget(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-[#1e293b] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {escalateStatus && (
                <div
                  className={`p-4 rounded-2xl border text-xs font-mono ${
                    escalateStatus.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                  }`}
                >
                  {escalateStatus.text}
                </div>
              )}

              {/* Dossier Summary */}
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2 font-mono text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Accused Student:</span>
                  <span className="text-white font-bold">{escalateTarget.project.student_name} ({escalateTarget.project.roll_number})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Supervising Teacher:</span>
                  <span className="text-emerald-400 font-bold">{escalateTeacherName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Plagiarism / Similarity Index:</span>
                  <span className="text-rose-400 font-bold">{escalateTarget.similarity.score}% Match</span>
                </div>
              </div>

              {/* Teacher Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium text-slate-300">
                  Supervising Teacher Email *
                </label>
                <input
                  type="email"
                  required
                  value={escalateTeacherEmail}
                  onChange={(e) => setEscalateTeacherEmail(e.target.value)}
                  placeholder="teacher@superior.edu.pk"
                  className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] px-3.5 py-2.5 text-xs font-mono text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Admin Findings with Quick Presets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-medium text-slate-300">
                    Admin Findings & Recommendation to Faculty *
                  </label>
                  <span className="text-[10px] font-mono text-amber-400">⚡ Auto-drafted & ready to send</span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap pb-1">
                  <button
                    type="button"
                    onClick={() => {
                      const matched = escalateTarget.similarity.matchedProject;
                      setEscalateNotes(
                        `Student ${escalateTarget.project.student_name} (${escalateTarget.project.roll_number}) submitted a repository identical to archived capstone "${matched?.project_title || "Archived Work"}" (${matched?.github_url || "Historical Repo"}). The project has been auto-hidden from the showcase. Forwarded for supervisory review and final departmental grading penalty.`
                      );
                    }}
                    className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-mono text-rose-300 hover:bg-rose-500/20 transition-colors"
                  >
                    🚨 Plagiarism Penalty
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const matched = escalateTarget.similarity.matchedProject;
                      setEscalateNotes(
                        `The project "${escalateTarget.project.project_title}" exhibits a ${escalateTarget.similarity.score}% similarity index with "${matched?.project_title || "Archived Work"}". Please conduct a viva/hearing with the student to verify original contribution and advise the department.`
                      );
                    }}
                    className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-mono text-amber-300 hover:bg-amber-500/20 transition-colors"
                  >
                    ⚠️ Request Hearing / Viva
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEscalateNotes(
                        `Student failed to provide a valid written clarification within the allotted 48-hour inquiry window. Forwarding complete repository evidence for departmental disciplinary action.`
                      );
                    }}
                    className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-[11px] font-mono text-purple-300 hover:bg-purple-500/20 transition-colors"
                  >
                    🛑 Unresponsive Student
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={escalateNotes}
                  onChange={(e) => setEscalateNotes(e.target.value)}
                  placeholder="Auto-drafted dossier notes..."
                  className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] p-3 text-xs text-white focus:border-amber-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-rose-300 text-[11px]">
                ⚠️ <strong>Automatic Action:</strong> Triggering this escalation will automatically hide the project from the public showcase and write a permanent record to the Super-Admin Audit Log.
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-[#1f293d] bg-[#0a0f1d]">
              <button
                type="button"
                onClick={() => setEscalateTarget(null)}
                className="rounded-xl border border-[#1f293d] bg-[#1e293b] px-4 py-2 text-xs font-medium text-slate-300 hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSendEscalation}
                disabled={isEscalating || !escalateTeacherEmail}
                className="flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20"
              >
                {isEscalating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Escalating Dossier...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Transfer to Teacher (Gmail)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Full Large & Responsive Edit Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-4xl lg:max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border border-[#1f293d] bg-[#111827] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#1f293d] bg-[#0a0f1d]/80 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <Edit2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-lg sm:text-xl font-bold text-white truncate">
                      Edit Capstone Project
                    </h3>
                    <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-mono font-bold text-blue-400 border border-blue-500/20">
                      {editingProject.roll_number || "NO ROLL"}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold border ${
                        editingProject.status === "published"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      {editingProject.status === "published" ? "Live in Showcase" : "Hidden / Draft"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    Modify student credentials, supervisor designation, URLs, and metadata.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingProject(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1e293b] text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
              {saveError && (
                <div className="flex items-center gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-medium text-rose-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              <form id="edit-project-form" onSubmit={handleSaveEdit} className="space-y-6">
                {/* 1. Student Credentials */}
                <div className="rounded-2xl border border-[#1f293d] bg-[#0a0f1d]/60 p-4 sm:p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#1f293d]/60 pb-3">
                    <User className="h-4 w-4 text-blue-400" />
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                      1. Student Identity & Contact
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-medium text-slate-300">
                        Student Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={editingProject.student_name}
                        onChange={(e) =>
                          setEditingProject({ ...editingProject, student_name: e.target.value })
                        }
                        className="w-full rounded-xl border border-[#1f293d] bg-[#111827] px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-medium text-slate-300">
                        Roll Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={editingProject.roll_number}
                        onChange={(e) =>
                          setEditingProject({ ...editingProject, roll_number: e.target.value })
                        }
                        className="w-full rounded-xl border border-[#1f293d] bg-[#111827] px-3.5 py-2.5 text-xs sm:text-sm text-white font-mono uppercase focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-medium text-slate-300">
                        Student Email
                      </label>
                      <input
                        type="email"
                        value={editingProject.email || ""}
                        onChange={(e) =>
                          setEditingProject({ ...editingProject, email: e.target.value })
                        }
                        placeholder="student@superior.edu.pk"
                        className="w-full rounded-xl border border-[#1f293d] bg-[#111827] px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Academic Enrollment & Supervisor */}
                <div className="rounded-2xl border border-[#1f293d] bg-[#0a0f1d]/60 p-4 sm:p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#1f293d]/60 pb-3">
                    <BookOpen className="h-4 w-4 text-purple-400" />
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                      2. Academic Enrollment & Supervisor
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-medium text-slate-300">
                        Degree & Section (e.g. BSAI-4A) *
                      </label>
                      <input
                        type="text"
                        required
                        value={editingProject.batch_section}
                        onChange={(e) =>
                          setEditingProject({ ...editingProject, batch_section: e.target.value })
                        }
                        className="w-full rounded-xl border border-[#1f293d] bg-[#111827] px-3.5 py-2.5 text-xs sm:text-sm text-white font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-medium text-slate-300">
                        Course Subject *
                      </label>
                      <input
                        type="text"
                        required
                        value={editingProject.subject}
                        onChange={(e) =>
                          setEditingProject({ ...editingProject, subject: e.target.value })
                        }
                        className="w-full rounded-xl border border-[#1f293d] bg-[#111827] px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                      <label className="text-xs font-mono font-medium text-slate-300">
                        Supervising Faculty *
                      </label>
                      <FacultyCombobox
                        teachers={teachers}
                        value={editingProject.supervisor_name}
                        onChange={(val) =>
                          setEditingProject({ ...editingProject, supervisor_name: val })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Project Architecture & Description */}
                <div className="rounded-2xl border border-[#1f293d] bg-[#0a0f1d]/60 p-4 sm:p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#1f293d]/60 pb-3">
                    <Layers className="h-4 w-4 text-emerald-400" />
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                      3. Project Architecture & Abstract
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-mono font-medium text-slate-300">
                        Project Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={editingProject.project_title}
                        onChange={(e) =>
                          setEditingProject({ ...editingProject, project_title: e.target.value })
                        }
                        className="w-full rounded-xl border border-[#1f293d] bg-[#111827] px-3.5 py-2.5 text-xs sm:text-sm text-white font-semibold focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-mono font-medium text-slate-300">
                        Tech Stack Tags (Comma separated) *
                      </label>
                      <input
                        type="text"
                        required
                        value={editingProject.tech_stack}
                        onChange={(e) =>
                          setEditingProject({ ...editingProject, tech_stack: e.target.value })
                        }
                        placeholder="e.g. Python, PyTorch, React, Next.js, FastApi"
                        className="w-full rounded-xl border border-[#1f293d] bg-[#111827] px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-mono font-medium text-slate-300">
                        Detailed Description & Abstract *
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={editingProject.description}
                        onChange={(e) =>
                          setEditingProject({ ...editingProject, description: e.target.value })
                        }
                        className="w-full rounded-xl border border-[#1f293d] bg-[#111827] p-3.5 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 leading-relaxed"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Deployment, Repositories & Publication */}
                <div className="rounded-2xl border border-[#1f293d] bg-[#0a0f1d]/60 p-4 sm:p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#1f293d]/60 pb-3">
                    <Globe className="h-4 w-4 text-amber-400" />
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                      4. External URLs & Publication Status
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                      <label className="text-xs font-mono font-medium text-slate-300">
                        GitHub Repository URL *
                      </label>
                      <input
                        type="url"
                        required
                        value={editingProject.github_url}
                        onChange={(e) =>
                          setEditingProject({ ...editingProject, github_url: e.target.value })
                        }
                        placeholder="https://github.com/owner/repo"
                        className="w-full rounded-xl border border-[#1f293d] bg-[#111827] px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-medium text-slate-300">
                        Live Demo URL
                      </label>
                      <input
                        type="url"
                        value={editingProject.live_url || ""}
                        onChange={(e) =>
                          setEditingProject({ ...editingProject, live_url: e.target.value })
                        }
                        placeholder="https://myproject.vercel.app"
                        className="w-full rounded-xl border border-[#1f293d] bg-[#111827] px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-medium text-slate-300">
                        Status *
                      </label>
                      <select
                        value={editingProject.status}
                        onChange={(e) =>
                          setEditingProject({
                            ...editingProject,
                            status: e.target.value as "published" | "hidden",
                          })
                        }
                        className="w-full rounded-xl border border-[#1f293d] bg-[#111827] px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                      >
                        <option value="published">Published (Visible)</option>
                        <option value="hidden">Hidden (Admin Only)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#1f293d] bg-[#0a0f1d]/90 shrink-0">
              <div className="text-[11px] font-mono text-slate-400">
                Last updated: {formatDate(editingProject.updated_at || editingProject.submitted_at)}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="rounded-xl border border-[#1f293d] bg-[#1e293b] px-4 py-2.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="edit-project-form"
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors shadow-lg shadow-blue-600/30"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Save Project Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Delete Confirmation Dialog */}
      {deletingProjectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-rose-500/30 bg-[#111827] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="font-display text-base font-bold text-white">
                Confirm Permanent Removal
              </h3>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to permanently delete this project? This will remove it from the showcase and database log.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingProjectId(null)}
                className="rounded-xl border border-[#1f293d] bg-[#1e293b] px-4 py-2 text-xs font-medium text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingProjectId)}
                disabled={isDeleting}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
