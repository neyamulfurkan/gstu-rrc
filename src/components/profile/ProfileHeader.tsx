// src/components/profile/ProfileHeader.tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Pencil,
  Github,
  Linkedin,
  Facebook,
  Instagram,
  Globe,
  Twitter,
  Youtube,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
} from "lucide-react";
import useSWR from "swr";

import { cn, formatDate, parseRichText, cloudinaryUrl } from "@/lib/utils";
import { Badge, Skeleton } from "@/components/ui/Feedback";
import type { MemberPublic, MemberPrivate } from "@/types/index";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MemberStats {
  postsCount: number;
  projectsCount: number;
  certificatesCount: number;
  eventsAttended: number;
  createdAt: string | Date;
}

interface ProfileHeaderProps {
  member: MemberPublic | MemberPrivate;
  isOwner: boolean;
  onEditClick?: () => void;
}

// ─── Social Icon Map ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SOCIAL_ICON_MAP: Record<string, any> = {
  github: Github,
  linkedin: Linkedin,
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  website: Globe,
  email: Mail,
};

function getSocialIcon(key: string): React.FC<{ size?: number; className?: string }> {
  const normalized = key.toLowerCase();
  for (const [name, Icon] of Object.entries(SOCIAL_ICON_MAP)) {
    if (normalized.includes(name)) return Icon as React.FC<{ size?: number; className?: string }>;
  }
  return Globe as unknown as React.FC<{ size?: number; className?: string }>;
}

// ─── Stats Fetcher ────────────────────────────────────────────────────────────

const statsFetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
  });

// ─── Stat Item ────────────────────────────────────────────────────────────────

function StatItem({
  value,
  label,
}: {
  value: number | string;
  label: string;
}): JSX.Element {
  return (
    <div className="flex flex-col items-center px-4 py-2">
      <span className="text-xl font-bold text-[var(--color-text-primary)] font-display">
        {value}
      </span>
      <span className="text-xs text-[var(--color-text-secondary)] mt-0.5 whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}

// ─── Stats Skeleton ───────────────────────────────────────────────────────────

function StatsSkeleton(): JSX.Element {
  return (
    <div className="flex items-center divide-x divide-[var(--color-border)] mt-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex flex-col items-center px-4 py-2 gap-1">
          <Skeleton width={32} height={24} rounded="sm" />
          <Skeleton width={56} height={12} rounded="sm" />
        </div>
      ))}
    </div>
  );
}

// ─── ProfileHeader ────────────────────────────────────────────────────────────

