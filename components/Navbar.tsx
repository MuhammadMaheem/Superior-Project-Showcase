"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, PlusCircle, HelpCircle, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#1f293d] bg-[#0a0f1d]/85 backdrop-blur-xl transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="group flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 transition-transform group-hover:scale-105">
            <GraduationCap className="h-5 w-5 text-white" />
            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-[#0a0f1d]">
              <Sparkles className="h-2 w-2 text-white" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold tracking-tight text-white sm:text-lg">
                SUPERIOR
              </span>
              <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold tracking-wider text-blue-400 border border-blue-500/20">
                PORTFOLIO
              </span>
            </div>
            <p className="text-[11px] text-[#94a3b8] tracking-wide">University Capstone Registry</p>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {!isAdmin && (
            <>
              <Link
                href="/"
                className={cn(
                  "rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-colors",
                  pathname === "/"
                    ? "bg-[#1e293b] text-white"
                    : "text-[#94a3b8] hover:bg-[#1e293b]/60 hover:text-white"
                )}
              >
                Browse Projects
              </Link>
              <Link
                href="/help"
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-colors",
                  pathname === "/help"
                    ? "bg-[#1e293b] text-white"
                    : "text-[#94a3b8] hover:bg-[#1e293b]/60 hover:text-white"
                )}
              >
                <HelpCircle className="h-4 w-4 hidden sm:inline" />
                <span>Need Edit / Help</span>
              </Link>
              <Link
                href="/submit"
                className="ml-1 sm:ml-2 flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition-all hover:from-blue-500 hover:to-indigo-500 hover:scale-[1.02] active:scale-[0.98]"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Submit Project</span>
              </Link>
            </>
          )}

          <Link
            href="/admin"
            className={cn(
              "ml-1 sm:ml-3 flex items-center gap-1.5 rounded-lg border border-[#1f293d] px-3 py-2 text-xs sm:text-sm font-medium transition-colors",
              isAdmin
                ? "bg-blue-600 text-white border-blue-500"
                : "text-[#94a3b8] hover:border-slate-600 hover:text-white"
            )}
          >
            <ShieldCheck className="h-4 w-4 text-blue-400" />
            <span className="hidden md:inline">Faculty & Admin</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
