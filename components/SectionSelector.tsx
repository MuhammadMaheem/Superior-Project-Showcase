"use client";

import { useState, useEffect } from "react";
import { Sparkles, GraduationCap, Check } from "lucide-react";

interface SectionSelectorProps {
  value: string;
  onChange: (val: string) => void;
  inferredDegree?: string;
  inferredBatch?: string;
}

const COMMON_DEGREES = ["BSAI", "BSCS", "BSSE", "BSDS", "BSIT", "MSCS"];
const POPULAR_CLASSES = ["4A", "4B", "3A", "3B", "1A", "1B", "2A", "2B", "5A", "6A", "7A", "8A"];

export function SectionSelector({
  value,
  onChange,
  inferredDegree,
  inferredBatch,
}: SectionSelectorProps) {
  const [selectedDegree, setSelectedDegree] = useState(inferredDegree || "BSAI");
  const [selectedClass, setSelectedClass] = useState("4A");
  const [customInput, setCustomInput] = useState("");
  const [isCustom, setIsCustom] = useState(false);

  // Sync when inferred degree changes from roll number
  useEffect(() => {
    if (inferredDegree && COMMON_DEGREES.includes(inferredDegree)) {
      setSelectedDegree(inferredDegree);
    }
  }, [inferredDegree]);

  // Update composite value whenever degree or class changes
  const handleSelectClass = (cls: string) => {
    setSelectedClass(cls);
    setIsCustom(false);
    const combined = `${selectedDegree}-${cls}`;
    onChange(combined);
  };

  const handleSelectDegree = (deg: string) => {
    setSelectedDegree(deg);
    const combined = isCustom && customInput ? customInput : `${deg}-${selectedClass}`;
    onChange(combined);
  };

  const handleCustomChange = (text: string) => {
    setCustomInput(text);
    setIsCustom(true);
    onChange(text);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-[#1f293d] bg-[#0a0f1d] p-4">
      {/* Top Header: Degree & Current Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
          <GraduationCap className="h-4 w-4 text-blue-400" />
          <span>Degree & Section:</span>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-1 text-xs font-mono font-bold text-blue-400 border border-blue-500/20">
          <span>Active Tag:</span>
          <span className="text-white underline decoration-blue-500">{value || `${selectedDegree}-${selectedClass}`}</span>
          {inferredBatch && <span className="text-slate-400 font-normal">({inferredBatch})</span>}
        </div>
      </div>

      {/* Degree Selector Buttons */}
      <div className="flex flex-wrap gap-1.5">
        {COMMON_DEGREES.map((deg) => (
          <button
            key={deg}
            type="button"
            onClick={() => handleSelectDegree(deg)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
              selectedDegree === deg
                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                : "bg-[#111827] text-slate-400 border border-[#1f293d] hover:text-white"
            }`}
          >
            {deg}
          </button>
        ))}
      </div>

      {/* Popular Class & Section Pills */}
      <div>
        <span className="text-[11px] font-mono text-slate-400 block mb-1.5">
          Select Semester & Section (e.g. 4A = 4th Sem, Sec A):
        </span>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
          {POPULAR_CLASSES.map((cls) => {
            const isSelected = !isCustom && selectedClass === cls;
            return (
              <button
                key={cls}
                type="button"
                onClick={() => handleSelectClass(cls)}
                className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-mono font-semibold transition-all ${
                  isSelected
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                    : "bg-[#111827] text-slate-300 border border-[#1f293d] hover:border-emerald-500/40 hover:text-emerald-400"
                }`}
              >
                {isSelected && <Check className="h-3 w-3" />}
                <span>{selectedDegree}-{cls}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Section Input */}
      <div className="pt-1">
        <label className="text-[11px] font-mono text-slate-400 block mb-1">
          Or write custom section / evening code:
        </label>
        <input
          type="text"
          value={customInput}
          onChange={(e) => handleCustomChange(e.target.value)}
          placeholder="e.g. BSAI-4A (Evening) or BSCS-Gold"
          className="w-full rounded-xl border border-[#1f293d] bg-[#111827] px-3.5 py-2 text-xs font-mono text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
        />
      </div>
    </div>
  );
}
