// src/components/admin/Dashboard.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import useSWR from "swr";
import {
  Calendar,
  FileImage,
  Inbox,
  Package,
  Users,
  MessageSquare,
  Plus,
  ClipboardList,
  Award,
  CheckSquare,
  Eye,
  ArrowRight,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

import { cn, formatDate } from "@/lib/utils";
import { CounterStat, EmptyState } from "@/components/ui/DataDisplay";
import { Badge, Skeleton, Spinner } from "@/components/ui/Feedback";
import { useColorSystem } from "@/hooks/useColorSystem";

// ─── Dynamic Recharts Imports ─────────────────────────────────────────────────

interface MemberGrowthChartProps { data: Array<{ month: string; count: number }>; primaryColor: string; accentColor: string; }
interface EventsBarChartProps { data: Array<{ month: string; count: number }>; primaryColor: string; }
interface MemberTypePieChartProps { data: Array<{ name: string; value: number }>; primaryColor: string; accentColor: string; accentSecondaryColor: string; }
interface PaymentBarChartProps { data: Array<{ month: string; amount: number }>; accentColor: string; }

const MemberGrowthChart = dynamic<MemberGrowthChartProps>(
  () => import("./charts/MemberGrowthChart").then((m) => ({ default: m.MemberGrowthChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

const EventsBarChart = dynamic<EventsBarChartProps>(
  () => import("./charts/EventsBarChart").then((m) => ({ default: m.EventsBarChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

const MemberTypePieChart = dynamic<MemberTypePieChartProps>(
  () => import("./charts/MemberTypePieChart").then((m) => ({ default: m.MemberTypePieChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

const PaymentBarChart = dynamic<PaymentBarChartProps>(
  () => import("./charts/PaymentBarChart").then((m) => ({ default: m.PaymentBarChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalMembers: number;
  pendingApplications: number;
  upcomingEvents: number;
  onLoanInstruments: number;
  feedPostsToday: number;
  pendingGalleryItems: number;
  memberSparkline: number[];
  applicationsSparkline: number[];
  eventsSparkline: number[];
  instrumentsSparkline: number[];
  postsSparkline: number[];
  gallerySparkline: number[];
}

interface DetailedStats {
  memberGrowth: Array<{ month: string; count: number }>;
  eventsPerMonth: Array<{ month: string; count: number }>;
  memberTypes: Array<{ name: string; value: number }>;
  paymentCollection: Array<{ month: string; amount: number }>;
}

interface AuditLogEntry {
  id: string;
  actionType: string;
  description: string;
  entityType?: string | null;
  entityId?: string | null;
  createdAt: string;
  admin: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string;
  } | null;
  adminRole?: string | null;
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

// ─── Sparkline ────────────────────────────────────────────────────────────────

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

function Sparkline({
  data,
  color = "var(--color-accent)",
  width = 80,
  height = 32,
}: SparklineProps): JSX.Element {
  const points = useMemo(() => {
    if (!data || data.length === 0) return "";
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const stepX = width / (data.length - 1 || 1);
    return data
      .map((v, i) => {
        const x = i * stepX;
        const y = height - ((v - min) / range) * (height - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [data, width, height]);

  if (!data || data.length < 2) {
    return <div style={{ width, height }} />;
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
      className="opacity-70"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Chart Skeleton ───────────────────────────────────────────────────────────

function ChartSkeleton(): JSX.Element {
  return (
    <div className="w-full h-full flex items-center justify-center min-h-[200px]">
      <Skeleton className="w-full h-full min-h-[200px] rounded-xl" />
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  sparkline: number[];
  icon: string;
  accentColor?: string;
  suffix?: string;
  href?: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Users,
  Inbox,
  Calendar,
  Package,
  MessageSquare,
  FileImage,
};

function StatCard({
  label,
  value,
  sparkline,
  icon,
  accentColor = "var(--color-accent)",
  suffix = "",
  href,
}: StatCardProps): JSX.Element {
  const IconComponent = ICON_MAP[icon] ?? TrendingUp;
  const { getCssVar } = useColorSystem();

  const cardContent = (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-[var(--color-border)]",
        "bg-[var(--color-bg-surface)] p-5",
        "hover:border-[var(--color-card-border-hover)] transition-all duration-300",
        href && "cursor-pointer"
      )}
      style={{ ["--stat-accent" as string]: accentColor }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-lg"
          style={{ backgroundColor: `${accentColor}18` }}
          aria-hidden="true"
        >
          <IconComponent size={20} style={{ color: accentColor }} />
        </div>
        <Sparkline data={sparkline} color={accentColor} />
      </div>

      <div
        className="text-2xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)] tabular-nums mb-1"
        aria-label={`${value}${suffix} ${label}`}
      >
        <SparkCount target={value} suffix={suffix} />
      </div>

      <p className="text-sm text-[var(--color-text-secondary)] font-medium">
        {label}
      </p>

      {href && (
        <div
          className="absolute bottom-3 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-hidden="true"
        >
          <ArrowRight size={14} style={{ color: accentColor }} />
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group block">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}

// ─── Animated Counter ─────────────────────────────────────────────────────────

function SparkCount({
  target,
  suffix,
}: {
  target: number;
  suffix: string;
}): JSX.Element {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const duration = 1200;

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      setCount(target);
      return;
    }

    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target]);

  return (
    <>
      {count.toLocaleString()}
      {suffix && (
        <span className="text-[var(--color-accent)]">{suffix}</span>
      )}
    </>
  );
}

// ─── Action Type Badge ────────────────────────────────────────────────────────

const ACTION_TYPE_COLORS: Record<string, string> = {
  create: "success",
  update: "primary",
  delete: "error",
  approve: "success",
  reject: "warning",
  revoke: "error",
  login: "neutral",
  promote: "accent",
  broadcast: "accent",
  issue: "success",
};

function getActionBadgeVariant(
  actionType: string
): "success" | "warning" | "error" | "primary" | "accent" | "neutral" {
  const lower = actionType.toLowerCase();
  for (const [key, variant] of Object.entries(ACTION_TYPE_COLORS)) {
    if (lower.includes(key)) {
      return variant as "success" | "warning" | "error" | "primary" | "accent" | "neutral";
    }
  }
  return "neutral";
}

// ─── Audit Log Feed ───────────────────────────────────────────────────────────

function AuditLogFeed(): JSX.Element {
  const { data, error, isLoading } = useSWR<{ data: AuditLogEntry[] }>(
    "/api/admin/audit-log?take=20",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-3">
            <Skeleton rounded="full" width={32} height={32} />
            <div className="flex-1 space-y-1.5">
              <Skeleton height={14} className="w-3/4" />
              <Skeleton height={12} className="w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="py-8 text-center text-sm text-[var(--color-text-secondary)]">
        <AlertCircle size={24} className="mx-auto mb-2 opacity-50" />
        Failed to load audit log.
      </div>
    );
  }

  const entries = data.data;

  if (entries.length === 0) {
    return (
      <EmptyState
        icon="ClipboardList"
        heading="No recent activity"
        description="Admin actions will appear here."
      />
    );
  }

  return (
    <ol className="divide-y divide-[var(--color-border)]">
      {entries.map((entry) => (
        <li key={entry.id} className="flex items-start gap-3 py-3 px-1">
          {/* Avatar */}
          <div className="flex-shrink-0 mt-0.5">
            {entry.admin ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={entry.admin.avatarUrl}
                alt={entry.admin.fullName}
                width={28}
                height={28}
                className="rounded-full object-cover ring-1 ring-[var(--color-border)]"
                loading="lazy"
              />
            ) : (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center bg-[var(--color-bg-elevated)]"
                aria-hidden="true"
              >
                <Users size={14} className="text-[var(--color-text-secondary)]" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              {entry.admin && (
                <Link
                  href={`/members/${entry.admin.username}`}
                  className="text-xs font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors truncate"
                >
                  {entry.admin.fullName}
                </Link>
              )}
              <Badge
                variant={getActionBadgeVariant(entry.actionType)}
                size="sm"
              >
                {entry.actionType}
              </Badge>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed truncate">
              {entry.description}
            </p>
            <time
              dateTime={entry.createdAt}
              className="text-[10px] text-[var(--color-text-secondary)] opacity-60 mt-0.5 block font-[var(--font-mono)]"
            >
              {formatDate(entry.createdAt, "relative")}
            </time>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ─── Pending Actions Widget ───────────────────────────────────────────────────

interface PendingActionsProps {
  pendingApplications: number;
  pendingGalleryItems: number;
}

function PendingActionsWidget({
  pendingApplications,
  pendingGalleryItems,
}: PendingActionsProps): JSX.Element {
  const items = [
    {
      label: "Applications awaiting review",
      count: pendingApplications,
      href: "/admin/applications",
      icon: Inbox,
      accentColor: "var(--color-warning)",
    },
    {
      label: "Gallery items pending approval",
      count: pendingGalleryItems,
      href: "/admin/gallery",
      icon: FileImage,
      accentColor: "var(--color-primary)",
    },
  ];

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-3 rounded-lg p-3 border border-[var(--color-border)]",
            "bg-[var(--color-bg-surface)] hover:border-[var(--color-card-border-hover)]",
            "transition-all duration-200 group"
          )}
        >
          <div
            className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center"
            style={{ backgroundColor: `${item.accentColor}18` }}
            aria-hidden="true"
          >
            <item.icon size={16} style={{ color: item.accentColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[var(--color-text-secondary)]">
              {item.label}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-bold font-[var(--font-display)]"
              style={{ color: item.accentColor }}
            >
              {item.count}
            </span>
            <ArrowRight
              size={14}
              className="text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors"
            />
          </div>
        </Link>
      ))}
    </div>
  );
}

// ─── Quick Action Tiles ───────────────────────────────────────────────────────

interface QuickActionTile {
  label: string;
  icon: React.ElementType;
  href: string;
  color: string;
  description: string;
}

const QUICK_ACTIONS: QuickActionTile[] = [
  {
    label: "Add Event",
    icon: Calendar,
    href: "/admin/events",
    color: "var(--color-accent)",
    description: "Create a new club event",
  },
  {
    label: "Add Project",
    icon: Package,
    href: "/admin/projects",
    color: "var(--color-primary)",
    description: "Showcase a new project",
  },
  {
    label: "Add Announcement",
    icon: MessageSquare,
    href: "/admin/announcements",
    color: "var(--color-warning)",
    description: "Broadcast to members",
  },
  {
    label: "Issue Certificate",
    icon: Award,
    href: "/admin/certifications",
    color: "var(--color-success)",
    description: "Issue member certificates",
  },
  {
    label: "Approve Applications",
    icon: CheckSquare,
    href: "/admin/applications",
    color: "var(--color-accent-secondary)",
    description: "Review pending members",
  },
  {
    label: "View Audit Log",
    icon: Eye,
    href: "/admin/audit-logs",
    color: "var(--color-text-secondary)",
    description: "Full activity history",
  },
];

function QuickActions(): JSX.Element {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {QUICK_ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={cn(
            "group flex flex-col items-start gap-2.5 rounded-xl border border-[var(--color-border)]",
            "bg-[var(--color-bg-surface)] p-4",
            "hover:border-[var(--color-card-border-hover)] hover:-translate-y-0.5",
            "transition-all duration-200"
          )}
        >
          <div
            className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
            style={{ backgroundColor: `${action.color}15` }}
            aria-hidden="true"
          >
            <action.icon size={18} style={{ color: action.color }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)] leading-tight mb-0.5 flex items-center gap-1">
              {action.label}
              <Plus
                size={12}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: action.color }}
                aria-hidden="true"
              />
            </p>
            <p className="text-[11px] text-[var(--color-text-secondary)] leading-snug">
              {action.description}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ─── Charts Section ───────────────────────────────────────────────────────────

function ChartsSection(): JSX.Element {
  const { data, error, isLoading } = useSWR<DetailedStats>(
    "/api/admin/stats?detailed=true",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const { getColor } = useColorSystem();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5"
          >
            <Skeleton height={20} className="w-40 mb-4" />
            <Skeleton height={200} className="w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-8 text-center">
        <AlertCircle
          size={28}
          className="mx-auto mb-2 text-[var(--color-text-secondary)] opacity-50"
        />
        <p className="text-sm text-[var(--color-text-secondary)]">
          Failed to load detailed analytics.
        </p>
      </div>
    );
  }

  const chartCardClass = cn(
    "rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5"
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className={chartCardClass}>
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 font-[var(--font-heading)]">
          Member Growth
        </h3>
        <div className="h-52">
          <MemberGrowthChart
            data={data.memberGrowth}
            primaryColor={getColor("primary")}
            accentColor={getColor("accent")}
          />
        </div>
      </div>

      <div className={chartCardClass}>
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 font-[var(--font-heading)]">
          Events per Month
        </h3>
        <div className="h-52">
          <EventsBarChart
            data={data.eventsPerMonth}
            primaryColor={getColor("primary")}
          />
        </div>
      </div>

      <div className={chartCardClass}>
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 font-[var(--font-heading)]">
          Member Types
        </h3>
        <div className="h-52">
          <MemberTypePieChart
            data={data.memberTypes}
            primaryColor={getColor("primary")}
            accentColor={getColor("accent")}
            accentSecondaryColor={getColor("accent-secondary")}
          />
        </div>
      </div>

      <div className={chartCardClass}>
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 font-[var(--font-heading)]">
          Payment Collection (BDT)
        </h3>
        <div className="h-52">
          <PaymentBarChart
            data={data.paymentCollection}
            accentColor={getColor("accent")}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function AdminDashboard(): JSX.Element {
  const {
    data: statsData,
    error: statsError,
    isLoading: statsLoading,
  } = useSWR<DashboardStats>("/api/admin/stats", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  const stats: DashboardStats = statsData ?? {
    totalMembers: 0,
    pendingApplications: 0,
    upcomingEvents: 0,
    onLoanInstruments: 0,
    feedPostsToday: 0,
    pendingGalleryItems: 0,
    memberSparkline: [],
    applicationsSparkline: [],
    eventsSparkline: [],
    instrumentsSparkline: [],
    postsSparkline: [],
    gallerySparkline: [],
  };

  const statCards: Array<{
    key: keyof DashboardStats;
    sparklineKey: keyof DashboardStats;
    label: string;
    icon: string;
    color: string;
    suffix: string;
    href: string;
  }> = [
    {
      key: "totalMembers",
      sparklineKey: "memberSparkline",
      label: "Total Members",
      icon: "Users",
      color: "var(--color-primary)",
      suffix: "",
      href: "/admin/members",
    },
    {
      key: "pendingApplications",
      sparklineKey: "applicationsSparkline",
      label: "Pending Applications",
      icon: "Inbox",
      color: "var(--color-warning)",
      suffix: "",
      href: "/admin/applications",
    },
    {
      key: "upcomingEvents",
      sparklineKey: "eventsSparkline",
      label: "Upcoming Events",
      icon: "Calendar",
      color: "var(--color-accent)",
      suffix: "",
      href: "/admin/events",
    },
    {
      key: "onLoanInstruments",
      sparklineKey: "instrumentsSparkline",
      label: "On-Loan Instruments",
      icon: "Package",
      color: "var(--color-accent-secondary)",
      suffix: "",
      href: "/admin/instruments",
    },
    {
      key: "feedPostsToday",
      sparklineKey: "postsSparkline",
      label: "Feed Posts Today",
      icon: "MessageSquare",
      color: "var(--color-success)",
      suffix: "",
      href: "/admin/feed",
    },
    {
      key: "pendingGalleryItems",
      sparklineKey: "gallerySparkline",
      label: "Pending Gallery Items",
      icon: "FileImage",
      color: "var(--color-error)",
      suffix: "",
      href: "/admin/gallery",
    },
  ];

  return (
    <div className="space-y-6 p-3 sm:p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)]">
            Dashboard
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Club activity overview
          </p>
        </div>
        <time
          dateTime={new Date().toISOString()}
          className="text-xs font-[var(--font-mono)] text-[var(--color-text-secondary)] hidden md:block"
        >
          {formatDate(new Date(), "full")}
        </time>
      </div>

      {/* Summary Stat Cards */}
      <section aria-label="Summary statistics">
        {statsError ? (
          <div className="rounded-xl border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 p-6 text-center">
            <AlertCircle
              size={24}
              className="mx-auto mb-2 text-[var(--color-error)]"
            />
            <p className="text-sm text-[var(--color-text-secondary)]">
              Failed to load dashboard statistics.
            </p>
          </div>
        ) : statsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={120} className="rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {statCards.map((card) => (
              <StatCard
                key={card.key}
                label={card.label}
                value={stats[card.key] as number}
                sparkline={stats[card.sparklineKey] as number[]}
                icon={card.icon}
                accentColor={card.color}
                suffix={card.suffix}
                href={card.href}
              />
            ))}
          </div>
        )}
      </section>

      {/* Charts */}
      <section aria-label="Analytics charts">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] font-[var(--font-heading)]">
            Analytics
          </h2>
        </div>
        <ChartsSection />
      </section>

      {/* Bottom Grid: Audit Log + Pending + Quick Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Recent Activity */}
        <section
          className={cn(
            "xl:col-span-2 rounded-xl border border-[var(--color-border)]",
            "bg-[var(--color-bg-surface)] overflow-hidden"
          )}
          aria-label="Recent activity"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)] font-[var(--font-heading)] flex items-center gap-2">
              <ClipboardList
                size={16}
                className="text-[var(--color-text-secondary)]"
                aria-hidden="true"
              />
              Recent Activity
            </h2>
            <Link
              href="/admin/audit-logs"
              className={cn(
                "text-xs text-[var(--color-accent)] hover:underline underline-offset-2",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
              )}
            >
              View All
            </Link>
          </div>
          <div className="px-3 py-2 max-h-96 overflow-y-auto scrollbar-thin">
            <AuditLogFeed />
          </div>
        </section>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Pending Actions */}
          <section
            className={cn(
              "rounded-xl border border-[var(--color-border)]",
              "bg-[var(--color-bg-surface)] overflow-hidden"
            )}
            aria-label="Pending actions"
          >
            <div className="px-5 py-4 border-b border-[var(--color-border)]">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] font-[var(--font-heading)] flex items-center gap-2">
                <AlertCircle
                  size={16}
                  className="text-[var(--color-warning)]"
                  aria-hidden="true"
                />
                Pending Actions
              </h2>
            </div>
            <div className="p-4">
              {statsLoading ? (
                <div className="space-y-2">
                  <Skeleton height={56} className="rounded-lg" />
                  <Skeleton height={56} className="rounded-lg" />
                </div>
              ) : (
                <PendingActionsWidget
                  pendingApplications={stats.pendingApplications}
                  pendingGalleryItems={stats.pendingGalleryItems}
                />
              )}
            </div>
          </section>

          {/* Quick Actions */}
          <section
            className={cn(
              "rounded-xl border border-[var(--color-border)]",
              "bg-[var(--color-bg-surface)] overflow-hidden"
            )}
            aria-label="Quick actions"
          >
            <div className="px-5 py-4 border-b border-[var(--color-border)]">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] font-[var(--font-heading)]">
                Quick Actions
              </h2>
            </div>
            <div className="p-4">
              <QuickActions />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}