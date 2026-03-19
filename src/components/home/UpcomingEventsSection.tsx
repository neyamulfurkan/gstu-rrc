// src/components/home/UpcomingEventsSection.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { motion } from "framer-motion";
import { ArrowRight, Calendar } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { EventCard } from "@/components/events/Card";
import { EventDetail } from "@/components/events/Detail";
import { Drawer, Modal } from "@/components/ui/Overlay";
import type { EventCard as EventCardType } from "@/types/index";

// ─── Animation Variants ───────────────────────────────────────────────────────

const sectionVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 80, damping: 20, staggerChildren: 0.08 },
  },
};

const headerVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 20 },
  },
};

const underlineVariants = {
  hidden: { scaleX: 0, originX: 0 },
  visible: {
    scaleX: 1,
    originX: 0,
    transition: { type: "spring", stiffness: 120, damping: 20, delay: 0.2 },
  },
};

const cardContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

// ─── Empty State ──────────────────────────────────────────────────────────────

function UpcomingEmpty(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div
        className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center",
          "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]"
        )}
      >
        <Calendar size={28} className="text-[var(--color-text-secondary)]" aria-hidden="true" />
      </div>
      <p className="text-[var(--color-text-secondary)] text-sm font-medium">
        No upcoming events at the moment
      </p>
      <p className="text-[var(--color-text-secondary)] text-xs max-w-xs">
        Check back soon — new events are added regularly.
      </p>
      <Link
        href="/events"
        className={cn(
          "mt-2 inline-flex items-center gap-1.5 text-sm font-medium",
          "text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]",
          "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded",
          "transition-colors duration-150"
        )}
      >
        Browse all events
        <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface UpcomingEventsSectionProps {
  events: EventCardType[];
}

export function UpcomingEventsSection({ events }: UpcomingEventsSectionProps): JSX.Element {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on mount and resize
  useEffect(() => {
    function checkMobile(): void {
      setIsMobile(window.innerWidth < 768);
    }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleCardClick = useCallback((eventId: string): void => {
    setSelectedEventId(eventId);
  }, []);

  const handleClose = useCallback((): void => {
    setSelectedEventId(null);
  }, []);

  const isDetailOpen = selectedEventId !== null;

  return (
    <section
      aria-labelledby="upcoming-events-heading"
      className="py-16 md:py-24"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Section Header ── */}
        <motion.div
          className="flex items-end justify-between mb-10 gap-4"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          <motion.div variants={headerVariants} className="flex flex-col gap-2">
            <span
              className={cn(
                "text-xs font-semibold uppercase tracking-[0.2em]",
                "text-[var(--color-accent)]",
                "font-[var(--font-mono)]"
              )}
              style={{ fontFamily: "var(--font-mono)" }}
            >
              What's Coming
            </span>
            <div className="relative">
              <h2
                id="upcoming-events-heading"
                className={cn(
                  "text-2xl sm:text-3xl md:text-4xl font-bold",
                  "text-[var(--color-text-primary)]",
                  "font-[var(--font-heading)]"
                )}
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Upcoming Events
              </h2>
              <motion.div
                className="absolute -bottom-2 left-0 h-[3px] w-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-transparent"
                variants={underlineVariants}
                aria-hidden="true"
              />
            </div>
          </motion.div>

          <motion.div variants={headerVariants}>
            <Link
              href="/events"
              className={cn(
                "hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium",
                "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
                "bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)]",
                "border border-[var(--color-border)] hover:border-[var(--color-card-border-hover)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-base)]",
                "transition-all duration-150 group"
              )}
            >
              See All Events
              <ArrowRight
                size={15}
                aria-hidden="true"
                className="transition-transform duration-150 group-hover:translate-x-0.5"
              />
            </Link>
          </motion.div>
        </motion.div>

        {/* ── Content ── */}
        {events.length === 0 ? (
          <UpcomingEmpty />
        ) : (
          <>
            {/* Mobile: Horizontal Scrollable Carousel */}
            <motion.div
              className={cn(
                "flex md:hidden gap-4 overflow-x-auto",
                "snap-x snap-mandatory",
                "pb-4",
                "-mx-4 px-4",
                "scrollbar-none"
              )}
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              variants={cardContainerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              role="list"
              aria-label="Upcoming events carousel"
            >
              {events.map((event) => (
                <div
                  key={event.id}
                  className="snap-start flex-shrink-0 w-[280px]"
                  role="listitem"
                >
                  <EventCard
                    event={event}
                    onClick={() => handleCardClick(event.id)}
                  />
                </div>
              ))}
              {/* Trailing spacer for last card */}
              <div className="flex-shrink-0 w-4" aria-hidden="true" />
            </motion.div>

            {/* Desktop: 3-Column Grid */}
            <motion.div
              className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-6"
              variants={cardContainerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              role="list"
              aria-label="Upcoming events"
            >
              {events.map((event) => (
                <div key={event.id} role="listitem">
                  <EventCard
                    event={event}
                    onClick={() => handleCardClick(event.id)}
                  />
                </div>
              ))}
            </motion.div>

            {/* Mobile: See All link below carousel */}
            <div className="flex justify-center mt-6 sm:hidden">
              <Link
                href="/events"
                className={cn(
                  "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium",
                  "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
                  "bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)]",
                  "border border-[var(--color-border)] hover:border-[var(--color-card-border-hover)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                  "transition-all duration-150 group"
                )}
              >
                See All Events
                <ArrowRight
                  size={15}
                  aria-hidden="true"
                  className="transition-transform duration-150 group-hover:translate-x-0.5"
                />
              </Link>
            </div>
          </>
        )}
      </div>

      {/* ── Event Detail Overlay ── */}
      {isMobile ? (
        <Drawer
          isOpen={isDetailOpen && selectedEventId !== null}
          onClose={handleClose}
          side="bottom"
          showCloseButton={false}
          className="max-h-[92vh]"
        >
          {selectedEventId !== null && (
            <EventDetail
              eventId={selectedEventId}
              onClose={handleClose}
              standalone={false}
            />
          )}
        </Drawer>
      ) : (
        <Modal
          isOpen={isDetailOpen && selectedEventId !== null}
          onClose={handleClose}
          size="lg"
          showCloseButton={false}
          className="overflow-hidden"
        >
          {selectedEventId !== null && (
            <EventDetail
              eventId={selectedEventId}
              onClose={handleClose}
              standalone={false}
            />
          )}
        </Modal>
      )}
    </section>
  );
}