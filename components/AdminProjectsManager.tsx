"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
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
  RefreshCw,
  PlusCircle,
  User,
  BookOpen,
  Layers,
  Globe,
  FileText,
  Sparkles,
  Shield,
  Tag,
  Link2,
} from "lucide-react";
import { GithubIcon } from "@/components/Icons";
import { FacultyCombobox } from "@/components/FacultyCombobox";
import type { Project, Teacher } from "@/lib/sheets/models";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

const BATCH_SECTIONS = [
  "Fall 2024 - BSAI-7A",
  "Fall 2024 - BSAI-7B",
  "Fall 2024 - BSSE-7A",
  "Fall 2024 - BSSE-7B",
  "Fall 2024 - BSCS-7A",
  "Fall 2024 - BSCS-7B",
  "Fall 2024 - BSDS-7A",
  "Spring 2024 - BSAI-8A",
  "Spring 2024 - BSSE-8A",
  "Spring 2024 - BSCS-8A",
  "Spring 2024 - BSDS-8A",
  "Fall 2023 - BSAI-5A",
  "Fall 2023 - BSSE-5A",
  "Fall 2023 - BSCS-5A",
];

interface AdminProjectsManagerProps {
  initialProjects: Project[];
  teachers: Teacher[];
}

export function AdminProjectsManager({
  initialProjects,
  teachers,
}: AdminProjectsManagerProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "hidden">("all");
  const [supervisorFilter, setSupervisorFilter] = useState("all");

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

  // Edit Modal State
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Delete Confirmation State
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered List
  const filtered = projects.filter((p) => {
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
    } catch (err) {
      console.error("Status toggle failed:", err);
    }
  };

  // Save Project Edits
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const res = await fetch("/api/admin/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingProject),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "Failed to update project");
        setIsSaving(false);
        return;
      }

      setProjects((prev) =>
        prev.map((p) => (p.id === editingProject.id ? data.project : p))
      );
      setEditingProject(null);
    } catch {
      setSaveError("Network error while saving changes");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Project
  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/projects?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        setDeletingProjectId(null);
      }
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects, student, roll no..."
            className="w-full rounded-2xl border border-[#1f293d] bg-[#111827] pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-xl border border-[#1f293d] bg-[#111827] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published Only</option>
            <option value="hidden">Hidden Only</option>
          </select>

          <select
            value={supervisorFilter}
            onChange={(e) => setSupervisorFilter(e.target.value)}
            className="rounded-xl border border-[#1f293d] bg-[#111827] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Faculty Supervisors</option>
            {allSupervisors.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <Link
            href="/submit"
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>New Submission</span>
          </Link>
        </div>
      </div>

      {/* Projects Table */}
      <div className="rounded-3xl border border-[#1f293d] bg-[#111827] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#1f293d] bg-[#0a0f1d]/50 text-slate-400 font-mono uppercase text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Project</th>
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Roll No</th>
                <th className="py-3.5 px-4">Supervisor & Subject</th>
                <th className="py-3.5 px-4">Batch</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f293d]/60 text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-mono">
                    No matching project records found.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-[#1e293b]/40 transition-colors">
                    {/* Project Title & Links */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="space-y-1">
                        <p className="font-semibold text-white truncate">{p.project_title}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          {p.github_url && (
                            <a
                              href={p.github_url}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:text-blue-400 flex items-center gap-0.5"
                            >
                              <GithubIcon className="h-3 w-3" />
                              <span>GitHub</span>
                            </a>
                          )}
                          {p.live_url && (
                            <a
                              href={p.live_url}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:text-emerald-400 flex items-center gap-0.5"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>Demo</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Student Name */}
                    <td className="py-3.5 px-4 font-medium text-white">{p.student_name}</td>

                    {/* Roll No */}
                    <td className="py-3.5 px-4 font-mono text-slate-400">{p.roll_number}</td>

                    {/* Supervisor & Subject */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <p className="text-emerald-400 font-medium">{p.supervisor_name}</p>
                        <p className="text-[10px] text-slate-400">{p.subject}</p>
                      </div>
                    </td>

                    {/* Batch */}
                    <td className="py-3.5 px-4 font-mono text-slate-400">{p.batch_section}</td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(p)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold transition-all hover:scale-105 ${
                          p.status === "published"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
                        }`}
                      >
                        {p.status === "published" ? (
                          <>
                            <Eye className="h-3 w-3" />
                            <span>Published</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3" />
                            <span>Hidden</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditingProject(p)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1e293b] text-slate-300 hover:bg-blue-600 hover:text-white transition-colors"
                          title="Edit Project"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingProjectId(p.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1e293b] text-rose-400 hover:bg-rose-600 hover:text-white transition-colors"
                          title="Delete Project"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Large & Responsive Edit Modal */}
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
                      {editingProject.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    Modifying record for <span className="text-slate-200 font-medium">{editingProject.student_name}</span> &bull; {editingProject.project_title}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditingProject(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1e293b] text-slate-400 hover:bg-slate-700 hover:text-white transition-colors ml-4"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
              {saveError && (
                <div className="flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs sm:text-sm text-rose-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              <form id="edit-project-form" onSubmit={handleSaveEdit} className="space-y-6">
                {/* 1. Student Profile & Credentials */}
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

                {/* 2. Academic & Faculty Supervision */}
                <div className="rounded-2xl border border-[#1f293d] bg-[#0a0f1d]/60 p-4 sm:p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#1f293d]/60 pb-3">
                    <BookOpen className="h-4 w-4 text-purple-400" />
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                      2. Academic & Faculty Supervision
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-medium text-slate-300">
                        Batch & Section *
                      </label>
                      <input
                        type="text"
                        required
                        list="batch-options"
                        value={editingProject.batch_section}
                        onChange={(e) =>
                          setEditingProject({ ...editingProject, batch_section: e.target.value })
                        }
                        placeholder="e.g. Fall 2024 - BSAI-7A"
                        className="w-full rounded-xl border border-[#1f293d] bg-[#111827] px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                      />
                      <datalist id="batch-options">
                        {BATCH_SECTIONS.map((b) => (
                          <option key={b} value={b} />
                        ))}
                      </datalist>
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
                        placeholder="e.g. Generative AI"
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

      {/* Delete Confirmation Dialog */}
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
