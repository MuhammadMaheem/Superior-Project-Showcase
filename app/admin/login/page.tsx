"use client";

import { useState, Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Lock, ArrowRight, AlertCircle, Loader2, ArrowLeft, Eye, EyeOff, Sparkles } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/admin";

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const performLogin = async (pwdToSubmit: string) => {
    if (!pwdToSubmit || !pwdToSubmit.trim()) {
      setError("Please enter the super-admin master password.");
      inputRef.current?.focus();
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwdToSubmit.trim() }),
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    performLogin(password);
  };

  const handleQuickFill = () => {
    const devPass = "SuperiorAdmin2026!";
    setPassword(devPass);
    performLogin(devPass);
  };

  return (
    <div className="w-full max-w-md space-y-8 rounded-3xl border border-[#1f293d] bg-[#111827] p-8 shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="space-y-3 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/25">
          <ShieldCheck className="h-7 w-7 text-white" />
        </div>
        <h1 className="font-display text-2xl font-extrabold text-white tracking-tight">
          Faculty Super-Admin Portal
        </h1>
        <p className="text-xs text-slate-400">
          Authenticated access for university project curation, teacher sync approval, and query resolution.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-mono text-slate-300 flex justify-between items-center">
            <span>Master Admin Password</span>
            <span className="text-[11px] text-blue-400">Required</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              ref={inputRef}
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password (e.g. SuperiorAdmin2026!)..."
              className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] pl-10 pr-11 py-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] disabled:opacity-60 transition-all cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verifying Credentials...</span>
            </>
          ) : (
            <>
              <span>Enter Administration Workbench</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {/* Quick Fill One-Click Button */}
      <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-blue-300">Default Password:</span>
          <code className="text-xs font-bold text-white bg-blue-900/40 px-2 py-0.5 rounded border border-blue-500/30">
            SuperiorAdmin2026!
          </code>
        </div>
        <button
          type="button"
          onClick={handleQuickFill}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-xs font-medium text-blue-200 transition-colors cursor-pointer"
        >
          <Sparkles className="h-3.5 w-3.5 text-blue-400" />
          <span>Auto-Fill Password & Sign In</span>
        </button>
      </div>

      <div className="text-center pt-2">
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
