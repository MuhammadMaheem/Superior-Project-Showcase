"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  X,
  ExternalLink,
  Mail,
  UserCheck,
  Calendar,
  Hash,
  BookOpen,
  Edit3,
  Sparkles,
  Play,
  Layers,
  Film,
  QrCode,
} from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/Icons";
import { motion, AnimatePresence } from "framer-motion";
import { ImageSlideshow } from "./ImageSlideshow";
import { ProjectQrModal } from "./ProjectQrModal";
import { ImageLightbox } from "./ImageLightbox";
import { GithubInsightsCard } from "./GithubInsightsCard";
import type { LanguageStat } from "@/app/api/github/enrich/route";
import type { Project } from "@/lib/sheets/models";
import { normalizeVideoEmbedUrl } from "@/lib/sheets/models";
import { formatDate } from "@/lib/utils";

interface ProjectModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectModal({ project, isOpen, onClose }: ProjectModalProps) {
  const [activeMediaTab, setActiveMediaTab] = useState<"screenshots" | "video">("screenshots");
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // GitHub Live Insights State
  const [githubStats, setGithubStats] = useState<{
    stars?: number;
    forks?: number;
    defaultBranch?: string;
    lastCommitAt?: string;
    languageBreakdown?: LanguageStat[];
    owner?: string;
    repo?: string;
  } | null>(null);

