// src/components/events/Card.tsx
"use client";

import { useEffect, useRef, useState } from "react";

import { motion } from "framer-motion";
import { Calendar, Clock, ExternalLink, MapPin } from "lucide-react";
import Image from "next/image";

import { cn, formatDate, truncateText } from "@/lib/utils";
import { Badge } from "@/components/ui/Feedback";
import type { EventCard } from "@/types/index";

// ─── Animation Variants ───────────────────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 20 },
  },
};

// ─── Countdown Logic ──────────────────────────────────────────────────────────

interface CountdownResult {
  label: string;
  isPulse: boolean;
  isUrgent: boolean;
}

function getCountdown(startDate: Date | string): CountdownResult | null {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const now = Date.now();
  const diffMs = start.getTime() - now;

  if (diffMs <= 0) return null;

  const diffDays = diffMs / 86400000;

  if (diffDays < 1) {
    return { label: "Today!", isPulse: true, isUrgent: true };
  }
  if (diffDays < 2) {
    return { label: "Tomorrow", isPulse: true, isUrgent: true };
  }
  if (diffDays < 8) {
    const days = Math.ceil(diffDays);
    return { label: `${days} days left`, isPulse: false, isUrgent: true };
  }
  return null;
}

// ─── EventCard Component ──────────────────────────────────────────────────────

interface EventCardProps {
  event: EventCard;
  onClick: () => void;
}

export function EventCard({ event, onClick }: EventCardProps): JSX.Element {
  const [countdown, setCountdown] = useState<CountdownResult | null>(() =>
    getCountdown(event.startDate)
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update countdown every minute
  useEffect(() => {
    const update = (): void => {
      setCountdown(getCountdown(event.startDate));
    };

    intervalRef.current = setInterval(update, 60_000);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [event.startDate]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  const fallbackImageUrl =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225' viewBox='0 0 400 225'%3E%3Crect fill='%230D1626' width='400' height='225'/%3E%3Ctext fill='%237B8DB0' font-family='sans-serif' font-size='16' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3ENo Image%3C/text%3E%3C/svg%3E";

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`View event: ${event.title}`}
      className={cn(
        "group relative overflow-hidden rounded-lg cursor-pointer",
        "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
        "transition-[border-color,box-shadow] duration-300 ease-out",
        "hover:border-[var(--color-card-border-hover)] hover:shadow-[0_0_16px_var(--color-glow-accent)]",
        "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-base)]"
      )}
    >
      {/* ── Cover Image ── */}
      <div className="relative aspect-video w-full overflow-hidden bg-[var(--color-bg-elevated)]">
        <Image
          src={event.coverUrl || fallbackImageUrl}
          alt={event.title}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          unoptimized={!event.coverUrl || event.coverUrl.startsWith("data:")}
        />

        {/* Bottom gradient overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-surface)] via-transparent to-transparent opacity-80"
          aria-hidden="true"
        />

        {/* Category badge — top left */}
        <div className="absolute top-3 left-3 z-10">
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
            style={{
              color: event.category.color || "var(--color-accent)",
              backgroundColor: `${event.category.color || "var(--color-accent)"}1A`,
              borderColor: `${event.category.color || "var(--color-accent)"}33`,
            }}
          >
            {event.category.name}
          </span>
        </div>

        {/* Registration badge — top right */}
        {event.registrationEnabled && (
          <div className="absolute top-3 right-3 z-10">
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                "bg-[var(--color-success)]/15 text-[var(--color-success)] border border-[var(--color-success)]/25"
              )}
            >
              <ExternalLink size={10} aria-hidden="true" />
              Open for Registration
            </span>
          </div>
        )}

        {/* Countdown badge — bottom left overlay */}
        {countdown !== null && (
          <div className="absolute bottom-3 left-3 z-10">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                "bg-[var(--color-bg-overlay)] border border-[var(--color-border-accent)]",
                "text-[var(--color-accent)]",
                countdown.isPulse && "animate-pulse"
              )}
            >
              <Clock
                size={11}
                aria-hidden="true"
                className={cn(
                  countdown.isUrgent && !countdown.isPulse && "text-[var(--color-warning)]"
                )}
              />
              {countdown.label}
            </span>
          </div>
        )}
      </div>

      {/* ── Card Body ── */}
      <div className="p-4 flex flex-col gap-2">
        {/* Title */}
        <h3
          className={cn(
            "text-base font-bold leading-snug",
            "text-[var(--color-text-primary)]",
            "font-[var(--font-display)]",
            "group-hover:text-[var(--color-accent)] transition-colors duration-200",
            "line-clamp-2"
          )}
          style={{ fontFamily: "var(--font-display)" }}
        >
          {event.title}
        </h3>

        {/* Info row */}
        <div className="flex flex-col gap-1.5">
          {/* Date */}
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
            <Calendar size={13} aria-hidden="true" className="flex-shrink-0 text-[var(--color-accent)]" />
            <span>{formatDate(event.startDate, "short")}</span>
            {event.endDate && (
              <>
                <span className="text-[var(--color-border)]">→</span>
                <span>{formatDate(event.endDate, "short")}</span>
              </>
            )}
            {event.allDay && (
              <Badge variant="neutral" size="sm" className="ml-auto">
                All Day
              </Badge>
            )}
          </div>

          {/* Venue */}
          {event.venue && (
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
              <MapPin size={13} aria-hidden="true" className="flex-shrink-0 text-[var(--color-accent)]" />
              <span className="truncate">{truncateText(event.venue, 48)}</span>
            </div>
          )}
        </div>

        {/* Description excerpt */}
        {event.description && typeof event.description === "string" && event.description.length > 0 && (
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed line-clamp-2 mt-0.5">
            {truncateText(event.description, 120)}
          </p>
        )}
      </div>
    </motion.div>
  );
}