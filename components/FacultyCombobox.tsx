"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, Check, ChevronDown, UserCheck, Plus, Sparkles, X } from "lucide-react";
import type { Teacher } from "@/lib/sheets/models";

interface FacultyComboboxProps {
  teachers: Teacher[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

const PREFIX_OPTIONS = ["Dr.", "Prof.", "Engr.", "Mr.", "Ms.", "Mrs."];

export function FacultyCombobox({
  teachers,
  value,
  onChange,
  error,
}: FacultyComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customPrefix, setCustomPrefix] = useState("Dr.");
  const [customName, setCustomName] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Filter teachers by search query across name and designation
  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return teachers;
    const q = searchQuery.toLowerCase().trim();
    return teachers.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.designation && t.designation.toLowerCase().includes(q)) ||
        (t.subjects && t.subjects.toLowerCase().includes(q))
    );
  }, [teachers, searchQuery]);

  const handleSelectTeacher = (teacherName: string) => {
    onChange(teacherName);
    setIsCustomMode(false);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleApplyCustomName = () => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    const fullName = `${customPrefix} ${trimmed}`;
    onChange(fullName);
    setIsCustomMode(false);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleUseSearchAsCustom = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    // Check if user already typed prefix
    const hasPrefix = PREFIX_OPTIONS.some((p) =>
      trimmed.toLowerCase().startsWith(p.toLowerCase())
    );
    const fullName = hasPrefix ? trimmed : `${customPrefix} ${trimmed}`;
    onChange(fullName);
    setIsCustomMode(false);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div ref={containerRef} className="relative w-full space-y-2">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border bg-[#0a0f1d] px-4 py-2.5 text-xs sm:text-sm text-left transition-all ${
          error
            ? "border-rose-500/50 text-rose-300"
            : isOpen
            ? "border-blue-500 ring-2 ring-blue-500/20 text-white"
            : "border-[#1f293d] text-white hover:border-slate-600"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <UserCheck className="h-4 w-4 shrink-0 text-blue-400" />
          <span className="truncate">
            {value ? (
              <span className="font-medium text-white">{value}</span>
            ) : (
              <span className="text-slate-500">Select supervising faculty or enter custom name...</span>
            )}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
            isOpen ? "rotate-180 text-blue-400" : ""
          }`}
        />
      </button>

      {/* Selected Indicator Pill */}
      {value && (
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
          <span className="flex items-center gap-1.5 text-blue-300">
            <Check className="h-3 w-3 text-emerald-400" />
            <span>Assigned: <strong>{value}</strong></span>
          </span>
          <button
            type="button"
            onClick={() => onChange("Unassigned")}
            className="text-slate-500 hover:text-rose-400 transition-colors"
          >
            Clear / Unassign
          </button>
        </div>
      )}

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-[#1f293d] bg-[#111827] p-3 shadow-2xl backdrop-blur-2xl space-y-3 max-h-[420px] flex flex-col">
          {/* Search Header */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search faculty by name, title, or department..."
              className="w-full rounded-xl border border-[#1f293d] bg-[#0a0f1d] pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Preset Options: Unassigned & N/A */}
          <div className="flex items-center gap-2 pb-1 border-b border-[#1f293d]/80">
            <button
              type="button"
              onClick={() => handleSelectTeacher("Unassigned")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-medium transition-colors text-center border ${
                value === "Unassigned"
                  ? "bg-blue-600/30 border-blue-500 text-blue-200"
                  : "bg-[#0a0f1d] border-[#1f293d] text-slate-300 hover:bg-[#1e293b] hover:text-white"
              }`}
            >
              Unassigned
            </button>
            <button
              type="button"
              onClick={() => handleSelectTeacher("N/A")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-medium transition-colors text-center border ${
                value === "N/A"
                  ? "bg-blue-600/30 border-blue-500 text-blue-200"
                  : "bg-[#0a0f1d] border-[#1f293d] text-slate-300 hover:bg-[#1e293b] hover:text-white"
              }`}
            >
              N/A (Self-Directed)
            </button>
          </div>

          {/* Teacher List */}
          <div className="overflow-y-auto space-y-1 pr-1 flex-1 max-h-[220px]">
            {filteredTeachers.length > 0 ? (
              filteredTeachers.map((t) => {
                const isSelected = value === t.name;
                return (
                  <button
                    key={t.slug || t.name}
                    type="button"
                    onClick={() => handleSelectTeacher(t.name)}
                    className={`w-full flex items-center justify-between gap-2 rounded-xl p-2.5 text-left text-xs transition-colors ${
                      isSelected
                        ? "bg-blue-600/25 text-white border border-blue-500/40"
                        : "text-slate-300 hover:bg-[#1e293b] hover:text-white"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">{t.name}</p>
                      <p className="text-[11px] font-mono text-slate-400 truncate">
                        {t.designation || "Faculty Member"}
                        {t.subjects ? ` · ${t.subjects}` : ""}
                      </p>
                    </div>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-emerald-400" />}
                  </button>
                );
              })
            ) : (
              <div className="py-4 text-center space-y-2">
                <p className="text-xs text-slate-400">
                  No existing faculty found matching &ldquo;{searchQuery}&rdquo;.
                </p>
                {searchQuery.trim() && (
                  <button
                    type="button"
                    onClick={handleUseSearchAsCustom}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600/20 border border-blue-500/40 px-3 py-1.5 text-xs text-blue-300 hover:bg-blue-600/30"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                    <span>Use entered name: &ldquo;{customPrefix} {searchQuery}&rdquo;</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Custom Teacher Entry Section */}
          <div className="pt-2 border-t border-[#1f293d]/80">
            {!isCustomMode ? (
              <button
                type="button"
                onClick={() => {
                  setIsCustomMode(true);
                  if (searchQuery) setCustomName(searchQuery);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-blue-500/40 bg-blue-500/5 py-2 text-xs font-medium text-blue-300 hover:bg-blue-500/10 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Teacher not in list? Type name manually</span>
              </button>
            ) : (
              <div className="space-y-2 rounded-xl border border-blue-500/30 bg-[#0a0f1d] p-2.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-blue-300">
                  <span>Enter Custom Faculty Name</span>
                  <button
                    type="button"
                    onClick={() => setIsCustomMode(false)}
                    className="text-slate-500 hover:text-slate-300"
                  >
                    Cancel
                  </button>
                </div>
                <div className="flex gap-2">
                  <select
                    value={customPrefix}
                    onChange={(e) => setCustomPrefix(e.target.value)}
                    className="rounded-lg border border-[#1f293d] bg-[#111827] px-2 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                  >
                    {PREFIX_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Enter teacher's full name..."
                    className="flex-1 rounded-lg border border-[#1f293d] bg-[#111827] px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  disabled={!customName.trim()}
                  onClick={handleApplyCustomName}
                  className="w-full rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
                >
                  Set Custom Supervisor
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
