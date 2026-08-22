"use client";

import { useState } from "react";
import { ProjectCard } from "./ProjectCard";
import { ProjectModal } from "./ProjectModal";
import type { Project } from "@/lib/sheets/models";
import { FolderSearch, PlusCircle } from "lucide-react";
import Link from "next/link";

interface BentoGridProps {
  projects: Project[];
}

export function BentoGrid({ projects }: BentoGridProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);

    try {
      const payload = JSON.stringify({
        path: `/#project-${project.id}`,
        projectId: project.id,
        projectTitle: project.project_title,
        referrer: typeof document !== "undefined" ? document.referrer : "",
      });
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon("/api/analytics/track", payload);
      } else {
        fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        }).catch(() => {});
      }
    } catch {
      // Ignore tracking errors
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProject(null);
  };

  if (projects.length === 0) {
    return (
      <div className="flex min-h-[350px] flex-col items-center justify-center rounded-3xl border border-dashed border-[#1f293d] bg-[#111827]/40 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1e293b] text-slate-400 mb-4">
          <FolderSearch className="h-8 w-8 text-blue-400" />
        </div>
        <h3 className="font-display text-lg font-bold text-white mb-1">No Projects Found</h3>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6">
          No projects matched the current search filters. Try clearing your filters or submit a new capstone.
        </p>
        <Link
          href="/submit"
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Submit New Project</span>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onClick={() => handleOpenModal(project)}
          />
        ))}
      </div>

      {/* Project Detail Modal */}
      <ProjectModal
        project={selectedProject}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
}
