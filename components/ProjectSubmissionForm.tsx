"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Upload,
  X,
  ArrowRight,
  Loader2,
  Play,
} from "lucide-react";
import { GithubIcon } from "@/components/Icons";
import { FacultyCombobox } from "@/components/FacultyCombobox";
import { SectionSelector } from "@/components/SectionSelector";
import { parseSuperiorRollNumber } from "@/lib/utils/roll-number";
import { normalizeVideoEmbedUrl } from "@/lib/sheets/models";
import confetti from "canvas-confetti";
import type { Teacher, Project } from "@/lib/sheets/models";

interface ProjectSubmissionFormProps {
  teachers: Teacher[];
  subjects: string[];
}

export function ProjectSubmissionForm({ teachers, subjects }: ProjectSubmissionFormProps) {
  // Form State
  const [githubUrl, setGithubUrl] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentAvatarUrl, setStudentAvatarUrl] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [description, setDescription] = useState("");
  const [techStack, setTechStack] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [email, setEmail] = useState("");
  const [batchSection, setBatchSection] = useState("BSAI-4A");
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
  const parsedRoll = parseSuperiorRollNumber(rollNumber);

  // Step 1: GitHub URL enrichment trigger
  const handleGitHubEnrich = async (forceOverwrite = true) => {
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

      // Pre-fill fields
      if (data.student_name && (!studentName || forceOverwrite)) setStudentName(data.student_name);
      if (data.student_avatar_url && (!studentAvatarUrl || forceOverwrite)) setStudentAvatarUrl(data.student_avatar_url);
      if (data.project_title && (!projectTitle || forceOverwrite)) setProjectTitle(data.project_title);
      if (data.description && (!description || forceOverwrite)) setDescription(data.description);
      if (data.tech_stack && (!techStack || forceOverwrite)) setTechStack(data.tech_stack);

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
        video_url: videoUrl.trim(),
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
      setIsSubmitting(false);
      setSubmittedProject(result.project);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      setFormError("Network error. Please check your connection and try again.");
      setIsSubmitting(false);
    }
  };

  if (submittedProject) {
    return (
      <div className="rounded-3xl border border-emerald-500/30 bg-[#0d1f18] p-8 sm:p-12 text-center space-y-6 shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
            Project Successfully Published!
          </h2>
          <p className="text-sm text-slate-300 max-w-md mx-auto">
            Your capstone project <span className="font-semibold text-white font-mono">{submittedProject.project_title}</span> has been indexed on the Superior showcase platform.
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 transition-all"
          >
            Explore Public Showcase <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => {
              setSubmittedProject(null);
              setGithubUrl("");
              setProjectTitle("");
              setDescription("");
              setTechStack("");
              setLiveUrl("");
              setVideoUrl("");
              setScreenshots([]);
            }}
            className="w-full sm:w-auto rounded-xl border border-slate-700 bg-slate-800/60 px-6 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-all"
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

      {/* Error alert */}
      {formError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 sm:p-5 flex items-start gap-3 text-red-300 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
          <div>
            <p className="font-semibold text-red-200">Submission Error</p>
            <p className="text-xs sm:text-sm text-red-300/90 mt-0.5">{formError}</p>
          </div>
        </div>
      )}

      {/* 1. Step One: GitHub Repository Enrichment */}
      <div className="rounded-3xl border border-[#1f293d] bg-[#111827] p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
            1
          </span>
          <h3 className="font-display text-lg font-bold text-white">
            Repository Source & Auto-Enrichment
          </h3>
        </div>

        <p className="text-xs sm:text-sm text-slate-400">
          Paste your public GitHub repository URL. We will automatically extract your project title, bio, tech stack, and profile avatar.
        </p>

        <div className="space-y-2">
          <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <GithubIcon className="h-4 w-4" />
              </div>
              <input
                type="url"
                required
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleGitHubEnrich(true);
                  }
                }}
                placeholder="https://github.com/username/project-repository"
                className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
            <button
              type="button"
              onClick={() => handleGitHubEnrich(true)}
              disabled={isEnriching || !githubUrl.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600/20 border border-blue-500/30 px-4 py-2.5 text-xs font-medium text-blue-300 hover:bg-blue-600/30 hover:text-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shrink-0"
            >
              {isEnriching ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Auto-Enriching...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-blue-400" /> Auto-Fill Info
                </>
              )}
            </button>
          </div>

          {enrichmentWarning && (
            <p className="text-xs text-amber-400/90 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {enrichmentWarning}
            </p>
          )}
        </div>
      </div>

      {/* 2. Step Two: Student Identity & Faculty Mentor */}
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
          <div className="space-y-1.5 sm:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-medium text-slate-300">
                University Roll Number *
              </label>
              {parsedRoll.isValid && (
                <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                  ✓ Valid Superior Roll Number
                </span>
              )}
            </div>
            <input
              type="text"
              required
              value={rollNumber}
              onChange={(e) => {
                const val = e.target.value;
                setRollNumber(val);
                const parsed = parseSuperiorRollNumber(val);
                if (parsed.isValid && parsed.degree) {
                  setBatchSection(`${parsed.degree}-${parsed.suggestedSemester || "4A"}`);
                }
              }}
              placeholder="e.g. SU92-BSAIM-F24-042 or BSAI-F21-042"
              className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] px-4 py-2.5 text-xs sm:text-sm text-white font-mono uppercase focus:border-blue-500 focus:outline-none"
            />
            {parsedRoll.isValid && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-slate-400">
                <span className="rounded bg-blue-500/10 px-2 py-0.5 text-blue-400 border border-blue-500/20">
                  Campus: {parsedRoll.campus}
                </span>
                <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-indigo-400 border border-indigo-500/20">
                  Program: {parsedRoll.degree} ({parsedRoll.shift})
                </span>
                <span className="rounded bg-purple-500/10 px-2 py-0.5 text-purple-400 border border-purple-500/20">
                  Batch: {parsedRoll.batchYear}
                </span>
              </div>
            )}
          </div>

          {/* Dynamic Degree & Section Selector */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-mono font-medium text-slate-300">
              Degree, Semester & Section *
            </label>
            <SectionSelector
              value={batchSection}
              onChange={setBatchSection}
              inferredDegree={parsedRoll.degree}
              inferredBatch={parsedRoll.batchYear}
            />
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

          {/* Supervisor Dropdown */}
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

        {/* Links: Live Demo, Video / Google Drive Demo, LinkedIn, Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-medium text-slate-300">
              Live Demo URL (Optional)
            </label>
            <input
              type="url"
              value={liveUrl}
              onChange={(e) => setLiveUrl(e.target.value)}
              placeholder="https://myproject.vercel.app"
              className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="flex items-center justify-between text-xs font-mono font-medium text-slate-300">
              <span>Demo Video / Drive Link (Optional)</span>
              <span className="text-[10px] text-blue-400 font-normal">Drive / YouTube / Loom</span>
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://drive.google.com/file/d/... or YouTube link"
              className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
            />

            {/* Live Inline Video Player Preview */}
            {videoUrl && normalizeVideoEmbedUrl(videoUrl) && (
              <div className="mt-3 rounded-2xl border border-blue-500/30 bg-blue-500/5 p-3.5 space-y-2.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-semibold text-blue-400 flex items-center gap-1.5">
                    <Play className="h-3.5 w-3.5 fill-blue-400" />
                    <span>Live Video Player Preview</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    ✓ Embed Ready
                  </span>
                </div>

                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black border border-slate-800 shadow-md">
                  <iframe
                    src={normalizeVideoEmbedUrl(videoUrl)}
                    title="Live Demo Preview"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full border-0"
                  />
                </div>
              </div>
            )}
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
              className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
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
              className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
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
