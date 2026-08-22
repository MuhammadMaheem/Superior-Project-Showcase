"use client";

import { Star, GitFork, GitBranch, Calendar, Code2 } from "lucide-react";
import type { LanguageStat } from "@/app/api/github/enrich/route";

interface GithubInsightsCardProps {
  owner: string;
  repo: string;
  stars?: number;
  forks?: number;
  defaultBranch?: string;
  lastCommitAt?: string;
  languageBreakdown?: LanguageStat[];
}

export function GithubInsightsCard({
  owner,
  repo,
  stars = 0,
  forks = 0,
  defaultBranch = "main",
  lastCommitAt,
  languageBreakdown = [],
}: GithubInsightsCardProps) {
  const formattedDate = lastCommitAt
    ? new Date(lastCommitAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="rounded-2xl border border-[#1f293d] bg-[#0d1424] p-4 space-y-3.5">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1f293d] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
            <Code2 className="h-4 w-4" />
          </div>
          <span className="font-mono text-xs font-semibold text-slate-200">
            {owner}/{repo}
          </span>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="flex items-center gap-1 rounded-md bg-[#162032] px-2 py-0.5 text-amber-400 border border-amber-500/20">
            <Star className="h-3 w-3 fill-amber-400" />
            <span>{stars}</span>
          </span>

          <span className="flex items-center gap-1 rounded-md bg-[#162032] px-2 py-0.5 text-slate-300 border border-slate-700">
            <GitFork className="h-3 w-3" />
            <span>{forks}</span>
          </span>

          <span className="hidden sm:flex items-center gap-1 rounded-md bg-[#162032] px-2 py-0.5 text-slate-400 border border-slate-700">
            <GitBranch className="h-3 w-3" />
            <span>{defaultBranch}</span>
          </span>
        </div>
      </div>

      {/* Language Breakdown Progress Bar */}
      {languageBreakdown.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Repository Languages</span>
            <span>{languageBreakdown.length} Detected</span>
          </div>

          {/* Segmented Multi-Color Bar */}
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-800">
            {languageBreakdown.map((lang, idx) => (
              <div
                key={idx}
                style={{
                  width: `${lang.percentage}%`,
                  backgroundColor: lang.color || "#6366f1",
                }}
                title={`${lang.language}: ${lang.percentage}%`}
                className="transition-all"
              />
            ))}
          </div>

          {/* Language Legend Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {languageBreakdown.map((lang, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: lang.color || "#6366f1" }}
                />
                <span className="font-semibold">{lang.language}</span>
                <span className="text-slate-500">{lang.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Timestamp */}
      {formattedDate && (
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 pt-1">
          <Calendar className="h-3 w-3" />
          <span>Latest repository update: {formattedDate}</span>
        </div>
      )}
    </div>
  );
}
