// src/app/admin/[section]/page.tsx
"use client";

import React, { lazy, Suspense } from "react";
import { ShieldOff, AlertTriangle, Loader2 } from "lucide-react";

import type { AdminSection } from "@/types/ui";
import { PERMISSION_LIST } from "@/lib/permissions";
import { usePermissions } from "@/hooks/usePermissions";

import { AdminDashboard } from "@/components/admin/Dashboard";
import { MembersAdmin } from "@/components/admin/MembersAdmin";
import { ApplicationsAdmin } from "@/components/admin/ApplicationsAdmin";
import { EventsAdmin } from "@/components/admin/EventsAdmin";
import { ProjectsAdmin } from "@/components/admin/ProjectsAdmin";
import { GalleryAdmin } from "@/components/admin/GalleryAdmin";
import { AnnouncementsAdmin } from "@/components/admin/AnnouncementsAdmin";
import { FeedAdmin } from "@/components/admin/FeedAdmin";
import { InstrumentsAdmin } from "@/components/admin/InstrumentsAdmin";
import { CommitteeAdmin } from "@/components/admin/CommitteeAdmin";
import { CertificatesAdmin } from "@/components/admin/CertificatesAdmin";
import { EmailAdmin } from "@/components/admin/EmailAdmin";
import { RoleManagementAdmin } from "@/components/admin/RoleManagementAdmin";
import { AuditLogAdmin } from "@/components/admin/AuditLogAdmin";
import { ClubConfigAdmin } from "@/components/admin/ClubConfigAdmin";
import { CustomCardsAdmin } from "@/components/admin/CustomCardsAdmin";

// ─── Lazy-loaded heavy components ─────────────────────────────────────────────

const FacebookAdmin = lazy(() =>
  import("@/components/admin/FacebookAdmin").then((m) => ({
    default: m.FacebookAdmin,
  }))
);

const AIConfigAdmin = lazy(() =>
  import("@/components/admin/AIConfigAdmin").then((m) => ({
    default: m.AIConfigAdmin,
  }))
);

// ─── All valid AdminSection values ────────────────────────────────────────────

const ALL_ADMIN_SECTIONS: AdminSection[] = [
  "dashboard",
  "members",
  "applications",
  "events",
  "projects",
  "gallery",
  "announcements",
  "feed",
  "instruments",
  "committee",
  "advisors",
  "certifications",
  "emails",
  "custom-cards",
  "facebook",
  "ai-config",
  "roles",
  "audit-logs",
  "club-config",
];

// ─── Section Registry ─────────────────────────────────────────────────────────

type SectionComponent = React.ComponentType<Record<string, unknown>>;

const SECTION_REGISTRY: Partial<Record<AdminSection, SectionComponent>> = {
  dashboard: AdminDashboard as SectionComponent,
  members: MembersAdmin as SectionComponent,
  applications: ApplicationsAdmin as SectionComponent,
  events: EventsAdmin as SectionComponent,
  projects: ProjectsAdmin as SectionComponent,
  gallery: GalleryAdmin as SectionComponent,
  announcements: AnnouncementsAdmin as SectionComponent,
  feed: FeedAdmin as SectionComponent,
  instruments: InstrumentsAdmin as SectionComponent,
  committee: CommitteeAdmin as SectionComponent,
  advisors: CommitteeAdmin as SectionComponent,
  certifications: CertificatesAdmin as SectionComponent,
  emails: EmailAdmin as SectionComponent,
  "custom-cards": CustomCardsAdmin as SectionComponent,
  facebook: FacebookAdmin as SectionComponent,
  "ai-config": AIConfigAdmin as SectionComponent,
  roles: RoleManagementAdmin as SectionComponent,
  "audit-logs": AuditLogAdmin as SectionComponent,
  "club-config": ClubConfigAdmin as SectionComponent,
};

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton(): JSX.Element {
  return (
    <div
      className="flex flex-col gap-6 p-6 animate-pulse"
      role="status"
      aria-label="Loading admin section…"
    >
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-lg bg-[var(--color-bg-elevated)]" />
          <div className="h-4 w-72 rounded bg-[var(--color-bg-elevated)]" />
        </div>
        <div className="h-10 w-32 rounded-lg bg-[var(--color-bg-elevated)]" />
      </div>

      {/* Tab-like skeleton */}
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-9 w-24 rounded-lg bg-[var(--color-bg-elevated)]"
          />
        ))}
      </div>

      {/* Content rows */}
      <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="h-12 bg-[var(--color-bg-elevated)] border-b border-[var(--color-border)]" />
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3 border-b border-[var(--color-border)] last:border-0"
          >
            <div className="h-8 w-8 rounded-full bg-[var(--color-bg-elevated)] flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-1/3 rounded bg-[var(--color-bg-elevated)]" />
              <div className="h-3 w-1/4 rounded bg-[var(--color-bg-elevated)]" />
            </div>
            <div className="h-6 w-16 rounded-full bg-[var(--color-bg-elevated)]" />
            <div className="h-6 w-20 rounded-full bg-[var(--color-bg-elevated)]" />
            <div className="h-7 w-7 rounded-lg bg-[var(--color-bg-elevated)]" />
          </div>
        ))}
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}

