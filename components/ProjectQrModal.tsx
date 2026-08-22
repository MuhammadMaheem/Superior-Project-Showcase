"use client";

import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import {
  X,
  QrCode,
  Download,
  Printer,
  ExternalLink,
  GraduationCap,
  Sparkles,
  Share2,
  Check,
} from "lucide-react";
import type { Project } from "@/lib/sheets/models";

interface ProjectQrModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectQrModal({ project, isOpen, onClose }: ProjectQrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const printableCardRef = useRef<HTMLDivElement>(null);

  // Determine direct target URL
  const projectUrl = typeof window !== "undefined"
    ? `${window.location.origin}/?project=${project.id}`
    : `https://superior-showcase.edu.pk/?project=${project.id}`;

  useEffect(() => {
    if (!isOpen) return;

    QRCode.toDataURL(projectUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("Failed to generate QR code:", err));
  }, [isOpen, projectUrl]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(projectUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownloadImage = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.download = `SPS-QR-${project.roll_number || "Capstone"}-${project.project_title.slice(0, 20).replace(/\s+/g, "_")}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-[#1f293d] bg-[#111827] p-6 sm:p-8 shadow-2xl space-y-6 text-white max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-[#1f293d] hover:text-white transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-md shadow-blue-500/25">
            <QrCode className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold tracking-tight">
              Viva & Stall Placard QR
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Scan to view project demo & repository
            </p>
          </div>
        </div>

        {/* Printable Stall Card Frame */}
        <div
          ref={printableCardRef}
          className="stall-print-card rounded-2xl bg-white text-slate-900 p-6 shadow-xl border-4 border-blue-600/20 text-center space-y-4"
        >
          {/* Superior University Header */}
          <div className="flex items-center justify-center gap-2 border-b border-slate-200 pb-3">
            <GraduationCap className="h-5 w-5 text-blue-600" />
            <span className="font-display font-extrabold text-xs tracking-wider uppercase text-slate-800">
              Superior Project Showcase
            </span>
          </div>

          {/* QR Code Canvas */}
          <div className="flex justify-center py-2">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Project Exhibition QR Code"
                className="h-48 w-48 rounded-xl shadow-inner border border-slate-100"
              />
            ) : (
              <div className="h-48 w-48 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-mono">
                Generating QR...
              </div>
            )}
          </div>

          {/* Project Details Banner */}
          <div className="space-y-1">
            <h4 className="font-display font-bold text-base text-slate-900 leading-tight">
              {project.project_title}
            </h4>
            <p className="font-medium text-xs text-blue-700">
              {project.student_name}
            </p>
            <div className="flex items-center justify-center gap-2 pt-1 font-mono text-[11px] text-slate-600">
              <span className="bg-slate-100 px-2 py-0.5 rounded font-semibold border border-slate-200">
                {project.roll_number}
              </span>
              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold border border-blue-200">
                {project.batch_section}
              </span>
            </div>
            {project.supervisor_name && (
              <p className="text-[10px] text-slate-500 pt-1">
                Supervised by <strong>{project.supervisor_name}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleDownloadImage}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 px-3 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-500 transition-all cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Download PNG</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#1f293d] bg-[#0a0f1d] py-2.5 px-3 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-600 transition-all cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Print Placard</span>
          </button>
        </div>

        {/* Direct Link Share Bar */}
        <div className="flex items-center gap-2 rounded-xl border border-[#1f293d] bg-[#0a0f1d] p-2 text-xs">
          <input
            type="text"
            readOnly
            value={projectUrl}
            className="flex-1 bg-transparent px-2 font-mono text-[11px] text-slate-400 focus:outline-none truncate"
          />
          <button
            type="button"
            onClick={handleCopyLink}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono text-[11px] font-semibold transition-all cursor-pointer ${
              copied
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-[#1e293b] text-blue-400 hover:text-white"
            }`}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" /> Copied
              </>
            ) : (
              <>
                <Share2 className="h-3 w-3" /> Copy Link
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
