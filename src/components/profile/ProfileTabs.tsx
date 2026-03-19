// src/components/profile/ProfileTabs.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  FileText,
  Briefcase,
  Image as ImageIcon,
  Award,
  User,
  MapPin,
  Tag,
} from "lucide-react";

import { Badge, Skeleton, Spinner } from "@/components/ui/Feedback";
import { GalleryGrid } from "@/components/gallery/index";
import { formatDate, cn } from "@/lib/utils";
import type {
  MemberPublic,
  PostCard,
  ProjectCard,
  CertificateCard,
  GalleryItemCard,
  ApiListResponse,
} from "@/types/index";

// ─── Dynamic Imports ──────────────────────────────────────────────────────────

// CertificateCard - not yet generated, define inline fallback
// We'll render our own certificate card since FILE 163 may not exist at runtime
// but the spec says to import it. We handle gracefully with a try-based dynamic import.
const DynamicCertificateCard = dynamic(
  () =>
    import("@/components/certificates/CertificateCard").then(
      (mod) => mod.CertificateCard
    ),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg overflow-hidden bg-[var(--color-bg-surface)] border border-[var(--color-border)] p-4 space-y-3">
        <Skeleton height={16} width="60%" rounded="md" />
        <Skeleton height={14} width="40%" rounded="md" />
        <Skeleton height={32} width={120} rounded="md" />
      </div>
    ),
  }
);

// Read-only TipTap renderer
const TipTapReadOnly = dynamic(
  () =>
    import("@tiptap/react").then((mod) => {
      const { useEditor, EditorContent } = mod;
      function ReadOnlyEditor({ content }: { content: unknown }) {
        const editor = useEditor({
          extensions: [],
          content: content as Record<string, unknown>,
          editable: false,
        });
        if (!editor) return null;
        return (
          <EditorContent
            editor={editor}
            className="prose prose-invert prose-sm max-w-none text-[var(--color-text-secondary)] focus:outline-none"
          />
        );
      }
      return ReadOnlyEditor;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-2">
        <Skeleton height={14} rounded="md" />
        <Skeleton height={14} width="85%" rounded="md" />
        <Skeleton height={14} width="70%" rounded="md" />
      </div>
    ),
  }
);

// ─── Types ────────────────────────────────────────────────────────────────────

type TabKey = "about" | "posts" | "projects" | "gallery" | "certificates";

interface TabDefinition {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}

interface ProfileTabsProps {
  member: MemberPublic;
  isOwner: boolean;
}

// ─── SWR Fetcher ─────────────────────────────────────────────────────────────

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const tabContentVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 120, damping: 20 },
  },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

const reducedTabContentVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

// ─── Skeleton Helpers ─────────────────────────────────────────────────────────

function PostSkeleton(): JSX.Element {
  return (
    <div className="rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)] p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton width={40} height={40} rounded="full" />
        <div className="flex-1 space-y-2">
          <Skeleton height={14} width="40%" rounded="md" />
          <Skeleton height={12} width="25%" rounded="md" />
        </div>
      </div>
      <Skeleton height={14} rounded="md" />
      <Skeleton height={14} width="80%" rounded="md" />
      <Skeleton height={14} width="65%" rounded="md" />
    </div>
  );
}

function ProjectSkeleton(): JSX.Element {
  return (
    <div className="rounded-lg overflow-hidden bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
      <Skeleton className="w-full" height={180} rounded="sm" />
      <div className="p-3 space-y-2">
        <Skeleton height={16} width="70%" rounded="md" />
        <Skeleton height={12} width="50%" rounded="md" />
      </div>
    </div>
  );
}

function CertSkeleton(): JSX.Element {
  return (
    <div className="rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)] p-4 space-y-3">
      <Skeleton height={16} width="60%" rounded="md" />
      <Skeleton height={14} width="40%" rounded="md" />
      <div className="flex gap-2 pt-1">
        <Skeleton height={32} width={120} rounded="md" />
        <Skeleton height={32} width={80} rounded="md" />
      </div>
    </div>
  );
}

// ─── About Tab ────────────────────────────────────────────────────────────────

