import Link from "next/link";
import { GraduationCap, ShieldAlert, BookOpen, Layers } from "lucide-react";
import { GithubIcon } from "@/components/Icons";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[#1f293d] bg-[#0a0f1d] py-12 text-[#94a3b8]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-500/20">
                <GraduationCap className="h-4 w-4" />
              </div>
              <span className="font-display font-bold text-white text-base tracking-tight">
                Superior Project Showcase
              </span>
            </div>
            <p className="text-xs text-[#94a3b8] leading-relaxed max-w-md">
              The central academic portfolio registry for student final year projects, research prototypes, and course capstones. Mentored by University faculty.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-mono font-medium text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Sync Engine Active
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Data store: Google Sheets API v4
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white">Registry Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-blue-400 transition-colors">
                  Explore Bento Showcase
                </Link>
              </li>
              <li>
                <Link href="/submit" className="hover:text-blue-400 transition-colors">
                  Submit Capstone Project
                </Link>
              </li>
              <li>
                <Link href="/help" className="hover:text-blue-400 transition-colors">
                  Request Correction / Edit
                </Link>
              </li>
              <li>
                <Link href="/admin/login" className="hover:text-blue-400 transition-colors">
                  Faculty Super-Admin Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Academic Governance */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white">Governance & Security</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5 text-slate-400">
                <ShieldAlert className="h-3.5 w-3.5 text-blue-400" />
                <span>Formula Injection Sanitized</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-400">
                <GithubIcon className="h-3.5 w-3.5 text-blue-400" />
                <span>SSRF Guarded GitHub Fetch</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-400">
                <Layers className="h-3.5 w-3.5 text-blue-400" />
                <span>Magic Byte Image Verification</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-400">
                <BookOpen className="h-3.5 w-3.5 text-blue-400" />
                <span>24h Faculty Diff Staging</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#1f293d] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© 2026 Superior Academic Tooling. Built for students & faculty excellence.</p>
          <div className="font-mono text-[10px] text-slate-400">
            SYSTEM VERSION 2.6.4 · APP ROUTER · SECURE REPOSITORY
          </div>
        </div>
      </div>
    </footer>
  );
}
