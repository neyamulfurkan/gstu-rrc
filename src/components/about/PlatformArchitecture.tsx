// src/components/about/PlatformArchitecture.tsx

import Link from "next/link";
import Image from "next/image";
import {
  Bot,
  Users,
  CalendarDays,
  FolderGit2,
  ShieldCheck,
  Cloud,
  ArrowUpRight,
} from "lucide-react";

import { cn, cloudinaryUrl } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlatformArchitectureProps {
  architect: {
    username: string;
    fullName: string;
    avatarUrl: string;
    roleName: string;
  } | null;
}

interface Subsystem {
  label: string;
  icon: React.ReactNode;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const SUBSYSTEMS: Subsystem[] = [
  { label: "AI Integration", icon: <Bot className="w-4 h-4" /> },
  { label: "Member Management", icon: <Users className="w-4 h-4" /> },
  { label: "Event Infrastructure", icon: <CalendarDays className="w-4 h-4" /> },
  { label: "Research Showcase", icon: <FolderGit2 className="w-4 h-4" /> },
  { label: "Admin & Permissions", icon: <ShieldCheck className="w-4 h-4" /> },
  { label: "Cloud Media Pipeline", icon: <Cloud className="w-4 h-4" /> },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function PlatformArchitecture({
  architect,
}: PlatformArchitectureProps): JSX.Element | null {
  if (!architect) return null;

  const avatarUrl = architect.avatarUrl
    ? cloudinaryUrl(architect.avatarUrl, { width: 96, height: 96 })
    : null;

  const initials = architect.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <section
      aria-labelledby="platform-architecture-heading"
      className="relative py-20 px-6 overflow-hidden bg-[var(--color-bg-surface)] border-t border-[var(--color-border)]"
    >
      {/* Ambient background accent */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 50% at 50% 0%, var(--color-primary) 0%, transparent 70%)",
          opacity: 0.05,
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* ── Header ── */}
        <div className="text-center mb-12">
          <span className="inline-block mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)] font-[var(--font-mono)]">
            Under the Hood
          </span>
          <h2
            id="platform-architecture-heading"
            className="text-2xl md:text-3xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)] mb-3"
          >
            Platform Architecture
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] max-w-xl mx-auto leading-relaxed">
            Every part of this site — from live member data to AI-assisted
            answers — runs on a purpose-built platform designed and maintained
            in-house.
          </p>
        </div>

        {/* ── Subsystem grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-12">
          {SUBSYSTEMS.map((s) => (
            <div
              key={s.label}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border border-[var(--color-border)]",
                "bg-[var(--color-bg-base)] px-4 py-3 transition-colors duration-200",
                "hover:border-[var(--color-primary)]/30"
              )}
            >
              <span
                className="flex-shrink-0 text-[var(--color-accent)]"
                aria-hidden="true"
              >
                {s.icon}
              </span>
              <span className="text-xs font-medium text-[var(--color-text-secondary)] leading-tight">
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* ── Architect credit card ── */}
        <Link
          href={`/members/${architect.username}`}
          aria-label={`View ${architect.fullName}'s profile`}
          className={cn(
            "group flex items-center gap-4 rounded-xl border border-[var(--color-border)]",
            "bg-[var(--color-bg-base)] p-5 max-w-md mx-auto transition-all duration-200",
            "hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-bg-elevated)]",
            "hover:shadow-[0_0_20px_var(--color-glow-primary)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-surface)]"
          )}
        >
          {/* Avatar with subtle ring glow */}
          <div className="relative flex-shrink-0">
            <div
              className="absolute inset-0 rounded-full blur-md opacity-40 group-hover:opacity-60 transition-opacity duration-200"
              style={{ backgroundColor: "var(--color-accent)" }}
              aria-hidden="true"
            />
            <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-[var(--color-border)] bg-[var(--color-bg-elevated)] group-hover:border-[var(--color-accent)]/60 transition-colors duration-200">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={architect.fullName}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-sm text-[var(--color-text-secondary)] font-[var(--font-display)]">
                  {initials}
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[var(--color-text-secondary)] mb-0.5">
              Designed &amp; engineered by
            </p>
            <p className="text-sm font-semibold text-[var(--color-text-primary)] font-[var(--font-heading)] truncate">
              {architect.fullName}
            </p>
            <span
              className={cn(
                "inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium",
                "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20"
              )}
            >
              {architect.roleName}
            </span>
          </div>

          {/* Affordance icon */}
          <ArrowUpRight
            className="w-4 h-4 flex-shrink-0 text-[var(--color-text-secondary)] group-hover:text-[var(--color-accent)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200"
            aria-hidden="true"
          />
        </Link>
      </div>
    </section>
  );
}