export function ProfileHeader({
  member,
  isOwner,
  onEditClick,
}: ProfileHeaderProps): JSX.Element {
  const [coverError, setCoverError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const { data: statsData, isLoading: statsLoading } = useSWR<{
    data: MemberStats;
  }>(
    member.id ? `/api/members/${member.id}?select=stats` : null,
    statsFetcher,
    { revalidateOnFocus: false }
  );

  const stats = statsData?.data;

  const hasCover = member.coverUrl && !coverError;
  const hasAvatar = member.avatarUrl && !avatarError;

  const optimizedCover = hasCover
    ? cloudinaryUrl(member.coverUrl, { width: 1200, height: 320 })
    : null;

  const optimizedAvatar = hasAvatar
    ? cloudinaryUrl(member.avatarUrl, { width: 192, height: 192 })
    : null;

  const isDataUri = member.avatarUrl?.startsWith("data:");

  const socialEntries = Object.entries(member.socialLinks ?? {}).filter(
    ([, url]) => typeof url === "string" && url.trim().length > 0
  );

  const bio = member.bio ? parseRichText(member.bio as unknown as Record<string, unknown>) : null;

  return (
    <div className="rounded-xl overflow-hidden bg-[var(--color-bg-surface)] border border-[var(--color-border)] shadow-[0_4px_24px_rgba(0,0,0,0.4)] mt-4">
      {/* ── Cover Banner ────────────────────────────────────────────────── */}
      <div className="relative h-48 w-full bg-[var(--color-bg-elevated)]">
        {hasCover && optimizedCover ? (
          <Image
            src={optimizedCover}
            alt={`${member.fullName}'s cover photo`}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 800px"
            onError={() => setCoverError(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary)]/20 to-[var(--color-accent)]/20" />
        )}

        {/* Overlay gradient for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-surface)]/60 to-transparent" />

        {/* Edit Profile button — top right, below navbar */}
        {isOwner && onEditClick && (
          <button
            type="button"
            onClick={onEditClick}
            aria-label="Edit profile"
            className={cn(
              "absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5",
              "rounded-md text-sm font-medium",
              "bg-[var(--color-bg-overlay)] backdrop-blur-sm",
              "border border-[var(--color-border)]",
              "text-[var(--color-text-primary)]",
              "hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            )}
          >
            <Pencil size={14} aria-hidden="true" />
            <span>Edit Profile</span>
          </button>
        )}

        {/* Avatar — overlapping bottom edge of cover */}
        <div className="absolute -bottom-12 left-6 sm:left-8">
          <div className="relative w-24 h-24 rounded-full border-4 border-[var(--color-bg-surface)] overflow-hidden bg-[var(--color-bg-elevated)] shadow-lg">
            {hasAvatar && optimizedAvatar ? (
              <Image
                src={optimizedAvatar}
                alt={member.fullName}
                fill
                className="object-cover"
                sizes="96px"
                unoptimized={isDataUri}
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div
                className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-white"
                style={{
                  background: `linear-gradient(135deg, var(--color-primary), var(--color-accent))`,
                }}
                aria-hidden="true"
              >
                {member.fullName
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w) => w[0].toUpperCase())
                  .join("")}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Content Area ────────────────────────────────────────────────── */}
      <div className="pt-16 pb-6 px-6 sm:px-8">
        {/* Name + Role + Department row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-display font-bold text-[var(--color-text-primary)] leading-tight truncate">
              {member.fullName}
            </h1>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              {/* Role badge with dynamic color */}
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
                style={{
                  color: member.role.color,
                  borderColor: `${member.role.color}40`,
                  backgroundColor: `${member.role.color}15`,
                }}
              >
                {member.role.name}
              </span>

              {/* Member type badge */}
              {member.memberType === "alumni" && (
                <Badge variant="accent" size="sm">
                  Alumni
                </Badge>
              )}
            </div>

            {/* Department + Session */}
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-[var(--color-text-secondary)]">
              <span className="flex items-center gap-1">
                <Briefcase size={13} aria-hidden="true" className="flex-shrink-0" />
                {member.department.name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={13} aria-hidden="true" className="flex-shrink-0" />
                Session {member.session}
              </span>
              {(member as MemberPublic).workplace && (
                <span className="flex items-center gap-1">
                  <MapPin size={13} aria-hidden="true" className="flex-shrink-0" />
                  {(member as MemberPublic).workplace}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Stats Row ──────────────────────────────────────────────────── */}
        {statsLoading ? (
          <StatsSkeleton />
        ) : stats ? (
          <div
            className={cn(
              "flex flex-wrap items-stretch mt-4",
              "divide-x divide-[var(--color-border)]",
              "border border-[var(--color-border)] rounded-lg overflow-hidden",
              "bg-[var(--color-bg-elevated)]"
            )}
          >
            <StatItem value={stats.postsCount} label="Posts" />
            <StatItem value={stats.projectsCount} label="Projects" />
            <StatItem value={stats.certificatesCount} label="Certificates" />
            <StatItem value={stats.eventsAttended} label="Events" />
          </div>
        ) : null}

        {/* ── Bio ────────────────────────────────────────────────────────── */}
        {bio && (
          <p className="mt-4 text-sm text-[var(--color-text-secondary)] leading-relaxed line-clamp-3">
            {bio}
          </p>
        )}

        {/* ── Skills ─────────────────────────────────────────────────────── */}
        {member.skills && member.skills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {member.skills.map((skill) => (
              <Badge key={skill} variant="accent" size="sm">
                {skill}
              </Badge>
            ))}
          </div>
        )}

        {/* ── Social Links ───────────────────────────────────────────────── */}
        {socialEntries.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {socialEntries.map(([key, url]) => {
              const Icon = getSocialIcon(key);
              return (
                <a
                  key={key}
                  href={url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${member.fullName} on ${key}`}
                  className={cn(
                    "inline-flex items-center justify-center w-8 h-8 rounded-md",
                    "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
                    "text-[var(--color-text-secondary)]",
                    "hover:text-[var(--color-accent)] hover:border-[var(--color-border-accent)]",
                    "transition-colors duration-150",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  )}
                >
                  <Icon size={15} />
                </a>
              );
            })}
          </div>
        )}

        {/* ── Member Since ───────────────────────────────────────────────── */}
        <p className="mt-4 text-xs text-[var(--color-text-secondary)]">
          Member since{" "}
          <time
            dateTime={
              member.createdAt instanceof Date
                ? member.createdAt.toISOString()
                : member.createdAt
            }
          >
            {formatDate(member.createdAt, "short")}
          </time>
        </p>
      </div>
    </div>
  );
}