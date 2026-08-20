"use client";

import { useState } from "react";
import { Search, Filter, RotateCcw, UserCheck, Calendar, Hash, Code2 } from "lucide-react";
import type { Teacher } from "@/lib/sheets/models";

export interface FilterState {
  search: string;
  batch: string;
  rollNumber: string;
  techStack: string;
  supervisor: string;
}

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
  availableTeachers: Teacher[];
  availableSupervisors?: string[];
  availableTechStacks: string[];
  availableBatches?: string[];
  totalResults: number;
}

export function FilterBar({
  filters,
  onFilterChange,
  onReset,
  availableTeachers,
  availableSupervisors,
  availableTechStacks,
  availableBatches = [],
  totalResults,
}: FilterBarProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const hasActiveFilters =
    Boolean(filters.search) ||
    (Boolean(filters.batch) && filters.batch !== "All Batches") ||
    Boolean(filters.rollNumber) ||
    (Boolean(filters.techStack) && filters.techStack !== "All Tech") ||
    (Boolean(filters.supervisor) && filters.supervisor !== "All Supervisors");

  const update = (key: keyof FilterState, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  return (
    <div className="w-full space-y-4 rounded-3xl border border-[#1f293d] bg-[#111827]/70 p-5 shadow-xl backdrop-blur-xl">
      {/* Top Search & Quick Controls */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative w-full flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            placeholder="Search projects by title, keywords, student name, or roll no..."
            className="w-full rounded-2xl border border-[#1f293d] bg-[#0a0f1d]/80 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          {filters.search && (
            <button
              onClick={() => update("search", "")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Toggle & Reset Button */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <button
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="flex items-center gap-2 rounded-2xl border border-[#1f293d] bg-[#1e293b] px-4 py-2.5 text-xs font-medium text-white transition-colors hover:bg-slate-700"
          >
            <Filter className="h-4 w-4 text-blue-400" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold">
                !
              </span>
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/20"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}

          <div className="text-xs font-mono text-slate-400 pl-2">
            <span className="font-semibold text-white">{totalResults}</span> {totalResults === 1 ? "project" : "projects"}
          </div>
        </div>
      </div>

      {/* Combinable Filter Grid (Open by default on larger screens or toggled) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[#1f293d]/60">
        {/* 1. Batch / Year */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-slate-400 uppercase">
            <Calendar className="h-3.5 w-3.5 text-blue-400" />
            <span>Batch / Year</span>
          </label>
          <select
            value={filters.batch}
            onChange={(e) => update("batch", e.target.value)}
            className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="All Batches">All Batches / Years</option>
            {availableBatches.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Roll Number */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-slate-400 uppercase">
            <Hash className="h-3.5 w-3.5 text-purple-400" />
            <span>Roll Number</span>
          </label>
          <input
            type="text"
            value={filters.rollNumber}
            onChange={(e) => update("rollNumber", e.target.value)}
            placeholder="e.g. BSAI-F21"
            className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* 3. Tech Stack */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-slate-400 uppercase">
            <Code2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>Tech Stack</span>
          </label>
          <select
            value={filters.techStack}
            onChange={(e) => update("techStack", e.target.value)}
            className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="All Tech">All Technologies</option>
            {availableTechStacks.map((tech) => (
              <option key={tech} value={tech}>
                {tech}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Supervisor */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-slate-400 uppercase">
            <UserCheck className="h-3.5 w-3.5 text-amber-400" />
            <span>Supervising Faculty</span>
          </label>
          <select
            value={filters.supervisor}
            onChange={(e) => update("supervisor", e.target.value)}
            className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="All Supervisors">All Supervisors</option>
            {(availableSupervisors && availableSupervisors.length > 0
              ? availableSupervisors
              : availableTeachers.map((t) => t.name)
            ).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
