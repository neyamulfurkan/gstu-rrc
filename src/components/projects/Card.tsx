// src/components/projects/Card.tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { cn, parseRichText, cloudinaryUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/Feedback";
import type { ProjectCard as ProjectCardType } from "@/types/index";

// ─── Animation Variants ───────────────────────────────────────────────────────

const overlayVariants = {
  hidden: { y: "100%", opacity: 0 },
  visible: {
    y: "0%",
    opacity: 1,
    transition: { type: "spring", stiffness: 280, damping: 28 },
  },
  exit: {
    y: "100%",
    opacity: 0,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

// ─── Team Avatar Cluster ──────────────────────────────────────────────────────

interface AvatarClusterProps {
  members: ProjectCardType["teamMembers"];
}

function AvatarCluster({ members }: AvatarClusterProps): JSX.Element {
  const maxVisible = 3;
  const visible = members.slice(0, maxVisible);
  const overflow = members.length - maxVisible;

  return (
    <div className="flex items-center">
      {visible.map((member, i) => (
        <div
          key={member.id}
          className={cn(
            "relative w-7 h-7 rounded-full border-2 border-[var(--color-bg-base)] overflow-hidden flex-shrink-0",
            i > 0 && "-ml-2"
          )}
          title={member.fullName}
          style={{ zIndex: maxVisible - i }}
        >
          {member.avatarUrl ? (
            <Image
              src={
                member.avatarUrl.startsWith("http")
                  ? member.avatarUrl
                  : cloudinaryUrl(member.avatarUrl, { width: 56 })
              }
              alt={member.fullName}
              fill
              sizes="28px"
              className="object-cover"
              unoptimized={member.avatarUrl.startsWith("data:")}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-[9px] font-bold text-white"
              style={{ backgroundColor: "var(--color-accent-secondary)" }}
            >
              {member.fullName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            "relative w-7 h-7 rounded-full border-2 border-[var(--color-bg-base)] flex-shrink-0",
            "-ml-2 flex items-center justify-center",
            "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]",
            "text-[9px] font-semibold"
          )}
          style={{ zIndex: 0 }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}

// ─── Status Badge Variant ─────────────────────────────────────────────────────

function getStatusVariant(
  status: string
): "accent" | "success" | "neutral" {
  if (status === "ongoing") return "accent";
  if (status === "completed") return "success";
  return "neutral";
}

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// ─── ProjectCard ──────────────────────────────────────────────────────────────

interface ProjectCardProps {
  project: ProjectCardType;
  onClick: () => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps): JSX.Element {
  const [isHovered, setIsHovered] = useState(false);

  const excerpt =
    typeof (project as unknown as { description?: unknown }).description === "object" &&
    (project as unknown as { description?: unknown }).description !== null
      ? parseRichText((project as unknown as { description: Record<string, unknown> }).description).slice(0, 120)
      : "";

  const coverSrc = project.coverUrl
    ? project.coverUrl.startsWith("http")
      ? project.coverUrl
      : cloudinaryUrl(project.coverUrl, { width: 400 })
    : "";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`View project: ${project.title}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      className={cn(
        "relative rounded-lg overflow-hidden cursor-pointer",
        "border bg-[var(--color-bg-surface)]",
        "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
        "transition-all duration-200",
        isHovered
          ? "border-[rgba(0,229,255,0.5)] -translate-y-1.5 shadow-[0_0_16px_rgba(0,229,255,0.35),0_4px_24px_rgba(0,0,0,0.4)]"
          : "border-[var(--color-border)] shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
      )}
    >
      {/* ── Cover Image ── */}
      <div className="relative aspect-[4/3] w-full bg-[var(--color-bg-elevated)]">
        {coverSrc ? (
          <Image
            src={coverSrc}
            alt={project.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--color-bg-elevated)] to-[var(--color-bg-surface)]">
            <span className="text-[var(--color-text-secondary)] text-xs font-mono">
              No cover
            </span>
          </div>
        )}

        {/* Dark gradient overlay for badges readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />

        {/* ── Category Badge (top-left) ── */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold text-white shadow"
            style={{ backgroundColor: project.category.color || "var(--color-primary)" }}
          >
            {project.category.name}
          </span>
        </div>

        {/* ── Status Badge (top-right) ── */}
        <div className="absolute top-2.5 right-2.5 z-10">
          <Badge variant={getStatusVariant(project.status)} size="sm">
            {formatStatus(project.status)}
          </Badge>
        </div>

        {/* ── Year (bottom-left) ── */}
        <div className="absolute bottom-2.5 left-2.5 z-10">
          <span className="font-mono text-xs text-white/80 bg-black/40 px-2 py-0.5 rounded">
            {project.year}
          </span>
        </div>

        {/* ── Team Avatar Cluster (bottom-right) ── */}
        {project.teamMembers.length > 0 && (
          <div className="absolute bottom-2.5 right-2.5 z-10">
            <AvatarCluster members={project.teamMembers} />
          </div>
        )}

        {/* ── Hover Overlay ── */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              key="overlay"
              className={cn(
                "absolute inset-0 z-20 flex flex-col justify-end p-4",
                "bg-[var(--color-bg-overlay)]"
              )}
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Project title */}
              <h3
                className="font-display text-base font-bold text-[var(--color-text-primary)] leading-tight mb-1.5 line-clamp-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {project.title}
              </h3>

              {/* Excerpt */}
              {excerpt && (
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed mb-3 line-clamp-3">
                  {excerpt}
                  {excerpt.length >= 120 ? "…" : ""}
                </p>
              )}

              {/* Tech tags */}
              {project.technologies.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {project.technologies.slice(0, 5).map((tech) => (
                    <Badge key={tech} variant="neutral" size="sm">
                      {tech}
                    </Badge>
                  ))}
                  {project.technologies.length > 5 && (
                    <Badge variant="neutral" size="sm">
                      +{project.technologies.length - 5}
                    </Badge>
                  )}
                </div>
              )}

              {/* View Project button */}
              <button
                type="button"
                className={cn(
                  "mt-auto w-full flex items-center justify-center gap-2",
                  "rounded-md py-2 px-4 text-sm font-semibold",
                  "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]",
                  "text-[var(--color-text-primary)] transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
                tabIndex={-1}
              >
                View Project
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Card footer (visible when not hovered, hidden behind overlay when hovered) ── */}
      <div className="p-3">
        <h3
          className="text-sm font-semibold text-[var(--color-text-primary)] leading-snug line-clamp-1 mb-1"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {project.title}
        </h3>
        {project.technologies.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {project.technologies.slice(0, 3).map((tech) => (
              <span
                key={tech}
                className="text-[10px] font-mono text-[var(--color-text-secondary)]"
              >
                {tech}
                {project.technologies.indexOf(tech) < Math.min(2, project.technologies.length - 1)
                  ? " ·"
                  : ""}
              </span>
            ))}
            {project.technologies.length > 3 && (
              <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">
                +{project.technologies.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}