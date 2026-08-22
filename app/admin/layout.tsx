"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  LayoutDashboard,
  Layers,
  Users,
  MessageSquare,
  ShieldAlert,
  Activity,
  LogOut,
  ExternalLink,
  Sparkles,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // If on login page, render children directly without sidebar
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const navItems = [
    {
      label: "Overview",
      href: "/admin",
      icon: LayoutDashboard,
      id: "tour-nav-overview",
    },
    {
      label: "Projects & Submissions",
      href: "/admin/projects",
      icon: Layers,
      id: "tour-nav-projects",
    },
    {
      label: "Faculty Sync & Review",
      href: "/admin/teachers",
      icon: Users,
      id: "tour-nav-teachers",
    },
    {
      label: "Queries & Edit Requests",
      href: "/admin/queries",
      icon: MessageSquare,
      id: "tour-nav-queries",
    },
    {
      label: "Performance & Telemetry",
      href: "/admin/telemetry",
      icon: Activity,
      id: "tour-nav-telemetry",
    },
    {
      label: "Audit Trail",
      href: "/admin/audit",
      icon: ShieldAlert,
      id: "tour-nav-audit",
    },
  ];

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } catch {
      router.push("/admin/login");
    }
  };

  const triggerTour = () => {
    // Custom event to start Driver.js tour
    window.dispatchEvent(new CustomEvent("start-admin-tour"));
  };

  return (
    <div className="flex min-h-screen bg-[#0a0f1d] text-[#f8fafc]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#1f293d] bg-[#111827] flex flex-col justify-between p-4 hidden md:flex shrink-0">
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-md shadow-blue-500/25">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-white tracking-tight">
                Superior Admin
              </h2>
              <p className="text-[11px] font-mono text-blue-400">Single Super-Admin</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  id={item.id}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all",
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 font-semibold"
                      : "text-slate-400 hover:bg-[#1e293b] hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="space-y-2 border-t border-[#1f293d] pt-4">
          {/* Driver.js Tour Trigger */}
          <button
            onClick={triggerTour}
            className="flex w-full items-center gap-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-300 transition-colors hover:bg-blue-500/20"
          >
            <Compass className="h-4 w-4 text-blue-400" />
            <span>Interactive Tour</span>
          </button>

          {/* Public Showcase Link */}
          <Link
            href="/"
            className="flex items-center justify-between rounded-xl px-3 py-2 text-xs text-slate-400 transition-colors hover:bg-[#1e293b] hover:text-white"
          >
            <span>Public Showcase</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-rose-400 transition-colors hover:bg-rose-500/10"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden border-b border-[#1f293d] bg-[#111827] p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-500" />
            <span className="font-bold text-white text-sm">Superior Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/projects"
              className="px-2.5 py-1 text-xs bg-[#1e293b] rounded-lg text-slate-200"
            >
              Projects
            </Link>
            <Link
              href="/admin/teachers"
              className="px-2.5 py-1 text-xs bg-[#1e293b] rounded-lg text-slate-200"
            >
              Sync
            </Link>
            <Link
              href="/admin/queries"
              className="px-2.5 py-1 text-xs bg-[#1e293b] rounded-lg text-slate-200"
            >
              Inbox
            </Link>
            <button
              onClick={handleLogout}
              className="p-1.5 text-rose-400 hover:text-rose-300"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-8">
          {children}
        </main>
      </div>
    </div>
  );
}
