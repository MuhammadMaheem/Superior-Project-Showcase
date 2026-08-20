"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Upload,
  X,
  ExternalLink,
  Mail,
  UserCheck,
  BookOpen,
  Hash,
  Layers,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/Icons";
import { FacultyCombobox } from "@/components/FacultyCombobox";
import confetti from "canvas-confetti";
import type { Teacher, Project } from "@/lib/sheets/models";

interface ProjectSubmissionFormProps {
  teachers: Teacher[];
  subjects: string[];
}

const BATCH_SECTIONS = [
  "Fall 2024 - BSAI-7A",
  "Fall 2024 - BSAI-8A",
  "Fall 2024 - BSSE-6A",
  "Fall 2024 - BSSE-6B",
  "Fall 2024 - BSSE-6C",
  "Fall 2024 - BSDS-6A",
  "Spring 2024 - BSSE-6A",
  "Spring 2024 - BSSE-6B",
  "Spring 2024 - BSAI-4A",
  "Spring 2025 - BSAI-4A",
  "Spring 2025 - BSDS-4A",
  "Fall 2025 - BSAI-1A",
  "Fall 2025 - BSSE-1A",
];

export function ProjectSubmissionForm({ teachers, subjects }: ProjectSubmissionFormProps) {
  // Form State
  const [githubUrl, setGithubUrl] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentAvatarUrl, setStudentAvatarUrl] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [description, setDescription] = useState("");
  const [techStack, setTechStack] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [email, setEmail] = useState("");
  const [batchSection, setBatchSection] = useState(BATCH_SECTIONS[0]);
  const [selectedSubject, setSelectedSubject] = useState(subjects[0] || "Software Engineering");
  const [selectedSupervisor, setSelectedSupervisor] = useState(teachers[0]?.name || "Unassigned");
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [honeypot, setHoneypot] = useState("");

  // Status & Feedback State
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentWarning, setEnrichmentWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedProject, setSubmittedProject] = useState<Project | null>(null);

  // Roll Number State
  const [rollNumber, setRollNumber] = useState("");

  // Step 1: GitHub URL enrichment trigger
  const handleGitHubEnrich = async () => {
    const trimmed = githubUrl.trim();
    if (!trimmed) return;

    setIsEnriching(true);
    setEnrichmentWarning(null);
    setFormError(null);

    try {
      const res = await fetch("/api/github/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ github_url: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setEnrichmentWarning(data.error || "Could not automatically fetch from GitHub.");
        return;
      }

      // Pre-fill fields without locking them (§4.1)
      if (data.student_name && !studentName) setStudentName(data.student_name);
      if (data.student_avatar_url && !studentAvatarUrl) setStudentAvatarUrl(data.student_avatar_url);
      if (data.project_title && !projectTitle) setProjectTitle(data.project_title);
      if (data.description && !description) setDescription(data.description);
      if (data.tech_stack && !techStack) setTechStack(data.tech_stack);

      if (data.warning) {
        setEnrichmentWarning(data.warning);
      }
    } catch {
      setEnrichmentWarning("Network error while reaching GitHub lookup. You can fill the fields manually.");
    } finally {
      setIsEnriching(false);
    }
  };

  // Handle image file selection & compression
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (screenshots.length + files.length > 4) {
      setFormError("You can upload a maximum of 4 screenshots.");
      return;
    }

    files.forEach((file) => {
      // Basic client-side check
      if (!file.type.startsWith("image/")) {
        setFormError("Only image files (PNG, JPEG, WebP) are allowed.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          // Client-side image resize helper before submission
          const img = document.createElement("img");
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const maxDimension = 600;
            let width = img.width;
            let height = img.height;

            if (width > height && width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0, width, height);

            const compressedBase64 = canvas.toDataURL("image/jpeg", 0.68);
            setScreenshots((prev) => [...prev.slice(0, 3), compressedBase64]);
          };
          img.src = result;
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeScreenshot = (index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        github_url: githubUrl.trim(),
        roll_number: rollNumber.trim().toUpperCase(),
        student_name: studentName.trim(),
        student_avatar_url: studentAvatarUrl.trim(),
        project_title: projectTitle.trim(),
        description: description.trim(),
        tech_stack: techStack.trim(),
        live_url: liveUrl.trim(),
        linkedin_url: linkedinUrl.trim(),
        email: email.trim(),
        batch_section: batchSection,
        subject: selectedSubject,
        supervisor_name: selectedSupervisor,
        screenshots,
        honeypot,
      };

      const res = await fetch("/api/projects/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        setFormError(result.error || "Failed to submit project. Please review your input.");
        setIsSubmitting(false);
        return;
      }

      // Success
      setSubmittedProject(result.project);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      setFormError("A network error occurred while submitting your project. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedProject) {
    return (
      <div className="mx-auto max-w-2xl text-center space-y-6 rounded-3xl border border-[#1f293d] bg-[#111827] p-8 sm:p-12 shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <span className="rounded bg-emerald-500/10 px-3 py-1 text-xs font-mono font-bold text-emerald-400 border border-emerald-500/20">
            PUBLISHED TO LIVE SHOWCASE
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
            Project Successfully Registered!
          </h2>
          <p className="text-sm text-slate-300">
            Congratulations <strong className="text-white">{submittedProject.student_name}</strong>! Your capstone project <strong className="text-blue-400">"{submittedProject.project_title}"</strong> is now live on the public showcase.
          </p>
        </div>

        <div className="rounded-2xl border border-[#1f293d] bg-[#0a0f1d] p-4 text-left text-xs font-mono space-y-1.5 text-slate-300">
          <p><span className="text-slate-500">Roll Number:</span> {submittedProject.roll_number}</p>
          <p><span className="text-slate-500">Supervisor:</span> {submittedProject.supervisor_name}</p>
          <p><span className="text-slate-500">Subject:</span> {submittedProject.subject}</p>
          <p><span className="text-slate-500">Batch:</span> {submittedProject.batch_section}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-all"
          >
            <span>View in Public Bento Grid</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            onClick={() => {
              setSubmittedProject(null);
              setGithubUrl("");
              setProjectTitle("");
              setDescription("");
              setTechStack("");
              setScreenshots([]);
            }}
            className="rounded-xl border border-[#1f293d] bg-[#1e293b] px-6 py-3 text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Submit Another Project
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Honeypot Spam Trap (Hidden) */}
      <div className="hidden" aria-hidden="true">
        <input
          type="text"
          name="website_url_hp"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {formError && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* 1. Step One: GitHub URL & Auto-Enrichment */}
      <div className="rounded-3xl border border-blue-500/30 bg-[#111827] p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              1
            </span>
            <h3 className="font-display text-lg font-bold text-white">
              GitHub Repository & Auto-Enrichment
            </h3>
          </div>
          <span className="text-xs font-mono text-blue-400">Required Step</span>
        </div>

        <p className="text-xs text-slate-400">
          Enter your public GitHub repository URL. We will automatically fetch your project details, tech stack, and profile avatar to pre-fill the form.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <GithubIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="url"
              required
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              onBlur={handleGitHubEnrich}
              placeholder="https://github.com/username/project-repo"
              className="w-full rounded-2xl border border-[#1f293d] bg-[#0a0f1d] pl-10 pr-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <button
            type="button"
            onClick={handleGitHubEnrich}
            disabled={isEnriching || !githubUrl}
            className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-xs sm:text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-500 disabled:opacity-50 transition-all"
          >
            {isEnriching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Enriching...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Auto-Enrich</span>
              </>
            )}
          </button>
        </div>

        {enrichmentWarning && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
            {enrichmentWarning}
          </div>
        )}
      </div>

      {/* 2. Step Two: Student Identification & Academic Context */}
      <div className="rounded-3xl border border-[#1f293d] bg-[#111827] p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
            2
          </span>
          <h3 className="font-display text-lg font-bold text-white">
            Student Identity & Academic Mentorship
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Student Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-medium text-slate-300">
              Student Full Name *
            </label>
            <input
              type="text"
              required
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="e.g. Muhammad Ali"
              className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] px-4 py-2.5 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Roll Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-medium text-slate-300">
              University Roll Number *
            </label>
            <input
              type="text"
              required
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              placeholder="e.g. BSAI-F21-042"
              className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] px-4 py-2.5 text-xs sm:text-sm text-white font-mono uppercase focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Batch & Section */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-medium text-slate-300">
              Batch & Section *
            </label>
            <select
              value={batchSection}
              onChange={(e) => setBatchSection(e.target.value)}
              className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] px-4 py-2.5 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              {BATCH_SECTIONS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-medium text-slate-300">
              Course Subject *
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] px-4 py-2.5 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              {subjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          {/* Supervisor Dropdown (Searchable, All Faculty, Custom Name & Unassigned Support) */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="flex items-center justify-between text-xs font-mono font-medium text-slate-300">
              <span>Supervising Faculty *</span>
              <span className="text-[11px] text-blue-400 font-normal">
                {teachers.length} faculty members available
              </span>
            </label>
            <FacultyCombobox
              teachers={teachers}
              value={selectedSupervisor}
              onChange={setSelectedSupervisor}
            />
          </div>
        </div>
      </div>

      {/* 3. Step Three: Project Details & Tech Stack */}
      <div className="rounded-3xl border border-[#1f293d] bg-[#111827] p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
            3
          </span>
          <h3 className="font-display text-lg font-bold text-white">
            Project Details & Architecture
          </h3>
        </div>

        {/* Project Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono font-medium text-slate-300">
            Project Title *
          </label>
          <input
            type="text"
            required
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            placeholder="e.g. NeuralVision: Edge Defect Detection"
            className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] px-4 py-2.5 text-xs sm:text-sm text-white font-medium focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono font-medium text-slate-300">
            Detailed Project Description & Abstract *
          </label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the problem, engineering solution, key algorithms, and implementation..."
            className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] p-4 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-none leading-relaxed"
          />
        </div>

        {/* Tech Stack Chips */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono font-medium text-slate-300">
            Technologies & Frameworks (Comma separated) *
          </label>
          <input
            type="text"
            required
            value={techStack}
            onChange={(e) => setTechStack(e.target.value)}
            placeholder="e.g. Python, PyTorch, React, Next.js, Docker, PostgreSQL"
            className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] px-4 py-2.5 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Links: Live Demo, LinkedIn, Email */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-medium text-slate-300">
              Live Demo URL (Optional)
            </label>
            <input
              type="url"
              value={liveUrl}
              onChange={(e) => setLiveUrl(e.target.value)}
              placeholder="https://myproject.vercel.app"
              className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono font-medium text-slate-300">
              LinkedIn Profile (Optional)
            </label>
            <input
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/username"
              className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono font-medium text-slate-300">
              Student Email (Optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@superior.edu.pk"
              className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 4. Step Four: Screenshots (Max 4, Capped & Compressed) */}
      <div className="rounded-3xl border border-[#1f293d] bg-[#111827] p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              4
            </span>
            <h3 className="font-display text-lg font-bold text-white">
              Project Screenshots (Max 4)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">{screenshots.length} / 4 Uploaded</span>
        </div>

        <p className="text-xs text-slate-400">
          Upload UI screenshots or architecture diagrams. Images will be optimized and compressed for instant loading.
        </p>

        {/* Image Preview Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {screenshots.map((src, index) => (
            <div
              key={index}
              className="group relative aspect-video overflow-hidden rounded-2xl border border-[#1f293d] bg-black"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Upload ${index + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeScreenshot(index)}
                className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {screenshots.length < 4 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-video flex-col items-center justify-center rounded-2xl border border-dashed border-[#334155] bg-[#0a0f1d] text-slate-400 transition-colors hover:border-blue-500 hover:text-white"
            >
              <Upload className="h-6 w-6 mb-1 text-blue-400" />
              <span className="text-[11px] font-medium">Add Screenshot</span>
            </button>
          )}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/png, image/jpeg, image/webp"
          multiple
          className="hidden"
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Sanitizing & Publishing Project...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5" />
              <span>Submit & Publish Capstone</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
