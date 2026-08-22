"use client";

import { useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";

interface ImageLightboxProps {
  images: string[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function ImageLightbox({
  images,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
}: ImageLightboxProps) {
  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    } else {
      onNavigate(images.length - 1);
    }
  }, [currentIndex, images.length, onNavigate]);

  const handleNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      onNavigate(currentIndex + 1);
    } else {
      onNavigate(0);
    }
  }, [currentIndex, images.length, onNavigate]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || images.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-200 select-none">
      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between px-4 py-3 z-10 max-w-7xl">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800">
          <ZoomIn className="h-3.5 w-3.5 text-blue-400" />
          <span>
            {currentIndex + 1} / {images.length}
          </span>
        </div>

        <button
          onClick={onClose}
          className="rounded-full p-2.5 bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Close Lightbox (Esc)"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main Image Display Area */}
      <div className="relative flex-1 w-full max-w-6xl flex items-center justify-center min-h-0 py-2">
        {/* Previous Button */}
        {images.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-2 sm:left-4 z-10 p-3 rounded-full bg-slate-900/80 border border-slate-800 text-white hover:bg-blue-600 transition-all cursor-pointer shadow-xl"
            title="Previous Image (←)"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Active Fullscreen Image */}
        <div className="relative max-w-full max-h-full flex items-center justify-center p-2">
          <img
            src={images[currentIndex]}
            alt={`Screenshot ${currentIndex + 1}`}
            className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl border border-slate-800"
          />
        </div>

        {/* Next Button */}
        {images.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-2 sm:right-4 z-10 p-3 rounded-full bg-slate-900/80 border border-slate-800 text-white hover:bg-blue-600 transition-all cursor-pointer shadow-xl"
            title="Next Image (→)"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Navigation Strip */}
      {images.length > 1 && (
        <div className="w-full max-w-2xl flex items-center justify-center gap-2 p-3 bg-slate-950/80 rounded-2xl border border-slate-800/80 overflow-x-auto">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => onNavigate(idx)}
              className={`relative h-14 w-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                idx === currentIndex
                  ? "border-blue-500 scale-105 shadow-lg shadow-blue-500/25"
                  : "border-transparent opacity-50 hover:opacity-100"
              }`}
            >
              <img
                src={img}
                alt={`Thumbnail ${idx + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
