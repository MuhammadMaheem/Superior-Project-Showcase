"use client";

import Image from "next/image";
import { ArrowUpRight, Code, Terminal, Layers, Play } from "lucide-react";
import { GithubIcon } from "@/components/Icons";
import type { Project } from "@/lib/sheets/models";

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const techTags = project.tech_stack
    ? project.tech_stack
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const firstScreenshot =
    project.screenshot_1 ||
    project.screenshot_2 ||
    project.screenshot_3 ||
    project.screenshot_4;

  return (
    <div
      onClick={onClick}
      className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-[#1f293d] bg-[#111827]/90 p-5 sm:p-6 shadow-xl transition-all duration-300 hover:cursor-pointer hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1.5"
    >
      {/* Subtle Top-Right Ambient Glow */}
      <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-blue-500/10 blur-3xl transition-opacity group-hover:opacity-100 opacity-30 pointer-events-none" />

      <div className="space-y-3.5">
        {/* Student Author Header Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {project.student_avatar_url ? (
              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-blue-500/30 ring-2 ring-blue-500/10">
                <Image
                  src={project.student_avatar_url}
                  alt={project.student_name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-md shadow-blue-500/25">
                {project.student_name.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <h4 className="text-xs font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                {project.student_name}
              </h4>
              <p className="text-[10px] font-mono text-slate-400 truncate">
                {project.roll_number || "Student"}
              </p>
            </div>
          </div>

          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1e293b] text-slate-400 transition-all group-hover:bg-blue-600 group-hover:text-white group-hover:rotate-45 shadow-sm">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Screenshot Image Preview (Uniform 16:10 aspect ratio) */}
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-[#1f293d] bg-[#0a0f1d] shadow-inner">
          {firstScreenshot ? (
            firstScreenshot.startsWith("data:") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={firstScreenshot}
                alt={project.project_title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <Image
                src={firstScreenshot}
                alt={project.project_title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                unoptimized
              />
            )
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#0a0f1d] to-[#161f36] p-4 text-center">
              <Layers className="h-8 w-8 text-blue-500/40 mb-2" />
              <span className="text-[11px] font-mono text-slate-500">Capstone Showcase</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-transparent to-transparent opacity-60 pointer-events-none" />
          
          {/* Video Indicator Pill */}
          {project.video_url && (
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full bg-red-600/90 px-2 py-0.5 text-[9px] font-mono font-semibold text-white shadow-md shadow-red-950/50 backdrop-blur-md">
              <Play className="h-2.5 w-2.5 fill-current" /> Video
            </div>
          )}

          {/* Batch Badge Overlay */}
          <div className="absolute bottom-2.5 left-2.5 rounded-full bg-[#111827]/90 px-2.5 py-0.5 text-[10px] font-mono font-medium text-blue-300 border border-blue-500/30 backdrop-blur-md">
            {project.batch_section}
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5 pt-0.5">
          <h3 className="font-display text-base font-bold text-white tracking-tight leading-snug line-clamp-2 transition-colors group-hover:text-blue-300">
            {project.project_title}
          </h3>

          {/* Supervisor & Subject Meta Row */}
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <span className="text-emerald-400 font-medium truncate max-w-[170px]" title={project.supervisor_name}>
              {project.supervisor_name}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-purple-300 truncate" title={project.subject}>
              {project.subject}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
            {project.description}
          </p>
        </div>
      </div>

      {/* Footer: Tech Stack Chips (Supervisor explicitly omitted on card per §4.2 spec) */}
      <div className="mt-4 pt-3.5 border-t border-[#1f293d]/80 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5 min-w-0">
          {techTags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="rounded-md bg-[#1e293b]/90 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-300 border border-slate-700/60 truncate max-w-[110px]"
            >
              {tag}
            </span>
          ))}
          {techTags.length > 3 && (
            <span className="rounded-md bg-[#1e293b]/50 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
              +{techTags.length - 3}
            </span>
          )}
        </div>

        {project.github_url && (
          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 group-hover:text-blue-400 transition-colors shrink-0">
            <GithubIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Code</span>
          </div>
        )}
      </div>
    </div>
  );
}
