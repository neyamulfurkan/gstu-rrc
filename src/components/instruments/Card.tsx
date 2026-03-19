// src/components/instruments/Card.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

import { cn, formatDate, cloudinaryUrl, truncateText } from "@/lib/utils";
import { Badge, Spinner } from "@/components/ui/Feedback";
import type { InstrumentCard as InstrumentCardType } from "@/types/index";

// ─── Tooltip ──────────────────────────────────────────────────────────────────

interface TooltipProps {
  content: string;
  children: React.ReactElement;
}

function Tooltip({ content, children }: TooltipProps): JSX.Element {
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const show = () => setVisible(true);
    const hide = () => setVisible(false);

    el.addEventListener("mouseenter", show);
    el.addEventListener("mouseleave", hide);
    el.addEventListener("focusin", show);
    el.addEventListener("focusout", hide);

    return () => {
      el.removeEventListener("mouseenter", show);
      el.removeEventListener("mouseleave", hide);
      el.removeEventListener("focusin", show);
      el.removeEventListener("focusout", hide);
    };
  }, []);

  return (
    <span ref={containerRef} className="relative inline-flex w-full">
      {children}
      {visible && (
        <span
          role="tooltip"
          className={cn(
            "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50",
            "px-3 py-1.5 rounded-md text-xs whitespace-nowrap",
            "bg-[var(--color-bg-overlay)] text-[var(--color-text-primary)]",
            "border border-[var(--color-border)]",
            "shadow-lg pointer-events-none"
          )}
        >
          {content}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[var(--color-bg-overlay)]" />
        </span>
      )}
    </span>
  );
}

// ─── Status Config ────────────────────────────────────────────────────────────

type StatusKey = "available" | "on_loan" | "under_maintenance" | "unavailable";

function getStatusConfig(status: string): {
  label: string;
  variant: "success" | "warning" | "neutral" | "error";
  glowClass: string;
} {
  const map: Record<
    StatusKey,
    {
      label: string;
      variant: "success" | "warning" | "neutral" | "error";
      glowClass: string;
    }
  > = {
    available: {
      label: "Available",
      variant: "success",
      glowClass: "shadow-[0_0_12px_rgba(0,200,150,0.25)]",
    },
    on_loan: {
      label: "On Loan",
      variant: "warning",
      glowClass: "shadow-[0_0_12px_rgba(255,184,0,0.2)]",
    },
    under_maintenance: {
      label: "Under Maintenance",
      variant: "neutral",
      glowClass: "",
    },
    unavailable: {
      label: "Unavailable",
      variant: "error",
      glowClass: "shadow-[0_0_12px_rgba(255,59,92,0.2)]",
    },
  };

  return (
    map[status as StatusKey] ?? {
      label: status
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      variant: "neutral" as const,
      glowClass: "",
    }
  );
}

// ─── InstrumentCard ───────────────────────────────────────────────────────────

interface InstrumentCardProps {
  instrument: InstrumentCardType;
  onRequestBorrow: () => void;
  isLoggedIn: boolean;
}

export function InstrumentCard({
  instrument,
  onRequestBorrow,
  isLoggedIn,
}: InstrumentCardProps): JSX.Element {
  const { label, variant, glowClass } = getStatusConfig(instrument.status);
  const isAvailable = instrument.status === "available";

  const imageSrc = instrument.imageUrl
    ? cloudinaryUrl(instrument.imageUrl, { width: 400, height: 400 })
    : "";

  const buttonDisabled = !isLoggedIn || !isAvailable;

  const buttonNode = (
    <button
      type="button"
      disabled={buttonDisabled}
      onClick={buttonDisabled ? undefined : onRequestBorrow}
      aria-disabled={buttonDisabled}
      className={cn(
        "w-full rounded-md px-4 py-2.5 text-sm font-semibold transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-surface)]",
        isAvailable && isLoggedIn
          ? "bg-[var(--color-success)]/15 text-[var(--color-success)] border border-[var(--color-success)]/40 hover:bg-[var(--color-success)]/25 hover:border-[var(--color-success)]/60 hover:shadow-[0_0_14px_rgba(0,200,150,0.3)] active:scale-[0.98]"
          : "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)] cursor-not-allowed opacity-60"
      )}
    >
      Request to Borrow
    </button>
  );

  const tooltipContent = !isLoggedIn
    ? "Login to request borrow"
    : !isAvailable
    ? "Currently not available"
    : "";

  return (
    <article
      className={cn(
        "group flex flex-col rounded-lg overflow-hidden",
        "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
        "transition-all duration-300",
        "hover:border-[var(--color-card-border-hover)] hover:-translate-y-1",
        "hover:shadow-[0_4px_24px_rgba(0,0,0,0.4)]",
        glowClass && `hover:${glowClass}`
      )}
    >
      {/* ── Image ── */}
      <div className="relative aspect-square bg-[var(--color-bg-elevated)] overflow-hidden flex items-center justify-center p-4">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={instrument.name}
            fill
            className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-16 h-16 text-[var(--color-text-secondary)] opacity-30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"
              />
            </svg>
          </div>
        )}

        {/* Category badge overlay */}
        <span className="absolute top-2 left-2">
          <Badge variant="neutral" size="sm">
            {instrument.category.name}
          </Badge>
        </span>
      </div>

      {/* ── Info ── */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Name */}
        <h3
          className={cn(
            "font-[var(--font-heading)] font-semibold text-base leading-snug",
            "text-[var(--color-text-primary)] line-clamp-2"
          )}
        >
          {instrument.name}
        </h3>

        {/* Description */}
        {instrument.description && (
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed line-clamp-2 flex-1">
            {truncateText(instrument.description, 120)}
          </p>
        )}

        {/* ── Status ── */}
        <div
          className={cn(
            "flex flex-col gap-2 rounded-md p-3",
            "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
            glowClass
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-[var(--color-text-secondary)] font-medium uppercase tracking-wide">
              Status
            </span>
            <Badge variant={variant} size="md">
              {label}
            </Badge>
          </div>

          {/* On Loan: borrower + return date */}
          {instrument.status === "on_loan" && (
            <div className="flex flex-col gap-1 border-t border-[var(--color-border)] pt-2 mt-1">
              {instrument.borrower && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    Borrowed by:
                  </span>
                  <Link
                    href={`/members/${instrument.borrower.username}`}
                    className={cn(
                      "text-xs font-medium text-[var(--color-accent)] hover:underline",
                      "focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] rounded"
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {instrument.borrower.fullName}
                  </Link>
                </div>
              )}
              {instrument.returnDate && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    Returns:
                  </span>
                  <span className="text-xs font-medium text-[var(--color-warning)]">
                    {formatDate(instrument.returnDate, "short")}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Borrow Button ── */}
        <div className="mt-auto pt-1">
          {buttonDisabled && tooltipContent ? (
            <Tooltip content={tooltipContent}>{buttonNode}</Tooltip>
          ) : (
            buttonNode
          )}
        </div>
      </div>
    </article>
  );
}