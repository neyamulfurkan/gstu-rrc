// src/components/home/AnnouncementSection.tsx
"use client";

import React, { useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Calendar, ChevronRight, Megaphone } from "lucide-react";

import { cn, formatDate } from "@/lib/utils";
import { Badge, Skeleton } from "@/components/ui/Feedback";
import { Modal } from "@/components/ui/Overlay";
import type { AnnouncementCard, AnnouncementDetail } from "@/types/index";

// ─── Dynamic Rich Text Renderer ──────────────────────────────────────────────

function SimpleRichTextRenderer({ content }: { content: unknown }): JSX.Element {
  if (!content || typeof content !== "object") {
    return <p className="text-[var(--color-text-secondary)] text-sm">No content available.</p>;
  }

  function renderNode(node: Record<string, unknown>, index: number): React.ReactNode {
    const type = node.type as string;

    if (type === "text") {
      const text = node.text as string;
      const marks = (node.marks as Array<{ type: string }>) ?? [];
      let el: React.ReactNode = text;
      for (const mark of marks) {
        if (mark.type === "bold") el = <strong key={index}>{el}</strong>;
        if (mark.type === "italic") el = <em key={index}>{el}</em>;
        if (mark.type === "underline") el = <u key={index}>{el}</u>;
        if (mark.type === "code")
          el = (
            <code
              key={index}
              className="px-1 py-0.5 rounded bg-[var(--color-bg-elevated)] font-[var(--font-mono)] text-xs"
            >
              {el}
            </code>
          );
      }
      return el;
    }

    const children = (node.content as Record<string, unknown>[]) ?? [];

    if (type === "paragraph") {
      return (
        <p key={index} className="mb-3 text-[var(--color-text-secondary)] leading-relaxed">
          {children.map((child, i) => renderNode(child, i))}
        </p>
      );
    }

    if (type === "heading") {
      const level = (node.attrs as Record<string, unknown>)?.level as number ?? 2;
      const Tag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;
      return (
        <Tag
          key={index}
          className={cn(
            "font-semibold text-[var(--color-text-primary)] font-[var(--font-heading)] mb-2 mt-4",
            level === 1 && "text-2xl",
            level === 2 && "text-xl",
            level === 3 && "text-lg",
            level >= 4 && "text-base"
          )}
        >
          {children.map((child, i) => renderNode(child, i))}
        </Tag>
      );
    }

    if (type === "bulletList") {
      return (
        <ul key={index} className="list-disc pl-5 mb-3 space-y-1">
          {children.map((child, i) => renderNode(child, i))}
        </ul>
      );
    }

    if (type === "orderedList") {
      return (
        <ol key={index} className="list-decimal pl-5 mb-3 space-y-1">
          {children.map((child, i) => renderNode(child, i))}
        </ol>
      );
    }

    if (type === "listItem") {
      return (
        <li key={index} className="text-[var(--color-text-secondary)] leading-relaxed">
          {children.map((child, i) => renderNode(child, i))}
        </li>
      );
    }

    if (type === "blockquote") {
      return (
        <blockquote
          key={index}
          className="border-l-4 border-[var(--color-accent)] pl-4 my-3 italic text-[var(--color-text-secondary)]"
        >
          {children.map((child, i) => renderNode(child, i))}
        </blockquote>
      );
    }

    if (type === "hardBreak") {
      return <br key={index} />;
    }

    if (type === "horizontalRule") {
      return <hr key={index} className="my-4 border-[var(--color-border)]" />;
    }

    if (type === "codeBlock") {
      return (
        <pre
          key={index}
          className="bg-[var(--color-bg-elevated)] rounded-lg p-4 mb-3 overflow-x-auto"
        >
          <code className="font-[var(--font-mono)] text-xs text-[var(--color-text-primary)]">
            {children.map((child, i) => renderNode(child, i))}
          </code>
        </pre>
      );
    }

    // Fallback: render children
    if (children.length > 0) {
      return (
        <React.Fragment key={index}>
          {children.map((child, i) => renderNode(child, i))}
        </React.Fragment>
      );
    }

    return null;
  }

  const doc = content as Record<string, unknown>;
  const docChildren = (doc.content as Record<string, unknown>[]) ?? [];

  return (
    <div className="prose-custom">
      {docChildren.map((child, i) => renderNode(child, i))}
    </div>
  );
}

