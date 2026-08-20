import { Suspense } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { QueryForm } from "@/components/QueryForm";
import { dataAdapter } from "@/lib/sheets/adapter";
import { HelpCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const revalidate = 0;

export default async function HelpPage() {
  const projects = await dataAdapter.getProjects({ publishedOnly: false });

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0f1d] text-[#f8fafc]">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 py-8 sm:py-12 space-y-8">
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
              <HelpCircle className="h-3 w-3 text-blue-400" />
              <span>PROJECT CORRECTIONS & STUDENT DESK</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Request Project Edit or Submit Query
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
              Need to update your live demo URL, adjust the supervisor name, or correct a title typo on your submitted project? Submit your request directly to the academic administrator.
            </p>
          </div>
        </div>

        <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading query form...</div>}>
          <QueryForm projects={projects} />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
