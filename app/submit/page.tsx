import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProjectSubmissionForm } from "@/components/ProjectSubmissionForm";
import { dataAdapter } from "@/lib/sheets/adapter";
import { Sparkles, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const revalidate = 0;

export default async function SubmitPage() {
  const teachers = await dataAdapter.getTeachers();

  // Extract unique subjects
  const subjectsSet = new Set<string>();
  for (const t of teachers) {
    if (t.subjects) {
      t.subjects.split(",").forEach((sub) => {
        const trimmed = sub.trim();
        if (trimmed) subjectsSet.add(trimmed);
      });
    }
  }
  const subjects = Array.from(subjectsSet).sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0f1d] text-[#f8fafc]">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Back Link & Header */}
        <div className="space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-blue-400 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Public Showcase</span>
          </Link>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-mono font-medium text-blue-300">
              <Sparkles className="h-3 w-3 text-blue-400" />
              <span>CAPSTONE PROJECT SUBMISSION PORTAL</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Register Your University Project
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Showcase your final year capstone, semester project, or research prototype to faculty, peers, and industry recruiters. Submissions are published immediately to the showcase.
            </p>
          </div>
        </div>

        {/* Submission Form */}
        <ProjectSubmissionForm teachers={teachers} subjects={subjects} />
      </main>

      <Footer />
    </div>
  );
}