  // Reset tab & fetch repo stats when project changes
  useEffect(() => {
    if (project?.video_url && !project.screenshot_1 && !project.screenshot_2) {
      setActiveMediaTab("video");
    } else {
      setActiveMediaTab("screenshots");
    }

    if (project?.github_url) {
      fetch("/api/github/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ github_url: project.github_url }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success) {
            setGithubStats({
              stars: data.stars,
              forks: data.forks,
              defaultBranch: data.default_branch,
              lastCommitAt: data.last_commit_at,
              languageBreakdown: data.language_breakdown,
              owner: data.owner,
              repo: data.repo,
            });
          }
        })
        .catch(() => setGithubStats(null));
    } else {
      setGithubStats(null);
    }
  }, [project]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!project) return null;

  const techTags = project.tech_stack
    ? project.tech_stack
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const screenshots = [
    project.screenshot_1,
    project.screenshot_2,
    project.screenshot_3,
    project.screenshot_4,
  ].filter(Boolean) as string[];

  const embedVideoUrl = normalizeVideoEmbedUrl(project.video_url);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[#1f293d] bg-[#111827] p-6 sm:p-8 shadow-2xl space-y-6"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              aria-label="Close project modal"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#1e293b] text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            {/* 1. Title at Top */}
            <div className="space-y-3 pr-10">
              <div className="flex items-center gap-2">
                <span className="rounded bg-blue-500/10 px-2.5 py-0.5 text-xs font-mono font-semibold text-blue-400 border border-blue-500/20">
                  {project.batch_section}
                </span>
                <span className="rounded bg-emerald-500/10 px-2.5 py-0.5 text-xs font-mono font-semibold text-emerald-400 border border-emerald-500/20">
                  Verified Capstone
                </span>
                {project.video_url && (
                  <span className="rounded bg-red-500/10 px-2.5 py-0.5 text-xs font-mono font-semibold text-red-400 border border-red-500/20 flex items-center gap-1">
                    <Play className="h-3 w-3 fill-current" /> Demo Video Available
                  </span>
                )}
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
                {project.project_title}
              </h2>
            </div>

            {/* 2. Tech-Stack Tags */}
            <div className="flex flex-wrap gap-2 pt-1">
              {techTags.map((tag, idx) => (
                <span
                  key={idx}
                  className="rounded-lg bg-[#1e293b] px-3 py-1 text-xs font-medium text-slate-200 border border-[#334155]"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* 3. Media Viewer: Screenshots vs Video Tab Switcher */}
            <div className="space-y-3 py-2">
              {project.video_url && screenshots.length > 0 && (
                <div className="flex items-center gap-2 border-b border-[#1f293d] pb-2">
                  <button
                    type="button"
                    onClick={() => setActiveMediaTab("screenshots")}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                      activeMediaTab === "screenshots"
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "bg-[#1e293b] text-slate-400 hover:text-white"
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>Screenshots ({screenshots.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveMediaTab("video")}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                      activeMediaTab === "video"
                        ? "bg-red-600 text-white shadow-md shadow-red-500/20"
                        : "bg-[#1e293b] text-slate-400 hover:text-white"
                    }`}
                  >
                    <Film className="h-3.5 w-3.5" />
                    <span>Watch Video Demo</span>
                  </button>
                </div>
              )}

              {/* View Content */}
              {activeMediaTab === "video" && embedVideoUrl ? (
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-[#1f293d] bg-black shadow-inner">
                  <iframe
                    src={embedVideoUrl}
                    title="Project Demo Video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="h-full w-full border-0"
                  />
                </div>
              ) : (
                <ImageSlideshow
                  images={screenshots}
                  title={project.project_title}
                  onOpenLightbox={(idx) => {
                    setLightboxIndex(idx);
                    setIsLightboxOpen(true);
                  }}
                />
              )}
            </div>

            {/* GitHub Live Repository Insights Card */}
            {githubStats && (
              <GithubInsightsCard
                owner={githubStats.owner || "superior-university"}
                repo={githubStats.repo || "capstone"}
                stars={githubStats.stars}
                forks={githubStats.forks}
                defaultBranch={githubStats.defaultBranch}
                lastCommitAt={githubStats.lastCommitAt}
                languageBreakdown={githubStats.languageBreakdown}
              />
            )}

            {/* 4. Description */}
            <div className="space-y-2 border-t border-[#1f293d] pt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                Project Architecture & Overview
              </h3>
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed whitespace-pre-line">
                {project.description}
              </p>
            </div>

            {/* Project Action Links */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {project.github_url && (
                <a
                  href={project.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-[#1e293b] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white border border-[#334155] transition-all hover:bg-slate-700 hover:border-slate-500"
                >
                  <GithubIcon className="h-4 w-4 text-slate-200" />
                  <span>GitHub Repository</span>
                </a>
              )}
              {project.live_url && (
                <a
                  href={project.live_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-500"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Launch Live Demo</span>
                </a>
              )}
              {/* Exhibition QR Code Placard */}
              <button
                type="button"
                onClick={() => setIsQrOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-purple-500/20 transition-all hover:from-purple-500 hover:to-indigo-500 cursor-pointer"
              >
                <QrCode className="h-4 w-4" />
                <span>Exhibition Stall QR</span>
              </button>
              {project.video_url && (
                <button
                  type="button"
                  onClick={() => setActiveMediaTab("video")}
                  className="flex items-center gap-2 rounded-xl bg-red-600/20 text-red-300 border border-red-500/30 px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all hover:bg-red-600/30 hover:text-white cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>Play Video Demo</span>
                </button>
              )}
              {project.linkedin_url && (
                <a
                  href={project.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-[#0077b5]/20 text-[#0077b5] px-4 py-2.5 text-xs sm:text-sm font-semibold border border-[#0077b5]/30 transition-all hover:bg-[#0077b5]/30"
                >
                  <LinkedinIcon className="h-4 w-4" />
                  <span>Student LinkedIn</span>
                </a>
              )}
              {project.email && (
                <a
                  href={`mailto:${project.email}`}
                  className="flex items-center gap-2 rounded-xl bg-[#1e293b] px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-300 border border-[#334155] transition-all hover:text-white"
                >
                  <Mail className="h-4 w-4" />
                  <span>Email Student</span>
                </a>
              )}

              {/* Request Edit Link */}
              <Link
                href={`/help?projectId=${project.id}`}
                onClick={onClose}
                className="ml-auto flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-400 transition-colors p-2"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Request Edit / Update</span>
              </Link>
            </div>

            {/* 5. Footer Academic Metadata (Supervisor, Roll Number, Batch, Subject) */}
            <div className="rounded-2xl border border-[#1f293d] bg-[#0a0f1d]/70 p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Student Info */}
              <div className="flex items-center gap-3">
                {project.student_avatar_url ? (
                  <div className="relative h-10 w-10 overflow-hidden rounded-full border border-blue-500/40">
                    <Image
                      src={project.student_avatar_url}
                      alt={project.student_name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 font-bold">
                    {project.student_name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-mono text-slate-400 uppercase">Author</p>
                  <p className="text-xs sm:text-sm font-semibold text-white">{project.student_name}</p>
                </div>
              </div>

              {/* Roll Number */}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1e293b] text-slate-300">
                  <Hash className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-[11px] font-mono text-slate-400 uppercase">Roll Number</p>
                  <p className="text-xs sm:text-sm font-mono font-medium text-white">{project.roll_number}</p>
                </div>
              </div>

              {/* Supervisor Name */}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1e293b] text-slate-300">
                  <UserCheck className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[11px] font-mono text-slate-400 uppercase">Supervising Faculty</p>
                  <p className="text-xs sm:text-sm font-medium text-emerald-400">{project.supervisor_name}</p>
                </div>
              </div>

              {/* Subject & Submission Date */}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1e293b] text-slate-300">
                  <BookOpen className="h-4 w-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-[11px] font-mono text-slate-400 uppercase">Course Subject</p>
                  <p className="text-xs sm:text-sm font-medium text-white">{project.subject}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Exhibition Stall QR Code Placard Modal */}
          <ProjectQrModal
            project={project}
            isOpen={isQrOpen}
            onClose={() => setIsQrOpen(false)}
          />

          {/* Fullscreen High-Res Screenshot Lightbox */}
          <ImageLightbox
            images={screenshots}
            currentIndex={lightboxIndex}
            isOpen={isLightboxOpen}
            onClose={() => setIsLightboxOpen(false)}
            onNavigate={(idx) => setLightboxIndex(idx)}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