// ─── Announcement Detail Modal Content ───────────────────────────────────────

interface AnnouncementModalContentProps {
  announcement: AnnouncementCard;
}

function AnnouncementModalContent({ announcement }: AnnouncementModalContentProps): JSX.Element {
  const [detail, setDetail] = useState<AnnouncementDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function fetchDetail() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/announcements/${announcement.id}`);
        if (!res.ok) throw new Error("Failed to load announcement");
        const data = await res.json();
        if (!cancelled) {
          setDetail(data.data ?? data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load announcement");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchDetail();

    return () => {
      cancelled = true;
    };
  }, [announcement.id]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-[var(--color-error)] text-sm">{error}</p>
        <p className="text-[var(--color-text-secondary)] text-xs mt-1">
          Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Badge variant="accent" size="sm">
          {announcement.category.name}
        </Badge>
        <span className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1">
          <Calendar className="w-3 h-3" aria-hidden="true" />
          {formatDate(announcement.createdAt, "short")}
        </span>
        {announcement.expiresAt && (
          <span className="text-xs text-[var(--color-warning)]">
            Expires {formatDate(announcement.expiresAt, "short")}
          </span>
        )}
      </div>

      {/* Rich text content */}
      {detail?.content ? (
        <SimpleRichTextRenderer content={detail.content} />
      ) : (
        <p className="text-[var(--color-text-secondary)] text-sm">
          {announcement.excerpt}
        </p>
      )}
    </div>
  );
}

// ─── Announcement Card ────────────────────────────────────────────────────────

interface AnnouncementCardViewProps {
  announcement: AnnouncementCard;
  index: number;
}

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

function AnnouncementCardView({ announcement, index }: AnnouncementCardViewProps): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const isExpiring =
    announcement.expiresAt != null &&
    new Date(announcement.expiresAt).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;

  return (
    <>
      <motion.article
        custom={index}
        variants={cardVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className={cn(
          "group relative flex flex-col rounded-xl overflow-hidden",
          "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
          "hover:border-[var(--color-accent)]/40 hover:shadow-[0_0_20px_rgba(var(--color-accent-rgb),0.08)]",
          "transition-all duration-300 cursor-pointer"
        )}
        onClick={openModal}
        role="button"
        tabIndex={0}
        aria-label={`Read announcement: ${announcement.title}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openModal();
          }
        }}
      >
        {/* Top accent bar */}
        <div
          className="h-1 w-full shrink-0"
          style={{ backgroundColor: announcement.category.color || "var(--color-accent)" }}
        />

        <div className="flex flex-col flex-1 p-5">
          {/* Category + date row */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <Badge
              variant="accent"
              size="sm"
              className="shrink-0"
            >
              {announcement.category.name}
            </Badge>
            <span className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1 shrink-0">
              <Calendar className="w-3 h-3" aria-hidden="true" />
              {formatDate(announcement.createdAt, "short")}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-base font-semibold text-[var(--color-text-primary)] font-[var(--font-heading)] mb-2 group-hover:text-[var(--color-accent)] transition-colors duration-200 line-clamp-2">
            {announcement.title}
          </h3>

          {/* Excerpt */}
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed line-clamp-3 flex-1">
            {announcement.excerpt}
          </p>

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between">
            {isExpiring && announcement.expiresAt && (
              <span className="text-xs text-[var(--color-warning)]">
                Expires {formatDate(announcement.expiresAt, "short")}
              </span>
            )}
            <span
              className={cn(
                "ml-auto inline-flex items-center gap-1 text-xs font-medium",
                "text-[var(--color-accent)] group-hover:gap-2 transition-all duration-200"
              )}
            >
              Read More
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          </div>
        </div>
      </motion.article>

      {/* Full content modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={announcement.title}
        size="lg"
        closeOnBackdrop
      >
        <AnnouncementModalContent announcement={announcement} />
      </Modal>
    </>
  );
}

// ─── Ticker Bar ───────────────────────────────────────────────────────────────

interface TickerBarProps {
  announcements: AnnouncementCard[];
  tickerSpeed: number;
}

function TickerBar({ announcements, tickerSpeed }: TickerBarProps): JSX.Element | null {
  const tickerRef = useRef<HTMLDivElement>(null);

  const tickerText = announcements
    .map((a) => a.title)
    .join("  •  ");

  const handleMouseEnter = useCallback(() => {
    if (tickerRef.current) {
      tickerRef.current.style.animationPlayState = "paused";
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (tickerRef.current) {
      tickerRef.current.style.animationPlayState = "running";
    }
  }, []);

  if (announcements.length === 0) return null;

  return (
    <div
      className={cn(
        "w-full h-12 flex items-center overflow-hidden",
        "bg-[var(--color-bg-surface)] border-y border-[var(--color-border)]",
        "relative select-none"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label="Announcement ticker"
      role="marquee"
    >
      {/* Left label */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 z-10 flex items-center",
          "px-3 shrink-0",
          "bg-[var(--color-accent)] text-[var(--color-bg-base)]"
        )}
        aria-hidden="true"
      >
        <Megaphone className="w-3.5 h-3.5 mr-1.5" />
        <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">
          Announcements
        </span>
      </div>

      {/* Scrolling content area */}
      <div className="overflow-hidden flex-1 pl-[140px]">
        <div
          ref={tickerRef}
          className="inline-flex items-center"
          style={{
            animation: `ticker-scroll ${tickerSpeed}s linear infinite`,
            willChange: "transform",
            whiteSpace: "nowrap",
          }}
          aria-hidden="true"
        >
          {/* Repeat copies for truly seamless infinite loop */}
          <span className="text-sm text-[var(--color-text-secondary)] inline-block pr-16">
            {tickerText}&nbsp;&nbsp;•&nbsp;&nbsp;
          </span>
          <span className="text-sm text-[var(--color-text-secondary)] inline-block pr-16">
            {tickerText}&nbsp;&nbsp;•&nbsp;&nbsp;
          </span>
          <span className="text-sm text-[var(--color-text-secondary)] inline-block pr-16">
            {tickerText}&nbsp;&nbsp;•&nbsp;&nbsp;
          </span>
          <span className="text-sm text-[var(--color-text-secondary)] inline-block pr-16">
            {tickerText}&nbsp;&nbsp;•&nbsp;&nbsp;
          </span>
        </div>
      </div>

      {/* CSS keyframes injected via style tag */}
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

const sectionHeaderVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface AnnouncementSectionProps {
  announcements: AnnouncementCard[];
  tickerSpeed: number;
}

export function AnnouncementSection({
  announcements,
  tickerSpeed,
}: AnnouncementSectionProps): JSX.Element {
  if (announcements.length === 0) {
    return <></>;
  }

  return (
    <section
      aria-labelledby="announcements-heading"
      className="w-full relative z-10"
    >
      {/* Ticker bar */}
      <TickerBar announcements={announcements} tickerSpeed={tickerSpeed} />

      {/* Cards grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Section heading */}
        <motion.div
          variants={sectionHeaderVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="inline-block w-8 h-0.5"
                style={{ backgroundColor: "var(--color-accent)" }}
                aria-hidden="true"
              />
              <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">
                Latest News
              </span>
            </div>
            <h2
              id="announcements-heading"
              className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)]"
            >
              Announcements
            </h2>
          </div>

          <a
            href="/events"
            className={cn(
              "hidden sm:inline-flex items-center gap-1.5 text-sm font-medium",
              "text-[var(--color-accent)] hover:text-[var(--color-primary)]",
              "transition-colors duration-200",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
            )}
          >
            View All
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </a>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {announcements.map((announcement, index) => (
            <AnnouncementCardView
              key={announcement.id}
              announcement={announcement}
              index={index}
            />
          ))}
        </div>

        {/* Mobile "View All" link */}
        <div className="mt-6 text-center sm:hidden">
          <a
            href="/events"
            className={cn(
              "inline-flex items-center gap-1.5 text-sm font-medium",
              "text-[var(--color-accent)] hover:text-[var(--color-primary)]",
              "transition-colors duration-200",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded px-2 py-1"
            )}
          >
            View All Announcements
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}