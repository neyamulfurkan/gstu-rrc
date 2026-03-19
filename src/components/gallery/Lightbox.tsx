// src/components/gallery/Lightbox.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  Share2,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import type { GalleryItemCard } from "@/types/index";
import { formatDate, cn } from "@/lib/utils";
import { toast } from "@/components/ui/Feedback";
import { VideoPlayer } from "@/components/ui/Media";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GalleryLightboxProps {
  items: GalleryItemCard[];
  initialIndex: number;
  onClose: () => void;
}

// ─── GalleryLightbox ──────────────────────────────────────────────────────────

export function GalleryLightbox({
  items,
  initialIndex,
  onClose,
}: GalleryLightboxProps): JSX.Element {
  const [currentIndex, setCurrentIndex] = useState(
    Math.max(0, Math.min(initialIndex, items.length - 1))
  );
  const [copied, setCopied] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const touchStartXRef = useRef<number>(0);
  const touchEndXRef = useRef<number>(0);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentItem = items[currentIndex];

  // ── Mount guard for portal ──────────────────────────────────────────────────
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // ── Body scroll lock ────────────────────────────────────────────────────────
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // ── Navigation helpers ──────────────────────────────────────────────────────
  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  }, [items.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
  }, [items.length]);

  // ── Keyboard navigation ─────────────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        goToPrev();
      } else if (e.key === "ArrowRight") {
        goToNext();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [goToPrev, goToNext, onClose]);

  // ── Touch / swipe navigation ────────────────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchEndXRef.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndXRef.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const delta = touchStartXRef.current - touchEndXRef.current;
    if (Math.abs(delta) > 50) {
      if (delta > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
  }, [goToNext, goToPrev]);

  // ── Share / copy ────────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/gallery/${currentItem.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast("Link copied to clipboard", "success");
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Failed to copy link", "error");
    }
  }, [currentItem.id]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  // ── Thumbnail strip ─────────────────────────────────────────────────────────
  const thumbnailIndices = React.useMemo(() => {
    const result: number[] = [];
    for (let offset = -2; offset <= 2; offset++) {
      const idx = currentIndex + offset;
      if (idx >= 0 && idx < items.length) {
        result.push(idx);
      }
    }
    return result;
  }, [currentIndex, items.length]);

  // ── Backdrop click handler ──────────────────────────────────────────────────
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isMounted || !currentItem) return <></>;

  // ── Portal content ──────────────────────────────────────────────────────────
  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={currentItem.title ?? "Gallery lightbox"}
      className="fixed inset-0 z-[9999] flex flex-col bg-black/95 outline-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div className="flex flex-shrink-0 items-center justify-between px-4 py-3 md:px-6">
        <p className="text-sm text-[var(--color-text-secondary)]">
          {currentIndex + 1} / {items.length}
        </p>
        <div className="flex items-center gap-2">
          {/* Share */}
          <button
            type="button"
            onClick={handleShare}
            aria-label="Share this item"
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors",
              "border-[var(--color-border)] text-[var(--color-text-secondary)]",
              "hover:border-[var(--color-accent)]/50 hover:text-[var(--color-text-primary)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            )}
          >
            {copied ? (
              <Check size={14} aria-hidden="true" className="text-[var(--color-success)]" />
            ) : (
              <Share2 size={14} aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{copied ? "Copied!" : "Share"}</span>
          </button>

          {/* Download */}
          {currentItem.downloadEnabled && (
            <a
              href={currentItem.url}
              download
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Download this item"
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors",
                "border-[var(--color-border)] text-[var(--color-text-secondary)]",
                "hover:border-[var(--color-accent)]/50 hover:text-[var(--color-text-primary)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              )}
            >
              <Download size={14} aria-hidden="true" />
              <span className="hidden sm:inline">Download</span>
            </a>
          )}

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close lightbox"
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
              "border-[var(--color-border)] text-[var(--color-text-secondary)]",
              "hover:border-[var(--color-error)]/50 hover:text-[var(--color-error)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            )}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── Main viewport ───────────────────────────────────────────────────── */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        onClick={handleBackdropClick}
      >
        {/* Prev button */}
        {items.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goToPrev();
            }}
            aria-label="Previous item"
            className={cn(
              "absolute left-3 z-10 flex h-10 w-10 items-center justify-center",
              "rounded-full border border-[var(--color-border)] bg-[var(--color-bg-overlay)]",
              "text-[var(--color-text-primary)] transition-colors",
              "hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-bg-elevated)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              "md:left-6"
            )}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
        )}

        {/* Media */}
        <div className="relative flex h-full w-full max-w-5xl items-center justify-center px-16">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentItem.id}
              layoutId={`gallery-item-${currentItem.id}`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative flex h-full w-full items-center justify-center"
            >
              {currentItem.type === "video" ? (
                <VideoPlayer
                  src={currentItem.url}
                  title={currentItem.title ?? "Gallery video"}
                  className="max-h-[60vh] w-full max-w-3xl"
                />
              ) : (
                <div className="relative h-[55vh] w-full md:h-[65vh]">
                  <Image
                    src={currentItem.url}
                    alt={currentItem.altText}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 80vw"
                    priority
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Next button */}
        {items.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            aria-label="Next item"
            className={cn(
              "absolute right-3 z-10 flex h-10 w-10 items-center justify-center",
              "rounded-full border border-[var(--color-border)] bg-[var(--color-bg-overlay)]",
              "text-[var(--color-text-primary)] transition-colors",
              "hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-bg-elevated)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              "md:right-6"
            )}
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* ── Info panel ─────────────────────────────────────────────────────── */}
      <div className="flex flex-shrink-0 flex-col gap-2 px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {currentItem.title && (
              <p className="truncate text-sm font-semibold text-[var(--color-text-primary)] md:text-base">
                {currentItem.title}
              </p>
            )}
            <p className="text-xs text-[var(--color-text-secondary)]">
              {formatDate(currentItem.createdAt, "short")}
              {currentItem.category?.name && (
                <> · {currentItem.category.name}</>
              )}
            </p>
          </div>

          {/* Uploader */}
          {currentItem.uploader && (
            <Link
              href={`/members/${currentItem.uploader.username}`}
              className={cn(
                "flex flex-shrink-0 items-center gap-2 rounded-lg border px-2 py-1 transition-colors",
                "border-[var(--color-border)] bg-[var(--color-bg-elevated)]",
                "hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-bg-elevated)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative h-6 w-6 flex-shrink-0 overflow-hidden rounded-full border border-[var(--color-border)]">
                <Image
                  src={currentItem.uploader.avatarUrl}
                  alt={currentItem.uploader.fullName}
                  fill
                  className="object-cover"
                  sizes="24px"
                />
              </div>
              <span className="max-w-[120px] truncate text-xs text-[var(--color-text-secondary)]">
                {currentItem.uploader.fullName}
              </span>
            </Link>
          )}
        </div>

        {/* ── Thumbnail strip (desktop only) ─────────────────────────────── */}
        {items.length > 1 && thumbnailIndices.length > 0 && (
          <div className="hidden items-center justify-center gap-2 md:flex" aria-label="Gallery thumbnails">
            {thumbnailIndices.map((idx) => {
              const thumb = items[idx];
              const isActive = idx === currentIndex;
              return (
                <button
                  key={thumb.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`View ${thumb.title ?? `item ${idx + 1}`}`}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                    isActive
                      ? "border-[var(--color-accent)] opacity-100 scale-105"
                      : "border-[var(--color-border)] opacity-50 hover:opacity-80 hover:border-[var(--color-accent)]/40"
                  )}
                >
                  {thumb.type === "video" ? (
                    <div className="flex h-full w-full items-center justify-center bg-[var(--color-bg-elevated)]">
                      <span className="text-[var(--color-text-secondary)] text-xl">▶</span>
                    </div>
                  ) : (
                    <Image
                      src={thumb.url}
                      alt={thumb.altText}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}