"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { cn, cloudinaryUrl } from "@/lib/utils";
import { EmptyState } from "@/components/ui/DataDisplay";

interface ExCommitteeAccordionProps {
  sessions: string[];
  bySession: Record<
    string,
    Array<{
      id: string;
      memberName: string;
      designation: string;
      committeeType: string;
      session: string | null;
      sortOrder: number;
      memberId: string | null;
      member: { username: string; avatarUrl: string; fullName: string } | null;
    }>
  >;
}

export function ExCommitteeAccordion({
  sessions,
  bySession,
}: ExCommitteeAccordionProps): JSX.Element {
  const [openSessions, setOpenSessions] = React.useState<Set<string>>(
    () => new Set(sessions.slice(0, 1))
  );

  const toggleSession = React.useCallback((session: string) => {
    setOpenSessions((prev) => {
      const next = new Set(prev);
      if (next.has(session)) {
        next.delete(session);
      } else {
        next.add(session);
      }
      return next;
    });
  }, []);

  if (sessions.length === 0) {
    return (
      <EmptyState
        heading="No ex-committee records"
        description="Past committee information will appear here once added."
      />
    );
  }

  return (
    <div className="space-y-3" role="list">
      {sessions.map((session) => {
        const isOpen = openSessions.has(session);
        const entries = bySession[session] ?? [];

        return (
          <div
            key={session}
            role="listitem"
            className={cn(
              "rounded-xl border transition-colors duration-200",
              isOpen
                ? "border-[var(--color-primary)]/40 bg-[var(--color-bg-elevated)]"
                : "border-[var(--color-border)] bg-[var(--color-bg-surface)]"
            )}
          >
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`ex-committee-${session}`}
              onClick={() => toggleSession(session)}
              className={cn(
                "w-full flex items-center justify-between gap-4 px-5 py-4 text-left",
                "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-accent)] rounded-xl",
                "transition-colors duration-150",
                isOpen ? "rounded-b-none" : ""
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
                    "bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20",
                    "font-[var(--font-mono)]"
                  )}
                >
                  {session}
                </span>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  {entries.length} member{entries.length !== 1 ? "s" : ""}
                </span>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                className={cn(
                  "flex-shrink-0 text-[var(--color-text-secondary)] transition-transform duration-200",
                  isOpen ? "rotate-180" : "rotate-0"
                )}
              >
                <path
                  d="M4 6l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {isOpen && (
              <div
                id={`ex-committee-${session}`}
                className="px-5 pb-5 border-t border-[var(--color-border)]"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-4">
                  {entries.map((entry) => {
                    const displayName = entry.member?.fullName ?? entry.memberName;
                    const avatarUrl = entry.member?.avatarUrl
                      ? cloudinaryUrl(entry.member.avatarUrl, { width: 40, height: 40 })
                      : null;
                    const profileHref = entry.member?.username
                      ? `/members/${entry.member.username}`
                      : null;

                    const cardEl = (
                      <div
                        className={cn(
                          "flex items-center gap-3 rounded-lg border border-[var(--color-border)] p-3",
                          "bg-[var(--color-bg-surface)] transition-all duration-150",
                          profileHref && "hover:border-[var(--color-primary)]/40"
                        )}
                      >
                        <div className="relative w-8 h-8 flex-shrink-0 rounded-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
                          {avatarUrl ? (
                            <Image
                              src={avatarUrl}
                              alt={`Photo of ${displayName}`}
                              fill
                              sizes="32px"
                              className="object-cover opacity-80"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[var(--color-text-secondary)] font-[var(--font-display)]">
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate font-[var(--font-heading)]">
                            {displayName}
                          </p>
                          <p className="text-xs text-[var(--color-text-secondary)] truncate">
                            {entry.designation}
                          </p>
                        </div>
                      </div>
                    );

                    if (profileHref) {
                      return (
                        <Link
                          key={entry.id}
                          href={profileHref}
                          className="block focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded-lg"
                          aria-label={`View profile of ${displayName}`}
                        >
                          {cardEl}
                        </Link>
                      );
                    }
                    return <div key={entry.id}>{cardEl}</div>;
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}