// ─── 403 Access Denied ────────────────────────────────────────────────────────

function AccessDenied({ section }: { section: string }): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center min-h-[480px] gap-5 text-center px-6">
      <div
        className="flex items-center justify-center w-20 h-20 rounded-full bg-[var(--color-error)]/10"
        aria-hidden="true"
      >
        <ShieldOff size={36} className="text-[var(--color-error)]" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)] mb-2">
          Access Denied
        </h2>
        <p className="text-[var(--color-text-secondary)] max-w-sm text-sm leading-relaxed">
          You do not have permission to access the{" "}
          <span className="font-semibold text-[var(--color-text-primary)] capitalize">
            {section.replace(/-/g, " ")}
          </span>{" "}
          section. Contact a Super Admin to request the required permissions.
        </p>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <div className="h-px w-12 bg-[var(--color-border)]" aria-hidden="true" />
        <span className="text-xs text-[var(--color-text-secondary)] font-mono">
          HTTP 403 Forbidden
        </span>
        <div className="h-px w-12 bg-[var(--color-border)]" aria-hidden="true" />
      </div>
    </div>
  );
}

// ─── 404 Section Not Found ────────────────────────────────────────────────────

function SectionNotFound({ section }: { section: string }): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center min-h-[480px] gap-5 text-center px-6">
      <div
        className="flex items-center justify-center w-20 h-20 rounded-full bg-[var(--color-warning)]/10"
        aria-hidden="true"
      >
        <AlertTriangle size={36} className="text-[var(--color-warning)]" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)] mb-2">
          Section Not Found
        </h2>
        <p className="text-[var(--color-text-secondary)] max-w-sm text-sm leading-relaxed">
          The admin section{" "}
          <code className="font-mono text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-1.5 py-0.5 rounded text-xs">
            {section}
          </code>{" "}
          does not exist. Check the URL or navigate using the sidebar.
        </p>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <div className="h-px w-12 bg-[var(--color-border)]" aria-hidden="true" />
        <span className="text-xs text-[var(--color-text-secondary)] font-mono">
          HTTP 404 Not Found
        </span>
        <div className="h-px w-12 bg-[var(--color-border)]" aria-hidden="true" />
      </div>
    </div>
  );
}

// ─── Static Params ────────────────────────────────────────────────────────────
// generateStaticParams removed: incompatible with "use client" directive

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminSectionPage({
  params,
}: {
  params: { section: string };
}): JSX.Element {
  const { canAccess, isAdmin, isSuperAdmin } = usePermissions();

  const rawSection = params.section;
  const section = rawSection as AdminSection;

  // Validate that the section is a known AdminSection value
  const isKnownSection = ALL_ADMIN_SECTIONS.includes(section);

  if (!isKnownSection) {
    return <SectionNotFound section={rawSection} />;
  }

  // Check if user is admin at all
  if (!isAdmin && !isSuperAdmin) {
    return <AccessDenied section={rawSection} />;
  }

  // Check specific section permissions (super admins bypass per canAccess logic)
  if (!canAccess(section)) {
    return <AccessDenied section={rawSection} />;
  }

  // Look up the component in the registry
  const Component = SECTION_REGISTRY[section];

  if (!Component) {
    return <SectionNotFound section={rawSection} />;
  }

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <Component />
    </Suspense>
  );
}