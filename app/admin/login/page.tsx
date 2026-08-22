"use client";

import { useState, Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Eye,
  EyeOff,
  GraduationCap,
  Crown,
} from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/admin";

  const [tab, setTab] = useState<"admin" | "teacher">("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [tab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (tab === "teacher" && (!email || !email.trim())) {
      setError("Please enter your registered university email.");
      return;
    }

    if (!password || !password.trim()) {
      setError("Please enter your password.");
      return;
    }

    setIsLoading(true);

    try {
      const payload =
        tab === "teacher"
          ? { mode: "teacher", email: email.trim().toLowerCase(), password: password.trim() }
          : { mode: "admin", password: password.trim() };

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Authentication failed. Please check credentials.");
        setIsLoading(false);
        return;
      }

      window.location.href = returnUrl;
    } catch {
      setError("A network error occurred during login. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6 rounded-3xl border border-[#1f293d] bg-[#111827] p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/25">
          <ShieldCheck className="h-7 w-7 text-white" />
        </div>
        <h1 className="font-display text-2xl font-extrabold text-white tracking-tight">
          Academic Portal Sign-In
        </h1>
        <p className="text-xs text-slate-400">
          Faculty of Computer Science & Information Technology
        </p>
      </div>

      {/* Role Tab Selector */}
      <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-[#0a0f1d] p-1.5 border border-[#1f293d]">
        <button
          type="button"
          onClick={() => {
            setTab("admin");
            setError(null);
          }}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
            tab === "admin"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Crown className="h-3.5 w-3.5" />
          <span>Super Admin</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTab("teacher");
            setError(null);
          }}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
            tab === "teacher"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <GraduationCap className="h-3.5 w-3.5" />
          <span>Faculty / Teacher</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        {/* Email Field (Only for Teachers) */}
        {tab === "teacher" && (
          <div className="space-y-1.5 animate-in fade-in duration-200">
            <label className="text-xs font-mono text-slate-300 flex justify-between items-center">
              <span>University Email</span>
              <span className="text-[10px] text-blue-400">Required</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. dr.ahmed@superior.edu.pk"
                className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        )}

        {/* Password Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-slate-300 flex justify-between items-center">
            <span>{tab === "admin" ? "Master Super-Admin Password" : "Password"}</span>
            <span className="text-[10px] text-blue-400">Required</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              ref={inputRef}
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={tab === "admin" ? "Enter super-admin password..." : "Enter your account password..."}
              className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] pl-10 pr-11 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] disabled:opacity-60 transition-all cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verifying Credentials...</span>
            </>
          ) : (
            <>
              <span>Sign In to Workbench</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="text-center pt-2 border-t border-[#1f293d]">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Public Showcase</span>
        </Link>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0f1d] px-4 py-12">
      <Suspense fallback={<div className="text-slate-400 text-xs font-mono">Loading portal...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