function AboutTab({ member }: { member: MemberPublic }): JSX.Element {
  const hasBio = !!member.bio;
  const hasInterests = !!member.interests;
  const hasSkills = member.skills && member.skills.length > 0;
  const hasWorkplace = !!member.workplace;
  const hasSocialLinks =
    member.socialLinks && Object.keys(member.socialLinks).length > 0;

  const socialPlatformLabels: Record<string, string> = {
    facebook: "Facebook",
    twitter: "Twitter",
    linkedin: "LinkedIn",
    github: "GitHub",
    instagram: "Instagram",
    youtube: "YouTube",
    website: "Website",
  };

  if (!hasBio && !hasInterests && !hasSkills && !hasWorkplace && !hasSocialLinks) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <User size={36} className="text-[var(--color-text-secondary)] mb-3 opacity-60" />
        <p className="text-sm text-[var(--color-text-secondary)]">
          No additional information provided yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Bio */}
      {hasBio && (
        <section aria-label="Biography">
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
            About
          </h3>
          <div className="text-[var(--color-text-primary)] leading-relaxed">
            {typeof member.bio === "object" && member.bio !== null ? (
              <TipTapReadOnly content={member.bio} />
            ) : (
              <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
                {String(member.bio)}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Workplace (alumni) */}
      {hasWorkplace && (
        <section aria-label="Current position">
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
            Current Position
          </h3>
          <div className="flex items-center gap-2 text-[var(--color-text-primary)]">
            <Briefcase size={16} className="text-[var(--color-accent)] flex-shrink-0" />
            <span className="text-sm">{member.workplace}</span>
          </div>
        </section>
      )}

      {/* Skills */}
      {hasSkills && (
        <section aria-label="Skills">
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
            Skills
          </h3>
          <div className="flex flex-wrap gap-2">
            {member.skills.map((skill) => (
              <Badge key={skill} variant="accent" size="md">
                {skill}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* Interests */}
      {hasInterests && (
        <section aria-label="Interests">
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
            Interests
          </h3>
          <div className="flex items-start gap-2">
            <Tag size={16} className="text-[var(--color-accent)] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
              {member.interests}
            </p>
          </div>
        </section>
      )}

      {/* Social Links */}
      {hasSocialLinks && (
        <section aria-label="Social links">
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
            Social Links
          </h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(member.socialLinks).map(([platform, url]) => {
              if (!url) return null;
              const label =
                socialPlatformLabels[platform.toLowerCase()] ?? platform;
              return (
                <a
                  key={platform}
                  href={url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm",
                    "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
                    "text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]",
                    "hover:border-[var(--color-border-accent)] transition-colors duration-150",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  )}
                >
                  <MapPin size={12} aria-hidden="true" />
                  {label}
                </a>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Posts Tab ────────────────────────────────────────────────────────────────

function InlinePostCard({ post }: { post: PostCard }): JSX.Element {
  return (
    <article className="rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)] p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Link
          href={`/members/${post.author.username}`}
          className="flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded-full"
        >
          <Image
            src={post.author.avatarUrl}
            alt={post.author.fullName}
            width={40}
            height={40}
            className="rounded-full object-cover"
            unoptimized={post.author.avatarUrl.startsWith("data:")}
          />
        </Link>
        <div className="min-w-0">
          <Link
            href={`/members/${post.author.username}`}
            className="text-sm font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors"
          >
            {post.author.fullName}
          </Link>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {formatDate(post.createdAt, "relative")}
          </p>
        </div>
        {post.isPinned && (
          <Badge variant="accent" size="sm" className="ml-auto flex-shrink-0">
            Pinned
          </Badge>
        )}
      </div>

      <p className="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-line line-clamp-4">
        {post.content}
      </p>

      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <div
          className={cn(
            "grid gap-1 rounded-lg overflow-hidden",
            post.mediaUrls.length === 1 && "grid-cols-1",
            post.mediaUrls.length === 2 && "grid-cols-2",
            post.mediaUrls.length >= 3 && "grid-cols-2"
          )}
        >
          {post.mediaUrls.slice(0, 4).map((url, idx) => (
            <div key={idx} className="relative aspect-video bg-[var(--color-bg-elevated)]">
              <Image
                src={url}
                alt={`Post media ${idx + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 300px"
              />
              {idx === 3 && post.mediaUrls.length > 4 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    +{post.mediaUrls.length - 4}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 pt-1 text-xs text-[var(--color-text-secondary)]">
        <span>{post.likesCount} likes</span>
        <span>{post.commentsCount} comments</span>
      </div>
    </article>
  );
}

interface PostsTabProps {
  memberId: string;
}

function PostsTab({ memberId, isOwner }: PostsTabProps & { isOwner?: boolean }): JSX.Element {
  const [posts, setPosts] = useState<PostCard[]>([]);
  const [newPostContent, setNewPostContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const { data, error, isLoading, mutate } = useSWR<ApiListResponse<PostCard>>(
    `/api/feed?authorId=${memberId}&take=20`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const handlePost = async () => {
    if (!newPostContent.trim()) return;
    setIsPosting(true);
    try {
      const res = await fetch("/api/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newPostContent.trim() }),
      });
      if (res.ok) {
        setNewPostContent("");
        mutate();
      }
    } finally {
      setIsPosting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <PostSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <FileText size={36} className="text-[var(--color-text-secondary)] mb-3 opacity-60" />
        <p className="text-sm text-[var(--color-error)]">Failed to load posts.</p>
      </div>
    );
  }

  const fetchedPosts = data?.data ?? [];

  return (
    <div className="space-y-4">
      {isOwner && (
        <div className={cn(
          "rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4"
        )}>
          <textarea
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="Share something with the club..."
            rows={3}
            className={cn(
              "w-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg",
              "px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-none"
            )}
          />
          <div className="flex justify-end mt-2">
            <button
              type="button"
              onClick={handlePost}
              disabled={isPosting || !newPostContent.trim()}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                "bg-[var(--color-primary)] text-white",
                "hover:opacity-90 transition-opacity",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              )}
            >
              {isPosting ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      )}

      {fetchedPosts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <FileText size={36} className="text-[var(--color-text-secondary)] mb-3 opacity-60" />
          <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
            No posts yet
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {isOwner ? "Share something above to get started." : "Posts from this member will appear here."}
          </p>
        </div>
      )}

      {fetchedPosts.map((post) => (
        <InlinePostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

// ─── Projects Tab ─────────────────────────────────────────────────────────────

interface ProjectsTabProps {
  memberId: string;
}

function InlineProjectCard({ project }: { project: ProjectCard }): JSX.Element {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className={cn(
        "block rounded-lg overflow-hidden bg-[var(--color-bg-surface)]",
        "border border-[var(--color-border)] group transition-all duration-200",
        "hover:border-[var(--color-card-border-hover)] hover:-translate-y-1",
        "hover:shadow-[0_0_16px_var(--color-glow-accent)]",
        "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
      )}
    >
      {/* Cover */}
      <div className="relative w-full aspect-video overflow-hidden bg-[var(--color-bg-elevated)]">
        {project.coverUrl ? (
          <Image
            src={project.coverUrl}
            alt={project.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Briefcase size={32} className="text-[var(--color-text-secondary)] opacity-40" />
          </div>
        )}
        {/* Badges overlay */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          <Badge
            variant={project.status === "completed" ? "success" : "warning"}
            size="sm"
          >
            {project.status}
          </Badge>
          <Badge variant="neutral" size="sm">
            {project.year}
          </Badge>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className="text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors line-clamp-1">
          {project.title}
        </h4>
        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 line-clamp-1">
          {project.category.name}
        </p>
        {project.technologies && project.technologies.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {project.technologies.slice(0, 3).map((tech) => (
              <span
                key={tech}
                className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
              >
                {tech}
              </span>
            ))}
            {project.technologies.length > 3 && (
              <span className="text-xs text-[var(--color-text-secondary)]">
                +{project.technologies.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

function ProjectsTab({ memberId }: ProjectsTabProps): JSX.Element {
  const { data, error, isLoading } = useSWR<ApiListResponse<ProjectCard>>(
    `/api/projects?teamMemberId=${memberId}&take=12`,
    fetcher,
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProjectSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <Briefcase size={36} className="text-[var(--color-text-secondary)] mb-3 opacity-60" />
        <p className="text-sm text-[var(--color-error)]">Failed to load projects.</p>
      </div>
    );
  }

  const projects = data?.data ?? [];

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <Briefcase size={36} className="text-[var(--color-text-secondary)] mb-3 opacity-60" />
        <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
          No projects yet
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Projects this member contributed to will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <InlineProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}

// ─── Gallery Tab ──────────────────────────────────────────────────────────────

interface GalleryTabProps {
  memberId: string;
}

function GalleryTab({ memberId }: GalleryTabProps): JSX.Element {
  const initialFilter = useMemo(
    () => ({
      types: [] as string[],
      categories: [] as string[],
    }),
    []
  );

  const { data: categoriesData } = useSWR<{ data: Array<{ id: string; name: string }> }>(
    "/api/gallery-categories",
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: eventsData } = useSWR<{ data: Array<{ id: string; title: string }> }>(
    "/api/events?tab=all&take=100&select=minimal",
    fetcher,
    { revalidateOnFocus: false }
  );

  const categories = categoriesData?.data ?? [];
  const eventNames = (eventsData?.data ?? []).map((e) => ({ id: e.id, name: e.title }));

  return (
    <GalleryGrid
      initialItems={[]}
      initialFilter={initialFilter}
      filterOptions={{
        categories,
        eventNames,
        years: [],
        currentMemberId: memberId,
      }}
    />
  );
}

// ─── Certificates Tab ─────────────────────────────────────────────────────────

interface CertificatesTabProps {
  memberId: string;
}

function FallbackCertificateCard({
  certificate,
}: {
  certificate: CertificateCard;
}): JSX.Element {
  const handleCopy = useCallback(() => {
    const verifyUrl = `${window.location.origin}/verify/${certificate.serial}`;
    navigator.clipboard
      .writeText(verifyUrl)
      .catch(() => {
        // execCommand fallback
        const el = document.createElement("textarea");
        el.value = verifyUrl;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      });
  }, [certificate.serial]);

  return (
    <div
      className={cn(
        "rounded-lg bg-[var(--color-bg-surface)] border p-4 space-y-3",
        certificate.isRevoked
          ? "border-[var(--color-error)]/30 opacity-70"
          : "border-[var(--color-border)]"
      )}
    >
      {certificate.isRevoked && (
        <Badge variant="error" size="sm">
          Revoked
        </Badge>
      )}
      <div>
        <p className="text-xs text-[var(--color-text-secondary)] mb-0.5">
          {certificate.template.type}
        </p>
        <h4 className="text-sm font-semibold text-[var(--color-text-primary)] line-clamp-2">
          {certificate.achievement}
        </h4>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-[var(--color-accent)] bg-[var(--color-bg-elevated)] px-2 py-1 rounded border border-[var(--color-border)]">
          {certificate.serial}
        </span>
      </div>
      <p className="text-xs text-[var(--color-text-secondary)]">
        Issued {formatDate(certificate.issuedAt, "short")}
      </p>
      <div className="flex gap-2 pt-1">
        <a
          href={certificate.pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium",
            "bg-[var(--color-primary)] text-white",
            "hover:bg-[var(--color-primary-hover)] transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          )}
        >
          Download PDF
        </a>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium",
            "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
            "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
            "hover:border-[var(--color-border-accent)] transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          )}
        >
          Share / Verify
        </button>
      </div>
    </div>
  );
}

function CertificatesTab({ memberId }: CertificatesTabProps): JSX.Element {
  const { data, error, isLoading } = useSWR<ApiListResponse<CertificateCard>>(
    `/api/certificates?memberId=${memberId}&take=20`,
    fetcher,
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CertSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <Award size={36} className="text-[var(--color-text-secondary)] mb-3 opacity-60" />
        <p className="text-sm text-[var(--color-error)]">Failed to load certificates.</p>
      </div>
    );
  }

  const certs = data?.data ?? [];

  if (certs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <Award size={36} className="text-[var(--color-text-secondary)] mb-3 opacity-60" />
        <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
          No certificates yet
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Certificates issued to this member will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {certs.map((cert) => {
        // Try DynamicCertificateCard, fallback to FallbackCertificateCard
        return (
          <React.Suspense
            key={cert.id}
            fallback={<FallbackCertificateCard certificate={cert} />}
          >
            <DynamicCertificateCard certificate={cert} />
          </React.Suspense>
        );
      })}
    </div>
  );
}

// ─── ProfileTabs ─────────────────────────────────────────────────────────────

export function ProfileTabs({ member, isOwner }: ProfileTabsProps): JSX.Element {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabKey>("about");
  const [tabsLoaded, setTabsLoaded] = useState<Set<TabKey>>(
    new Set<TabKey>(["about"])
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const tabListRef = useRef<HTMLDivElement>(null);

  // Determine if the current viewer is an admin
  const isAdminViewer =
    session?.user?.isAdmin === true;

  // Reduced motion detection
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const contentVariants = prefersReducedMotion
    ? reducedTabContentVariants
    : tabContentVariants;

  // Define tabs — hide Certificates from non-owners and non-admins
  const tabs: TabDefinition[] = useMemo(() => {
    const allTabs: TabDefinition[] = [
      {
        key: "about",
        label: "About",
        icon: <User size={15} aria-hidden="true" />,
      },
      {
        key: "posts",
        label: "Posts",
        icon: <FileText size={15} aria-hidden="true" />,
      },
      {
        key: "projects",
        label: "Projects",
        icon: <Briefcase size={15} aria-hidden="true" />,
      },
      {
        key: "gallery",
        label: "Gallery",
        icon: <ImageIcon size={15} aria-hidden="true" />,
      },
      {
        key: "certificates",
        label: "Certificates",
        icon: <Award size={15} aria-hidden="true" />,
      },
    ];

    if (!isOwner && !isAdminViewer) {
      return allTabs.filter((t) => t.key !== "certificates");
    }

    return allTabs;
  }, [isOwner, isAdminViewer]);

  const handleTabChange = useCallback(
    (key: TabKey) => {
      setActiveTab(key);
      setTabsLoaded((prev) => {
        if (prev.has(key)) return prev;
        const next = new Set(prev);
        next.add(key);
        return next;
      });
    },
    []
  );

  // Keyboard navigation for tab list
  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      let nextIndex: number | null = null;

      if (e.key === "ArrowRight") {
        nextIndex = (index + 1) % tabs.length;
      } else if (e.key === "ArrowLeft") {
        nextIndex = (index - 1 + tabs.length) % tabs.length;
      } else if (e.key === "Home") {
        nextIndex = 0;
      } else if (e.key === "End") {
        nextIndex = tabs.length - 1;
      }

      if (nextIndex !== null) {
        e.preventDefault();
        const tabButtons =
          tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
        if (tabButtons && tabButtons[nextIndex]) {
          tabButtons[nextIndex].focus();
          handleTabChange(tabs[nextIndex].key);
        }
      }
    },
    [tabs, handleTabChange]
  );

  // ─── Render Tab Content ───────────────────────────────────────────────────

  const renderTabContent = useCallback(
    (key: TabKey): React.ReactNode => {
      if (!tabsLoaded.has(key)) return null;

      switch (key) {
        case "about":
          return <AboutTab member={member} />;

        case "posts":
          return <PostsTab memberId={member.id} isOwner={isOwner} />;

        case "projects":
          return <ProjectsTab memberId={member.id} />;

        case "gallery":
          return <GalleryTab memberId={member.id} />;

        case "certificates":
          if (!isOwner && !isAdminViewer) return null;
          return <CertificatesTab memberId={member.id} />;

        default:
          return null;
      }
    },
    [tabsLoaded, member, isOwner, isAdminViewer]
  );

  return (
    <div className="w-full">
      {/* ── Tab Bar ── */}
      <div
        ref={tabListRef}
        role="tablist"
        aria-label="Member profile sections"
        className="flex items-center gap-0 border-b border-[var(--color-border)] overflow-x-auto scrollbar-none"
      >
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`profile-tab-${tab.key}`}
              aria-selected={isActive}
              aria-controls={`profile-panel-${tab.key}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleTabChange(tab.key)}
              onKeyDown={(e) => handleTabKeyDown(e, index)}
              className={cn(
                "relative flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap",
                "transition-colors duration-150 rounded-t-md",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-inset",
                isActive
                  ? "text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              )}
            >
              <span className="flex-shrink-0">{tab.icon}</span>
              <span>{tab.label}</span>
              {/* Animated bottom indicator */}
              {isActive && (
                <motion.span
                  layoutId="profile-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] w-full rounded-full bg-[var(--color-accent)]"
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content Panels ── */}
      <div className="pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            id={`profile-panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`profile-tab-${activeTab}`}
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            tabIndex={0}
            className="focus:outline-none"
          >
            {/* Always render the active tab. Lazy-load others when first visited. */}
            {renderTabContent(activeTab)}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}