// src/components/feed/FeedSidebars.tsx
"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import {
  Calendar,
  Clock,
  LogIn,
  MapPin,
  Users,
  Award,
  FileText,
  ExternalLink,
  UserPlus,
} from "lucide-react";

import { formatDate, cloudinaryUrl, cn, generateInitialsAvatar } from "@/lib/utils";
import { Badge, Skeleton } from "@/components/ui/Feedback";
import type { MemberPublic, EventCard, ApiListResponse } from "@/types/index";

// ─── Fetcher ──────────────────────────────────────────────────────────────────

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Fetch failed");
    return res.json();
  });

// ─── MemberStats shape returned by /api/members/[id]?select=stats ─────────────

interface MemberStats {
  postsCount: number;
  eventsAttended: number;
  certificatesCount: number;
}

// ─── Avatar helper ────────────────────────────────────────────────────────────

function MemberAvatar({
  member,
  size = 32,
  className,
}: {
  member: Pick<MemberPublic, "avatarUrl" | "fullName" | "username">;
  size?: number;
  className?: string;
}): JSX.Element {
  const src =
    member.avatarUrl && member.avatarUrl.startsWith("data:")
      ? member.avatarUrl
      : member.avatarUrl
      ? cloudinaryUrl(member.avatarUrl, { width: size * 2 })
      : generateInitialsAvatar(member.fullName);

  return (
    <div
      className={cn(
        "relative flex-shrink-0 rounded-full overflow-hidden bg-[var(--color-bg-elevated)]",
        className
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={src}
          alt={member.fullName}
          fill
          sizes={`${size}px`}
          className="object-cover"
          unoptimized={src.startsWith("data:")}
        />
      ) : (
        <span
          className="flex items-center justify-center w-full h-full text-[var(--color-text-secondary)] text-xs font-bold"
          aria-hidden="true"
        >
          {member.fullName.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

// ─── Countdown helper ─────────────────────────────────────────────────────────

function useCountdown(targetDate: Date | string): string {
  const [label, setLabel] = React.useState("");

  React.useEffect(() => {
    function compute() {
      const target = new Date(targetDate).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setLabel("Started");
        return;
      }

      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);

      if (days > 0) {
        setLabel(`${days}d ${hours}h`);
      } else {
        const mins = Math.floor((diff % 3600000) / 60000);
        setLabel(`${hours}h ${mins}m`);
      }
    }

    compute();
    const id = setInterval(compute, 60000);
    return () => clearInterval(id);
  }, [targetDate]);

  return label;
}

// ─── Small event card used in right sidebar ───────────────────────────────────

function SidebarEventCard({ event }: { event: EventCard }): JSX.Element {
  const countdown = useCountdown(event.startDate);

  return (
    <Link
      href={`/events/${event.slug}`}
      className={cn(
        "flex gap-3 items-start p-2.5 rounded-lg",
        "hover:bg-[var(--color-bg-elevated)] transition-colors group"
      )}
    >
      {/* Date badge */}
      <div
        className={cn(
          "flex-shrink-0 w-10 h-10 rounded-lg flex flex-col items-center justify-center",
          "bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20"
        )}
      >
        <span className="text-[9px] uppercase font-bold text-[var(--color-primary)] leading-none">
          {new Intl.DateTimeFormat("en-US", { month: "short" }).format(
            new Date(event.startDate)
          )}
        </span>
        <span className="text-sm font-bold text-[var(--color-text-primary)] leading-none mt-0.5">
          {new Date(event.startDate).getDate()}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[var(--color-text-primary)] leading-4 truncate group-hover:text-[var(--color-accent)] transition-colors">
          {event.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <MapPin size={10} className="text-[var(--color-text-secondary)] flex-shrink-0" aria-hidden="true" />
          <span className="text-[10px] text-[var(--color-text-secondary)] truncate">
            {event.venue}
          </span>
        </div>
        {countdown && (
          <div className="flex items-center gap-1 mt-1">
            <Clock size={10} className="text-[var(--color-accent)] flex-shrink-0" aria-hidden="true" />
            <span className="text-[10px] font-medium text-[var(--color-accent)]">
              {countdown}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

// ─── LeftSidebar ──────────────────────────────────────────────────────────────

interface LeftSidebarProps {
  currentMember: MemberPublic | null;
}

export function LeftSidebar({ currentMember }: LeftSidebarProps): JSX.Element {
  const { data: statsData, isLoading: statsLoading } = useSWR<{
    data: MemberStats;
  }>(
    currentMember ? `/api/members/${currentMember.id}?select=stats` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const stats = statsData?.data;

  // Not logged in — show login prompt
  if (!currentMember) {
    return (
      <aside
        aria-label="Login prompt"
        className="w-full"
      >
        <div
          className={cn(
            "rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)]",
            "p-5 flex flex-col items-center text-center gap-4"
          )}
        >
          <div
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center",
              "bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20"
            )}
          >
            <Users size={24} className="text-[var(--color-primary)]" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              Join the community
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-4">
              Sign in to post, like, comment, and connect with club members.
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full">
            <Link
              href="/login?callbackUrl=/feed"
              className={cn(
                "flex items-center justify-center gap-2 w-full",
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                "bg-[var(--color-primary)] text-[var(--color-text-inverse)]",
                "hover:bg-[var(--color-primary-hover)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              )}
            >
              <LogIn size={14} aria-hidden="true" />
              Sign In
            </Link>
            <Link
              href="/membership"
              className={cn(
                "flex items-center justify-center gap-2 w-full",
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                "border border-[var(--color-border)] text-[var(--color-text-secondary)]",
                "hover:border-[var(--color-accent)]/40 hover:text-[var(--color-text-primary)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              )}
            >
              <UserPlus size={14} aria-hidden="true" />
              Apply for Membership
            </Link>
          </div>
        </div>
      </aside>
    );
  }

  // Logged in — profile card
  const avatarSrc =
    currentMember.avatarUrl && currentMember.avatarUrl.startsWith("data:")
      ? currentMember.avatarUrl
      : currentMember.avatarUrl
      ? cloudinaryUrl(currentMember.avatarUrl, { width: 112 })
      : generateInitialsAvatar(currentMember.fullName);

  return (
    <aside aria-label="Your profile" className="w-full">
      <div
        className={cn(
          "rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)]",
          "overflow-hidden"
        )}
      >
        {/* Cover strip */}
        <div
          className="h-14 w-full"
          style={{
            background: `linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent-secondary) 100%)`,
            opacity: 0.7,
          }}
          aria-hidden="true"
        />

        {/* Avatar + name */}
        <div className="px-4 pb-4">
          <div className="-mt-7 mb-3">
            <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-[var(--color-bg-surface)] bg-[var(--color-bg-elevated)]">
              {avatarSrc ? (
                <Image
                  src={avatarSrc}
                  alt={currentMember.fullName}
                  fill
                  sizes="56px"
                  className="object-cover"
                  unoptimized={avatarSrc.startsWith("data:")}
                />
              ) : null}
            </div>
          </div>

          <p className="text-sm font-bold text-[var(--color-text-primary)] leading-5 truncate">
            {currentMember.fullName}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)] truncate mb-2">
            @{currentMember.username}
          </p>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge
              variant="primary"
              size="sm"
              style={{ backgroundColor: `${currentMember.role.color}20`, color: currentMember.role.color, borderColor: `${currentMember.role.color}40` } as React.CSSProperties}
            >
              {currentMember.role.name}
            </Badge>
            <span className="text-[10px] text-[var(--color-text-secondary)] truncate">
              {currentMember.department.name}
            </span>
          </div>

          {/* Stats */}
          <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
            {statsLoading ? (
              <div className="flex gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex-1 text-center">
                    <Skeleton className="h-4 w-8 mx-auto mb-1" rounded="sm" />
                    <Skeleton className="h-3 w-12 mx-auto" rounded="sm" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex divide-x divide-[var(--color-border)]">
                {/* Posts */}
                <div className="flex-1 text-center pr-2">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <FileText size={10} className="text-[var(--color-text-secondary)]" aria-hidden="true" />
                    <span className="text-xs font-bold text-[var(--color-text-primary)]">
                      {stats?.postsCount ?? 0}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--color-text-secondary)]">Posts</p>
                </div>

                {/* Events */}
                <div className="flex-1 text-center px-2">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Calendar size={10} className="text-[var(--color-text-secondary)]" aria-hidden="true" />
                    <span className="text-xs font-bold text-[var(--color-text-primary)]">
                      {stats?.eventsAttended ?? 0}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--color-text-secondary)]">Events</p>
                </div>

                {/* Certificates */}
                <div className="flex-1 text-center pl-2">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Award size={10} className="text-[var(--color-text-secondary)]" aria-hidden="true" />
                    <span className="text-xs font-bold text-[var(--color-text-primary)]">
                      {stats?.certificatesCount ?? 0}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--color-text-secondary)]">Certs</p>
                </div>
              </div>
            )}
          </div>

          {/* Profile link */}
          <Link
            href="/profile"
            className={cn(
              "mt-3 flex items-center justify-center gap-1.5 w-full",
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              "border border-[var(--color-border)] text-[var(--color-text-secondary)]",
              "hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            )}
          >
            View Profile
            <ExternalLink size={10} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </aside>
  );
}

// ─── RightSidebar ─────────────────────────────────────────────────────────────

export function RightSidebar(): JSX.Element {
  // Upcoming events
  const { data: eventsData, isLoading: eventsLoading } = useSWR<
    ApiListResponse<EventCard>
  >("/api/events?tab=upcoming&take=3", fetcher, {
    revalidateOnFocus: false,
  });

  // Recently active members
  const { data: recentMembersData, isLoading: recentLoading } = useSWR<
    ApiListResponse<MemberPublic>
  >("/api/members?take=6&sort=recent", fetcher, {
    revalidateOnFocus: false,
  });

  // Suggested members
  const { data: suggestedData, isLoading: suggestedLoading } = useSWR<
    ApiListResponse<MemberPublic>
  >("/api/members?take=4&sort=random", fetcher, {
    revalidateOnFocus: false,
  });

  const upcomingEvents = eventsData?.data ?? [];
  const recentMembers = recentMembersData?.data ?? [];
  const suggestedMembers = suggestedData?.data ?? [];

  return (
    <aside aria-label="Feed sidebar" className="w-full flex flex-col gap-4">
      {/* Upcoming Events widget */}
      <div
        className={cn(
          "rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)]",
          "overflow-hidden"
        )}
      >
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-[var(--color-accent)]" aria-hidden="true" />
            <h2 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
              Upcoming Events
            </h2>
          </div>
          <Link
            href="/events"
            className={cn(
              "text-[10px] font-medium text-[var(--color-accent)]",
              "hover:underline focus:outline-none focus:underline"
            )}
          >
            See all
          </Link>
        </div>

        <div className="px-1 pb-2">
          {eventsLoading ? (
            <div className="flex flex-col gap-1 px-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3 items-start py-2">
                  <Skeleton width={40} height={40} rounded="lg" />
                  <div className="flex-1">
                    <Skeleton className="h-3 w-full mb-1.5" rounded="sm" />
                    <Skeleton className="h-2.5 w-3/4" rounded="sm" />
                  </div>
                </div>
              ))}
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="px-4 py-4 text-center">
              <p className="text-xs text-[var(--color-text-secondary)]">
                No upcoming events yet.
              </p>
            </div>
          ) : (
            upcomingEvents.map((event) => (
              <SidebarEventCard key={event.id} event={event} />
            ))
          )}
        </div>
      </div>

      {/* Recently Joined Members */}
      <div
        className={cn(
          "rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)]",
          "p-4"
        )}
      >
        <div className="flex items-center gap-2 mb-3">
          <Users size={14} className="text-[var(--color-accent)]" aria-hidden="true" />
          <h2 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
            Active Members
          </h2>
        </div>

        {recentLoading ? (
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} width={32} height={32} rounded="full" />
            ))}
          </div>
        ) : recentMembers.length === 0 ? (
          <p className="text-xs text-[var(--color-text-secondary)]">No members found.</p>
        ) : (
          <div
            className="flex flex-wrap gap-2"
            role="list"
            aria-label="Recently active members"
          >
            {recentMembers.map((member) => (
              <Link
                key={member.id}
                href={`/members/${member.username}`}
                role="listitem"
                title={member.fullName}
                className={cn(
                  "block rounded-full transition-transform hover:scale-110",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1",
                  "focus:ring-offset-[var(--color-bg-surface)]"
                )}
                aria-label={`View ${member.fullName}'s profile`}
              >
                <MemberAvatar member={member} size={32} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Suggested Members */}
      <div
        className={cn(
          "rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)]",
          "p-4"
        )}
      >
        <div className="flex items-center gap-2 mb-3">
          <UserPlus size={14} className="text-[var(--color-accent)]" aria-hidden="true" />
          <h2 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
            Suggested
          </h2>
        </div>

        {suggestedLoading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2.5">
                <Skeleton width={32} height={32} rounded="full" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-24 mb-1" rounded="sm" />
                  <Skeleton className="h-2.5 w-16" rounded="sm" />
                </div>
                <Skeleton className="h-5 w-10" rounded="md" />
              </div>
            ))}
          </div>
        ) : suggestedMembers.length === 0 ? (
          <p className="text-xs text-[var(--color-text-secondary)]">No suggestions right now.</p>
        ) : (
          <ul className="flex flex-col gap-3" aria-label="Suggested members">
            {suggestedMembers.map((member) => (
              <li key={member.id} className="flex items-center gap-2.5">
                <Link
                  href={`/members/${member.username}`}
                  className="focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded-full"
                  aria-label={`View ${member.fullName}'s profile`}
                  tabIndex={-1}
                >
                  <MemberAvatar member={member} size={32} />
                </Link>

                <div className="flex-1 min-w-0">
                  <Link
                    href={`/members/${member.username}`}
                    className={cn(
                      "block text-xs font-medium text-[var(--color-text-primary)] leading-4 truncate",
                      "hover:text-[var(--color-accent)] transition-colors",
                      "focus:outline-none focus:underline"
                    )}
                  >
                    {member.fullName}
                  </Link>
                  <span
                    className="block text-[10px] truncate"
                    style={{ color: member.role.color || "var(--color-text-secondary)" }}
                  >
                    {member.role.name}
                  </span>
                </div>

                <Link
                  href={`/members/${member.username}`}
                  className={cn(
                    "flex-shrink-0 px-2 py-1 rounded-md text-[10px] font-medium transition-colors",
                    "border border-[var(--color-border)] text-[var(--color-text-secondary)]",
                    "hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  )}
                  aria-label={`View ${member.fullName}'s profile`}
                >
                  View
                </Link>
              </li>
            ))}
          </ul>
        )}

        {suggestedMembers.length > 0 && (
          <Link
            href="/members"
            className={cn(
              "mt-3 flex items-center justify-center gap-1 w-full",
              "text-xs text-[var(--color-text-secondary)]",
              "hover:text-[var(--color-accent)] transition-colors",
              "focus:outline-none focus:underline"
            )}
          >
            Browse all members
            <ExternalLink size={10} aria-hidden="true" />
          </Link>
        )}
      </div>
    </aside>
  );
}