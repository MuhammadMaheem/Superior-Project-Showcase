"use client";

import { useState, useEffect } from "react";
import { GraduationCap, Sparkles, Layers, BookOpen, Check } from "lucide-react";

interface SectionSelectorProps {
  value: string;
  onChange: (val: string) => void;
  inferredDegree?: string;
  inferredBatch?: string;
}

const COMMON_DEGREES = ["BSAI", "BSCS", "BSSE", "BSDS", "BSIT", "MSCS"];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const SECTIONS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)); // A to Z

export function SectionSelector({
  value,
  onChange,
  inferredDegree,
  inferredBatch,
}: SectionSelectorProps) {
  const [selectedDegree, setSelectedDegree] = useState(inferredDegree || "BSAI");
  const [selectedSemester, setSelectedSemester] = useState(4);
  const [selectedSection, setSelectedSection] = useState("A");
  const [customInput, setCustomInput] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  // Sync state from value when provided
  useEffect(() => {
    if (value && value.includes("-")) {
      const parts = value.split("-");
      const deg = parts[0] || "BSAI";
      const semSec = parts[1] || "4A";
      const semMatch = semSec.match(/^(\d)/);
      const secMatch = semSec.match(/([A-Za-z])$/);

      if (deg && COMMON_DEGREES.includes(deg)) {
        setSelectedDegree(deg);
      }
      if (semMatch) {
        setSelectedSemester(Number(semMatch[1]));
      }
      if (secMatch) {
        setSelectedSection(secMatch[1].toUpperCase());
      }
    }
  }, [value]);

  // Sync when inferred degree arrives from smart roll number
  useEffect(() => {
    if (inferredDegree && COMMON_DEGREES.includes(inferredDegree)) {
      setSelectedDegree(inferredDegree);
      if (!showCustom) {
        onChange(`${inferredDegree}-${selectedSemester}${selectedSection}`);
      }
    }
  }, [inferredDegree]);

  // Compute live generated tag
  const activeTag = showCustom && customInput ? customInput : `${selectedDegree}-${selectedSemester}${selectedSection}`;

  const handleDegreeChange = (deg: string) => {
    setSelectedDegree(deg);
    if (!showCustom) {
      onChange(`${deg}-${selectedSemester}${selectedSection}`);
    }
  };

  const handleSemesterChange = (sem: number) => {
    setSelectedSemester(sem);
    setShowCustom(false);
    onChange(`${selectedDegree}-${sem}${selectedSection}`);
  };

  const handleSectionChange = (sec: string) => {
    setSelectedSection(sec);
    setShowCustom(false);
    onChange(`${selectedDegree}-${selectedSemester}${sec}`);
  };

  const handleCustomChange = (text: string) => {
    setCustomInput(text);
    setShowCustom(true);
    onChange(text);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-[#1f293d] bg-[#0a0f1d] p-4 sm:p-5 shadow-xl">
      {/* Top Header: Title & Live Active Tag Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1f293d]/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <GraduationCap className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
              Degree, Semester & Section
            </h4>
            <p className="text-[11px] text-slate-400">Select Degree, Semester (1-8), and Section (A-Z)</p>
          </div>
        </div>

        {/* Live Tag Banner */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-3.5 py-1.5 text-xs font-mono font-bold text-white border border-blue-500/40 shadow-lg shadow-blue-500/10">
            <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
            <span className="text-slate-400 text-[11px]">Live Tag:</span>
            <span className="text-emerald-400 text-sm tracking-wide font-extrabold">{activeTag}</span>
            {inferredBatch && (
              <span className="text-slate-400 text-[10px] font-normal hidden sm:inline">
                ({inferredBatch})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 1. Degree Program Selector */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-300 flex items-center justify-between">
          <span>1. Select Degree Program</span>
          <span className="text-[10px] text-blue-400 font-normal">Auto-detected from Roll No</span>
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {COMMON_DEGREES.map((deg) => {
            const isSelected = selectedDegree === deg && !showCustom;
            return (
              <button
                key={deg}
                type="button"
                onClick={() => handleDegreeChange(deg)}
                className={`py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 ${
                  isSelected
                    ? "bg-blue-600 text-white border border-blue-400 shadow-md shadow-blue-600/30 scale-[1.02]"
                    : "bg-[#111827] text-slate-300 border border-[#1f293d] hover:border-blue-500/50 hover:text-white"
                }`}
              >
                {isSelected && <Check className="h-3 w-3 text-white" />}
                <span>{deg}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Two Dropdowns: Semester (1-8) & Section (A-Z) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        {/* Dropdown 1: Semester */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-purple-400" />
            <span>2. Semester (1 – 8) *</span>
          </label>
          <div className="relative">
            <select
              value={selectedSemester}
              onChange={(e) => handleSemesterChange(Number(e.target.value))}
              className="w-full appearance-none rounded-xl border border-[#1f293d] bg-[#111827] px-4 py-2.5 text-xs font-mono font-semibold text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 cursor-pointer"
            >
              {SEMESTERS.map((sem) => (
                <option key={sem} value={sem} className="bg-[#111827] text-white py-1">
                  Semester {sem} {sem === 1 ? "(1st Year · Intake)" : sem === 4 ? "(Mid Program)" : sem === 8 ? "(Final Year · Capstone)" : ""}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 font-mono text-xs">
              ▼
            </div>
          </div>
        </div>

        {/* Dropdown 2: Section (A-Z) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
            <span>3. Class Section (A – Z) *</span>
          </label>
          <div className="relative">
            <select
              value={selectedSection}
              onChange={(e) => handleSectionChange(e.target.value)}
              className="w-full appearance-none rounded-xl border border-[#1f293d] bg-[#111827] px-4 py-2.5 text-xs font-mono font-semibold text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 cursor-pointer"
            >
              {SECTIONS.map((sec) => (
                <option key={sec} value={sec} className="bg-[#111827] text-white py-1">
                  Section {sec} (e.g. {selectedDegree}-{selectedSemester}{sec})
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 font-mono text-xs">
              ▼
            </div>
          </div>
        </div>
      </div>

      {/* 3. Helper Note / Custom Section Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#1f293d]/50 text-[11px] font-mono">
        <span className="text-slate-400">
          Generated Tag: <strong className="text-emerald-400">{activeTag}</strong>
        </span>
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className="text-blue-400 hover:text-blue-300 underline cursor-pointer"
        >
          {showCustom ? "Use standard Semester & Section dropdowns" : "Need custom Evening/Batch code?"}
        </button>
      </div>

      {/* Custom Input Field (If requested) */}
      {showCustom && (
        <div className="space-y-1.5 pt-1 animate-in fade-in duration-200">
          <label className="text-[11px] font-mono text-amber-300">
            Write Custom Section Code:
          </label>
          <input
            type="text"
            value={customInput}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="e.g. BSAI-4A (Evening) or BSCS-Gold"
            className="w-full rounded-xl border border-amber-500/40 bg-[#111827] px-3.5 py-2 text-xs font-mono text-white placeholder:text-slate-600 focus:border-amber-500 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
