"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Sparkles, PlusCircle, Award, Code, Users, BookOpen, Layers } from "lucide-react";
import { BentoGrid } from "./BentoGrid";
import { FilterBar, type FilterState } from "./FilterBar";
import type { Project, Teacher } from "@/lib/sheets/models";

interface PublicShowcaseClientProps {
  initialProjects: Project[];
  teachers: Teacher[];
}

export function PublicShowcaseClient({ initialProjects, teachers }: PublicShowcaseClientProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    batch: "All Batches",
    rollNumber: "",
    techStack: "All Tech",
    supervisor: "All Supervisors",
  });

  // Extract distinct tech stack tags from all projects
  const availableTechStacks = useMemo(() => {
    const set = new Set<string>();
    for (const p of initialProjects) {
      if (p.tech_stack) {
        p.tech_stack.split(",").forEach((t) => {
          const trimmed = t.trim();
          if (trimmed && trimmed.toLowerCase() !== "unavailable") {
            set.add(trimmed);
          }
        });
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [initialProjects]);

  // Extract distinct batch tags from all projects
  const availableBatches = useMemo(() => {
    const set = new Set<string>();
    for (const p of initialProjects) {
      if (p.batch_section) {
        set.add(p.batch_section.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [initialProjects]);

  // Extract distinct supervisor names (combining faculty directory & custom self-written supervisors)
  const availableSupervisors = useMemo(() => {
    const set = new Set<string>();
    teachers.forEach((t) => set.add(t.name));
    initialProjects.forEach((p) => {
      if (p.supervisor_name && p.supervisor_name.trim()) {
        set.add(p.supervisor_name.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [teachers, initialProjects]);

  // Client-side instant multi-facet filter
  const filteredProjects = useMemo(() => {
    return initialProjects.filter((project) => {
      // 1. Search Query
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const matchesTitle = project.project_title.toLowerCase().includes(query);
        const matchesDesc = project.description.toLowerCase().includes(query);
        const matchesStudent = project.student_name.toLowerCase().includes(query);
        const matchesRoll = project.roll_number.toLowerCase().includes(query);
        const matchesTech = project.tech_stack.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesStudent && !matchesRoll && !matchesTech) {
          return false;
        }
      }

      // 2. Batch
      if (filters.batch && filters.batch !== "All Batches") {
        if (!project.batch_section.includes(filters.batch)) {
          return false;
        }
      }

      // 3. Roll Number
      if (filters.rollNumber) {
        if (!project.roll_number.toLowerCase().includes(filters.rollNumber.toLowerCase())) {
          return false;
        }
      }

      // 4. Tech Stack
      if (filters.techStack && filters.techStack !== "All Tech") {
        const tags = project.tech_stack.toLowerCase().split(",").map((t) => t.trim());
        if (!tags.includes(filters.techStack.toLowerCase())) {
          return false;
        }
      }

      // 5. Supervisor
      if (filters.supervisor && filters.supervisor !== "All Supervisors") {
        if (project.supervisor_name.toLowerCase() !== filters.supervisor.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [initialProjects, filters]);

  const handleResetFilters = () => {
    setFilters({
      search: "",
      batch: "All Batches",
      rollNumber: "",
      techStack: "All Tech",
      supervisor: "All Supervisors",
    });
  };

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <section className="relative pt-6 pb-4">
        <div className="absolute inset-0 bg-radial-glow -z-10 pointer-events-none" />

        <div className="space-y-6 text-center max-w-3xl mx-auto">
          {/* Tag Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-mono font-medium text-blue-300 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            <span>SUPERIOR CAPSTONE SHOWCASE · 2026 EDITION</span>
          </div>

          {/* Main Display Headline */}
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
            Engineering Excellence & Student Innovations
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Discover senior capstone projects, AI models, distributed architectures, and software engineering breakthroughs built by university students and guided by faculty mentors.
          </p>

          {/* Call to Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/submit"
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-blue-600/30 transition-all hover:scale-105 active:scale-95 hover:shadow-blue-500/40"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Submit Your Project</span>
            </Link>

            <a
              href="#explore-grid"
              className="flex items-center gap-2 rounded-2xl border border-[#1f293d] bg-[#111827]/80 px-6 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-[#1e293b] hover:text-white"
            >
              <Layers className="h-4 w-4 text-blue-400" />
              <span>Explore Projects Grid</span>
            </a>
          </div>

          {/* Metrics Counter Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-[#1f293d]/80 text-left">
            <div className="rounded-2xl border border-[#1f293d] bg-[#111827]/50 p-4">
              <div className="flex items-center gap-2 text-blue-400 mb-1">
                <Award className="h-4 w-4" />
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Projects</span>
              </div>
              <p className="font-display text-2xl font-bold text-white">{initialProjects.length}</p>
            </div>

            <div className="rounded-2xl border border-[#1f293d] bg-[#111827]/50 p-4">
              <div className="flex items-center gap-2 text-emerald-400 mb-1">
                <Users className="h-4 w-4" />
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Faculty</span>
              </div>
              <p className="font-display text-2xl font-bold text-white">{teachers.length}</p>
            </div>

            <div className="rounded-2xl border border-[#1f293d] bg-[#111827]/50 p-4">
              <div className="flex items-center gap-2 text-purple-400 mb-1">
                <Code className="h-4 w-4" />
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Tech Stacks</span>
              </div>
              <p className="font-display text-2xl font-bold text-white">{availableTechStacks.length}+</p>
            </div>

            <div className="rounded-2xl border border-[#1f293d] bg-[#111827]/50 p-4">
              <div className="flex items-center gap-2 text-amber-400 mb-1">
                <BookOpen className="h-4 w-4" />
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Batches</span>
              </div>
              <p className="font-display text-2xl font-bold text-white">Fall/Spring</p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Filter Bar */}
      <section id="explore-grid" className="space-y-6">
        <FilterBar
          filters={filters}
          onFilterChange={setFilters}
          onReset={handleResetFilters}
          availableTeachers={teachers}
          availableSupervisors={availableSupervisors}
          availableTechStacks={availableTechStacks}
          availableBatches={availableBatches}
          totalResults={filteredProjects.length}
        />

        {/* Asymmetric Bento Grid */}
        <BentoGrid projects={filteredProjects} />
      </section>
    </div>
  );
}
