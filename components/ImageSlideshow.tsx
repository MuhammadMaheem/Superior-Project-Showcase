"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Play, Pause, ImageIcon, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ImageSlideshowProps {
  images: string[];
  title: string;
  onOpenLightbox?: (index: number) => void;
}

export function ImageSlideshow({ images, title, onOpenLightbox }: ImageSlideshowProps) {
  // Filter out empty entries
  const validImages = images.filter((img) => img && typeof img === "string" && img.trim().length > 0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const nextSlide = useCallback(() => {
    if (validImages.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % validImages.length);
  }, [validImages.length]);

  const prevSlide = useCallback(() => {
    if (validImages.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
  }, [validImages.length]);

  // Autoplay effect
  useEffect(() => {
    if (!isPlaying || validImages.length <= 1) return;
    const interval = setInterval(nextSlide, 4000);
    return () => clearInterval(interval);
  }, [isPlaying, validImages.length, nextSlide]);

  if (validImages.length === 0) {
    return (
      <div className="relative aspect-video w-full rounded-2xl border border-[#1f293d] bg-[#111827] flex flex-col items-center justify-center text-slate-500 gap-2 p-6">
        <ImageIcon className="h-10 w-10 text-slate-600" />
        <p className="text-xs text-slate-400">No project screenshots provided</p>
      </div>
    );
  }

  return (
    <div className="relative w-full space-y-3">
      {/* Main Slideshow Viewport */}
      <div className="group relative aspect-video w-full overflow-hidden rounded-2xl border border-[#1f293d] bg-black shadow-2xl">
        {/* Fullscreen Zoom Lightbox Trigger */}
        {onOpenLightbox && (
          <button
            type="button"
            onClick={() => onOpenLightbox(currentIndex)}
            className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-mono font-medium text-white backdrop-blur-md border border-white/10 hover:bg-blue-600 transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-lg"
            title="Open Fullscreen Lightbox"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span>Zoom</span>
          </button>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => onOpenLightbox && onOpenLightbox(currentIndex)}
            className={`relative h-full w-full ${onOpenLightbox ? "cursor-zoom-in" : ""}`}
          >
            {/* Display Base64 Data URI or Remote Image */}
            {validImages[currentIndex].startsWith("data:") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={validImages[currentIndex]}
                alt={`${title} - Screenshot ${currentIndex + 1}`}
                className="h-full w-full object-contain"
              />
            ) : (
              <Image
                src={validImages[currentIndex]}
                alt={`${title} - Screenshot ${currentIndex + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 800px"
                className="object-contain"
                unoptimized
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Controls (Shown when multiple images exist) */}
        {validImages.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              aria-label="Previous screenshot"
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-all hover:bg-blue-600 hover:scale-110 active:scale-95 opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={nextSlide}
              aria-label="Next screenshot"
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-all hover:bg-blue-600 hover:scale-110 active:scale-95 opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Autoplay Toggle and Counter in Bottom Bar */}
            <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-none">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-[11px] font-mono text-white backdrop-blur-md border border-white/10 transition-colors hover:bg-black/90"
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-3 w-3 text-amber-400" />
                    <span>Autoplay ON</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 text-slate-300" />
                    <span>Autoplay OFF</span>
                  </>
                )}
              </button>

              <span className="rounded-full bg-black/70 px-2.5 py-0.5 text-[11px] font-mono text-slate-200 backdrop-blur-md border border-white/10">
                {currentIndex + 1} / {validImages.length}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Thumbnail Nav Strip */}
      {validImages.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {validImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                "relative h-14 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                idx === currentIndex
                  ? "border-blue-500 ring-2 ring-blue-500/30 scale-105"
                  : "border-[#1f293d] opacity-50 hover:opacity-100 hover:border-slate-500"
              )}
            >
              {img.startsWith("data:") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt={`Thumb ${idx + 1}`} className="h-full w-full object-cover" />
              ) : (
                <Image src={img} alt={`Thumb ${idx + 1}`} fill className="object-cover" unoptimized />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
