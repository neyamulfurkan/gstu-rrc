// src/components/projects/Detail.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import useSWR from "swr";
import Link from "next/link";
import Image from "next/image";
import {
  ExternalLink,
  FileText,
  Github,
  Youtube,
  X,
  Users,
} from "lucide-react";

import { cn, cloudinaryUrl, formatDate, truncateText } from "@/lib/utils";
import { Badge, Skeleton, Spinner } from "@/components/ui/Feedback";
import { Modal } from "@/components/ui/Overlay";
import { Timeline } from "@/components/ui/DataDisplay";
import type { ProjectDetail as ProjectDetailType, GalleryItemCard, MemberPublic } from "@/types/index";

interface TimelineItem {
  date: string;
  title: string;
  description: string;
  imageUrl?: string;
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetcher(url: string): Promise<ProjectDetailType> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`Failed to fetch project: ${res.status} ${text}`);
  }
  const json = await res.json();
  // API wraps response in { data: ... }
  return json.data ?? json;
}

// ─── TipTap Read-Only Renderer ────────────────────────────────────────────────

interface TipTapRendererProps {
  content: unknown;
}

function TipTapRenderer({ content }: TipTapRendererProps): JSX.Element {
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        if (!content || typeof content !== "object") {
          if (!cancelled) {
            setHtml("");
            setLoading(false);
          }
          return;
        }

        // Render TipTap JSON to HTML using a simple recursive approach
        // to avoid @tiptap/html module resolution issues
        function renderNode(node: Record<string, unknown>): string {
          if (!node) return "";
          const children = Array.isArray(node.content)
            ? (node.content as Record<string, unknown>[]).map(renderNode).join("")
            : "";
          const text = typeof node.text === "string"
            ? node.text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
            : "";

          switch (node.type) {
            case "doc": return children;
            case "paragraph": return `<p>${children}</p>`;
            case "text": {
              let out = text;
              const marks = node.marks as Array<{ type: string }> | undefined;
              if (marks) {
                for (const mark of marks) {
                  if (mark.type === "bold") out = `<strong>${out}</strong>`;
                  else if (mark.type === "italic") out = `<em>${out}</em>`;
                  else if (mark.type === "underline") out = `<u>${out}</u>`;
                  else if (mark.type === "code") out = `<code>${out}</code>`;
                }
              }
              return out;
            }
            case "heading": {
              const level = (node.attrs as { level?: number } | undefined)?.level ?? 1;
              return `<h${level}>${children}</h${level}>`;
            }
            case "bulletList": return `<ul>${children}</ul>`;
            case "orderedList": return `<ol>${children}</ol>`;
            case "listItem": return `<li>${children}</li>`;
            case "blockquote": return `<blockquote>${children}</blockquote>`;
            case "codeBlock": return `<pre><code>${children}</code></pre>`;
            case "hardBreak": return "<br/>";
            case "horizontalRule": return "<hr/>";
            default: return children || text;
          }
        }

        const rendered = renderNode(content as Record<string, unknown>);
        if (!cancelled) {
          setHtml(rendered);
          setLoading(false);
        }
      } catch {
        // Fallback: try to extract plain text
        if (!cancelled) {
          setHtml("");
          setLoading(false);
        }
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [content]);

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton height={16} className="w-full" />
        <Skeleton height={16} className="w-5/6" />
        <Skeleton height={16} className="w-4/6" />
      </div>
    );
  }

  if (!html) {
    return (
      <p className="text-sm text-[var(--color-text-secondary)] italic">
        No description available.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "prose prose-sm max-w-none",
        "prose-headings:text-[var(--color-text-primary)] prose-headings:font-[var(--font-heading)]",
        "prose-p:text-[var(--color-text-secondary)] prose-p:leading-relaxed",
        "prose-strong:text-[var(--color-text-primary)]",
        "prose-a:text-[var(--color-accent)] prose-a:no-underline hover:prose-a:underline",
        "prose-ul:text-[var(--color-text-secondary)] prose-ol:text-[var(--color-text-secondary)]",
        "prose-li:marker:text-[var(--color-accent)]",
        "prose-blockquote:border-l-[var(--color-primary)] prose-blockquote:text-[var(--color-text-secondary)]",
        "prose-code:text-[var(--color-accent)] prose-code:bg-[var(--color-bg-elevated)] prose-code:px-1 prose-code:rounded",
        "prose-pre:bg-[var(--color-bg-elevated)] prose-pre:border prose-pre:border-[var(--color-border)]"
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ─── Team Member Avatar Cluster ───────────────────────────────────────────────

interface TeamMemberAvatarProps {
  member: MemberPublic;
}

function TeamMemberAvatar({ member }: TeamMemberAvatarProps): JSX.Element {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <Link
      href={`/members/${member.username}`}
      className="relative group focus:outline-none"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
      aria-label={`View ${member.fullName}'s profile`}
    >
      <div
        className={cn(
          "w-12 h-12 rounded-full overflow-hidden border-2 border-[var(--color-bg-elevated)]",
          "transition-transform duration-200 group-hover:scale-110 group-hover:z-10",
          "focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1"
        )}
      >
        <Image
          src={
            member.avatarUrl
              ? (member.avatarUrl.startsWith("http") ? member.avatarUrl : cloudinaryUrl(member.avatarUrl, { width: 96, height: 96 }))
              : "/placeholder-avatar.png"
          }
          alt={member.fullName}
          width={48}
          height={48}
          className="w-full h-full object-cover"
          unoptimized={member.avatarUrl?.startsWith("data:") ?? false}
        />
      </div>

      {showTooltip && (
        <div
          className={cn(
            "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20",
            "px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap",
            "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
            "border border-[var(--color-border)] shadow-lg pointer-events-none"
          )}
          role="tooltip"
        >
          <div className="font-semibold">{member.fullName}</div>
          {member.role?.name && (
            <div
              className="text-[var(--color-text-secondary)] text-[10px]"
              style={{ color: member.role.color || undefined }}
            >
              {member.role.name}
            </div>
          )}
        </div>
      )}
    </Link>
  );
}

// ─── Gallery Mini Grid ────────────────────────────────────────────────────────

interface GalleryMiniGridProps {
  items: GalleryItemCard[];
}

function GalleryMiniGrid({ items }: GalleryMiniGridProps): JSX.Element | null {
  if (!items || items.length === 0) return null;

  const displayItems = items.slice(0, 6);

  return (
    <div
      className="columns-2 sm:columns-3 gap-2"
      style={{ columnGap: "8px" }}
    >
      {displayItems.map((item) => (
        <div
          key={item.id}
          className={cn(
            "relative break-inside-avoid mb-2 overflow-hidden rounded-lg",
            "bg-[var(--color-bg-elevated)] group cursor-pointer"
          )}
        >
          {item.type === "video" ? (
            <div className="relative aspect-video bg-[var(--color-bg-elevated)] flex items-center justify-center">
              <Youtube
                size={28}
                className="text-[var(--color-text-secondary)]"
                aria-hidden="true"
              />
              {item.title && (
                <p className="absolute bottom-0 left-0 right-0 px-2 py-1 text-xs text-white bg-black/60 truncate">
                  {item.title}
                </p>
              )}
            </div>
          ) : (
            <div className="relative">
              <Image
                src={cloudinaryUrl(item.url, { width: 400 })}
                alt={item.altText || item.title || "Gallery image"}
                width={400}
                height={300}
                className={cn(
                  "w-full h-auto object-cover",
                  "transition-transform duration-300 group-hover:scale-105"
                )}
              />
              <div
                className={cn(
                  "absolute inset-0 bg-black/0 group-hover:bg-black/30",
                  "transition-colors duration-200"
                )}
                aria-hidden="true"
              />
              {item.title && (
                <p className="absolute bottom-0 left-0 right-0 px-2 py-1 text-xs text-white bg-gradient-to-t from-black/80 to-transparent truncate opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {item.title}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton Layout ──────────────────────────────────────────────────────────

function ProjectDetailSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <Skeleton className="w-full rounded-none" height={320} />

      <div className="p-6 space-y-6">
        {/* Title + badges */}
        <div className="space-y-3">
          <Skeleton height={32} className="w-2/3" />
          <div className="flex gap-2">
            <Skeleton height={22} width={80} rounded="full" />
            <Skeleton height={22} width={100} rounded="full" />
            <Skeleton height={22} width={60} rounded="full" />
          </div>
        </div>

        {/* Team members */}
        <div>
          <Skeleton height={14} width={100} className="mb-3" />
          <div className="flex gap-1">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} width={48} height={48} rounded="full" />
            ))}
          </div>
        </div>

        {/* Technologies */}
        <div>
          <Skeleton height={14} width={120} className="mb-3" />
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height={24} width={80} rounded="full" />
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Skeleton height={14} className="w-full" />
          <Skeleton height={14} className="w-5/6" />
          <Skeleton height={14} className="w-4/6" />
          <Skeleton height={14} className="w-full" />
        </div>
      </div>
    </div>
  );
}

// ─── Status Config ────────────────────────────────────────────────────────────

function getStatusVariant(status: string): "success" | "warning" | "neutral" {
  switch (status.toLowerCase()) {
    case "completed":
      return "success";
    case "ongoing":
      return "warning";
    default:
      return "neutral";
  }
}

// ─── Project Detail Content ───────────────────────────────────────────────────

interface ProjectDetailContentProps {
  project: ProjectDetailType;
  onClose?: () => void;
  standalone?: boolean;
}

function ProjectDetailContent({
  project,
  onClose,
  standalone,
}: ProjectDetailContentProps): JSX.Element {
  const timelineItems: TimelineItem[] = (project.milestones ?? []).map((m) => ({
    date: m.date,
    title: m.title,
    description: m.description,
  }));

  const hasExternalLinks =
    project.githubUrl ||
    project.demoUrl ||
    project.reportUrl ||
    project.youtubeUrl;

  const hasGallery = project.galleryItems && project.galleryItems.length > 0;
  const hasMilestones = timelineItems.length > 0;
  const hasTeam = project.teamMembers && project.teamMembers.length > 0;
  const hasTechnologies = project.technologies && project.technologies.length > 0;

  return (
    <article className="flex flex-col min-h-0">
      {/* Hero Image */}
      {project.coverUrl && (
        <div className="relative w-full h-64 sm:h-80 shrink-0 bg-[var(--color-bg-elevated)] overflow-hidden">
          <Image
            src={cloudinaryUrl(project.coverUrl, { width: 800, height: 320 })}
            alt={project.title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 800px"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-base)]/80 via-transparent to-transparent"
            aria-hidden="true"
          />

          {/* Close button for non-standalone */}
          {!standalone && onClose && (
            <button
              onClick={onClose}
              aria-label="Close project detail"
              className={cn(
                "absolute top-4 right-4 z-10 p-2 rounded-full",
                "bg-black/50 text-white hover:bg-black/70",
                "focus:outline-none focus:ring-2 focus:ring-white/50",
                "transition-colors duration-150"
              )}
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-8">
          {/* Title and Meta */}
          <div className="space-y-3">
            <h1
              className={cn(
                "text-2xl sm:text-3xl font-bold leading-tight",
                "text-[var(--color-text-primary)] font-[var(--font-display)]"
              )}
            >
              {project.title}
            </h1>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getStatusVariant(project.status)} size="md">
                {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
              </Badge>

              {project.category?.name && (
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
                  style={{
                    color: project.category.color || "var(--color-text-secondary)",
                    borderColor: project.category.color
                      ? `${project.category.color}40`
                      : "var(--color-border)",
                    backgroundColor: project.category.color
                      ? `${project.category.color}15`
                      : "var(--color-bg-elevated)",
                  }}
                >
                  {project.category.name}
                </span>
              )}

              {project.year && (
                <span
                  className={cn(
                    "text-xs font-semibold tracking-wider uppercase",
                    "text-[var(--color-text-secondary)] font-[var(--font-mono)]"
                  )}
                >
                  {project.year}
                </span>
              )}
            </div>
          </div>

          {/* Team Members */}
          {hasTeam && (
            <section aria-labelledby="team-heading">
              <h2
                id="team-heading"
                className={cn(
                  "text-xs font-semibold uppercase tracking-wider mb-3",
                  "text-[var(--color-text-secondary)]"
                )}
              >
                <Users
                  size={12}
                  className="inline mr-1.5"
                  aria-hidden="true"
                />
                Team Members
              </h2>

              <div className="flex flex-wrap items-center gap-1">
                {project.teamMembers.map((member, idx) => (
                  <div
                    key={member.id}
                    className="relative"
                    style={{ zIndex: project.teamMembers.length - idx }}
                  >
                    <TeamMemberAvatar member={member} />
                  </div>
                ))}
              </div>

              {/* Team names list for accessibility */}
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Team member names">
                {project.teamMembers.map((member) => (
                  <li key={member.id}>
                    <Link
                      href={`/members/${member.username}`}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs",
                        "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]",
                        "hover:text-[var(--color-accent)] hover:bg-[var(--color-bg-surface)]",
                        "border border-[var(--color-border)] transition-colors duration-150",
                        "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                      )}
                    >
                      <span
                        className="font-medium text-[var(--color-text-primary)]"
                      >
                        {member.fullName}
                      </span>
                      {member.role?.name && (
                        <span
                          className="text-[10px]"
                          style={{ color: member.role.color || undefined }}
                        >
                          {member.role.name}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Technologies */}
          {hasTechnologies && (
            <section aria-labelledby="tech-heading">
              <h2
                id="tech-heading"
                className={cn(
                  "text-xs font-semibold uppercase tracking-wider mb-3",
                  "text-[var(--color-text-secondary)]"
                )}
              >
                Technologies
              </h2>
              <div className="flex flex-wrap gap-2" role="list">
                {project.technologies.map((tech) => (
                  <div key={tech} role="listitem">
                    <Badge variant="accent" size="sm">
                      {tech}
                    </Badge>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Description */}
          {project.description && (
            <section aria-labelledby="desc-heading">
              <h2
                id="desc-heading"
                className={cn(
                  "text-xs font-semibold uppercase tracking-wider mb-3",
                  "text-[var(--color-text-secondary)]"
                )}
              >
                About This Project
              </h2>
              <TipTapRenderer content={project.description} />
            </section>
          )}

          {/* External Links */}
          {hasExternalLinks && (
            <section aria-labelledby="links-heading">
              <h2
                id="links-heading"
                className={cn(
                  "text-xs font-semibold uppercase tracking-wider mb-3",
                  "text-[var(--color-text-secondary)]"
                )}
              >
                Resources
              </h2>
              <div className="flex flex-wrap gap-3">
                {project.githubUrl && (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                      "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
                      "border border-[var(--color-border)]",
                      "hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]",
                      "transition-colors duration-150",
                      "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    )}
                  >
                    <Github size={16} aria-hidden="true" />
                    GitHub
                  </a>
                )}

                {project.demoUrl && (
                  <a
                    href={project.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                      "bg-[var(--color-primary)] text-white",
                      "hover:opacity-90 transition-opacity duration-150",
                      "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1"
                    )}
                  >
                    <ExternalLink size={16} aria-hidden="true" />
                    Live Demo
                  </a>
                )}

                {project.reportUrl && (
                  <a
                    href={project.reportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                      "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
                      "border border-[var(--color-border)]",
                      "hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]",
                      "transition-colors duration-150",
                      "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    )}
                  >
                    <FileText size={16} aria-hidden="true" />
                    Report
                  </a>
                )}

                {project.youtubeUrl && (
                  <a
                    href={project.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                      "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
                      "border border-[var(--color-border)]",
                      "hover:border-red-500/40 hover:text-red-500",
                      "transition-colors duration-150",
                      "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    )}
                  >
                    <Youtube size={16} aria-hidden="true" />
                    Watch Video
                  </a>
                )}
              </div>
            </section>
          )}

          {/* Gallery */}
          {hasGallery && (
            <section aria-labelledby="gallery-heading">
              <h2
                id="gallery-heading"
                className={cn(
                  "text-xs font-semibold uppercase tracking-wider mb-3",
                  "text-[var(--color-text-secondary)]"
                )}
              >
                Gallery
              </h2>
              <GalleryMiniGrid items={project.galleryItems} />
            </section>
          )}

          {/* Milestones */}
          {hasMilestones && (
            <section aria-labelledby="milestones-heading">
              <h2
                id="milestones-heading"
                className={cn(
                  "text-xs font-semibold uppercase tracking-wider mb-6",
                  "text-[var(--color-text-secondary)]"
                )}
              >
                Project Milestones
              </h2>
              <Timeline items={timelineItems} />
            </section>
          )}

          {/* Bottom padding for standalone */}
          {standalone && <div className="h-8" aria-hidden="true" />}
        </div>
      </div>
    </article>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

interface ProjectDetailProps {
  projectId: string;
  onClose?: () => void;
  standalone?: boolean;
}

export function ProjectDetail({
  projectId,
  onClose,
  standalone = false,
}: ProjectDetailProps): JSX.Element {
  const { data: project, error, isLoading } = useSWR<ProjectDetailType>(
    projectId ? `/api/projects/${projectId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  // ── Standalone mode: render without Modal wrapper ──────────────────────────
  if (standalone) {
    if (isLoading) {
      return (
        <div
          className="max-w-4xl mx-auto bg-[var(--color-bg-surface)] rounded-2xl overflow-hidden border border-[var(--color-border)]"
          aria-busy="true"
          aria-label="Loading project details"
        >
          <ProjectDetailSkeleton />
        </div>
      );
    }

    if (error || !project) {
      return (
        <div
          className="max-w-4xl mx-auto flex flex-col items-center justify-center py-20 px-6 text-center"
          role="alert"
        >
          <div
            className="w-16 h-16 rounded-full bg-[var(--color-error)]/10 flex items-center justify-center mb-4"
            aria-hidden="true"
          >
            <X size={28} className="text-[var(--color-error)]" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Project not found
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] max-w-xs">
            This project could not be loaded. It may have been removed or is not
            publicly available.
          </p>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto bg-[var(--color-bg-surface)] rounded-2xl overflow-hidden border border-[var(--color-border)]">
        <ProjectDetailContent
          project={project}
          onClose={handleClose}
          standalone={true}
        />
      </div>
    );
  }

  // ── Modal mode ─────────────────────────────────────────────────────────────
  return (
    <Modal
      isOpen={!!projectId}
      onClose={handleClose}
      size="xl"
      showCloseButton={false}
      className="!p-0 overflow-hidden"
    >
      {isLoading && (
        <div aria-busy="true" aria-label="Loading project details">
          <ProjectDetailSkeleton />
        </div>
      )}

      {!isLoading && (error || !project) && (
        <div
          className="flex flex-col items-center justify-center py-20 px-6 text-center"
          role="alert"
        >
          <div
            className="w-16 h-16 rounded-full bg-[var(--color-error)]/10 flex items-center justify-center mb-4"
            aria-hidden="true"
          >
            <X size={28} className="text-[var(--color-error)]" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Project not found
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] max-w-xs mb-6">
            This project could not be loaded. It may have been removed or is not
            publicly available.
          </p>
          <button
            onClick={handleClose}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium",
              "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
              "border border-[var(--color-border)] hover:border-[var(--color-accent)]/40",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            )}
          >
            Close
          </button>
        </div>
      )}

      {!isLoading && project && (
        <ProjectDetailContent
          project={project}
          onClose={handleClose}
          standalone={false}
        />
      )}
    </Modal>
  );
}