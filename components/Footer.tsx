import Link from "next/link";
import { GraduationCap } from "lucide-react";

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
              The official academic repository and capstone portfolio registry for the Faculty of Computer Science & Information Technology at Superior University. Mentored by faculty supervisors.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-mono font-medium text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Academic Registry
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Superior University Lahore
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white">Showcase Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-blue-400 transition-colors">
                  Explore Bento Showcase
                </Link>
              </li>
              <li>
                <Link href="/submit" className="hover:text-blue-400 transition-colors">
                  Register Capstone Project
                </Link>
              </li>
              <li>
                <Link href="/help" className="hover:text-blue-400 transition-colors">
                  Student Help & Edit Desk
                </Link>
              </li>
              <li>
                <Link href="/admin/login" className="hover:text-blue-400 transition-colors">
                  Faculty & Admin Workbench
                </Link>
              </li>
            </ul>
          </div>

          {/* Degree Programs */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white">Programs & Degrees</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5 text-slate-300">
                <span className="font-mono text-blue-400">BSAI</span>
                <span>Artificial Intelligence</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-300">
                <span className="font-mono text-blue-400">BSCS</span>
                <span>Computer Science</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-300">
                <span className="font-mono text-blue-400">BSSE</span>
                <span>Software Engineering</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-300">
                <span className="font-mono text-blue-400">BSDS</span>
                <span>Data Science</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-300">
                <span className="font-mono text-blue-400">BSIT</span>
                <span>Information Technology</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#1f293d] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} Superior University · Faculty of Computer Science & IT. All rights reserved.</p>
          <div className="font-mono text-[10px] text-slate-400">
            OFFICIAL UNIVERSITY CAPSTONE SHOWCASE
          </div>
        </div>
      </div>
    </footer>
  );
}
