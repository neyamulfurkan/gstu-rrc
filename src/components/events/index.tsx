// src/components/events/index.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, Clock, MapPin } from "lucide-react";

import { useDebounce } from "@/hooks/useDebounce";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { Badge, Skeleton, Spinner } from "@/components/ui/Feedback";
import { EventCard } from "@/components/events/Card";
import { EventDetail } from "@/components/events/Detail";
import { EventsFilter } from "@/components/events/Filter";
import type { EventCard as EventCardType } from "@/types/index";

// ─── Types ────────────────────────────────────────────────────────────────────

type EventTab = "upcoming" | "ongoing" | "past";

interface CategoryOption {
  id: string;
  name: string;
  color: string;
}

interface EventsGridProps {
  initialTab?: EventTab;
  initialEvents: EventCardType[];
  categories: CategoryOption[];
}

interface FilterState {
  search: string;
  categoryId?: string;
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 20 },
  },
  exit: { opacity: 0, y: -12, transition: { duration: 0.15 } },
};

const reducedMotionFallback = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

// ─── Tab Config ───────────────────────────────────────────────────────────────

const TABS: Array<{ key: EventTab; label: string }> = [
  { key: "upcoming", label: "Upcoming" },
  { key: "ongoing", label: "Ongoing" },
  { key: "past", label: "Past" },
];

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

function EventCardSkeleton(): JSX.Element {
  return (
    <div className="rounded-lg overflow-hidden bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
      <Skeleton className="w-full" height={200} rounded="sm" />
      <div className="p-4 space-y-3">
        <Skeleton width="70%" height={20} rounded="md" />
        <Skeleton width="45%" height={14} rounded="md" />
        <div className="flex gap-2 pt-1">
          <Skeleton width={80} height={24} rounded="full" />
          <Skeleton width={60} height={24} rounded="full" />
        </div>
      </div>
    </div>
  );
}

function GridSkeleton(): JSX.Element {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyEvents({ tab }: { tab: EventTab }): JSX.Element {
  const messages: Record<EventTab, { icon: React.ReactNode; heading: string; body: string }> = {
    upcoming: {
      icon: <Calendar size={40} className="text-[var(--color-text-secondary)]" />,
      heading: "No upcoming events",
      body: "Check back soon — new events are added regularly.",
    },
    ongoing: {
      icon: <Clock size={40} className="text-[var(--color-text-secondary)]" />,
      heading: "No ongoing events",
      body: "There are no events happening right now.",
    },
    past: {
      icon: <MapPin size={40} className="text-[var(--color-text-secondary)]" />,
      heading: "No past events found",
      body: "Try adjusting your filters to find what you're looking for.",
    },
  };

  const { icon, heading, body } = messages[tab];

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="mb-4 opacity-60">{icon}</div>
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
        {heading}
      </h3>
      <p className="text-sm text-[var(--color-text-secondary)] max-w-sm">{body}</p>
    </div>
  );
}

// ─── Mobile Modal / Desktop Modal Detection ───────────────────────────────────

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
}

// ─── Event Detail Overlay ─────────────────────────────────────────────────────

interface EventDetailOverlayProps {
  eventId: string;
  onClose: () => void;
}

function EventDetailOverlay({ eventId, onClose }: EventDetailOverlayProps): JSX.Element {
  const isMobile = useIsMobile();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (isMobile) {
    // Bottom drawer on mobile
    return (
      <motion.div
        className="fixed inset-0 z-50 flex flex-col justify-end"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-[var(--color-bg-overlay)]"
          onClick={onClose}
          aria-hidden="true"
        />
        <motion.div
          className="relative z-10 bg-[var(--color-bg-surface)] rounded-t-2xl max-h-[90vh] overflow-y-auto"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 35 }}
          role="dialog"
          aria-modal="true"
          aria-label="Event details"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-[var(--color-border)]" />
          </div>
          <EventDetail eventId={eventId} onClose={onClose} />
        </motion.div>
      </motion.div>
    );
  }

  // Centered modal on desktop
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[var(--color-bg-overlay)]"
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        className="relative z-10 bg-[var(--color-bg-surface)] rounded-xl shadow-[var(--shadow-modal,0_24px_64px_rgba(0,0,0,0.7))] w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        role="dialog"
        aria-modal="true"
        aria-label="Event details"
      >
        <EventDetail eventId={eventId} onClose={onClose} />
      </motion.div>
    </motion.div>
  );
}

// ─── EventsGrid ───────────────────────────────────────────────────────────────

export function EventsGrid({
  initialTab = "upcoming",
  initialEvents,
  categories,
}: EventsGridProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<EventTab>(initialTab);
  const [filterState, setFilterState] = useState<FilterState>({ search: "" });
  const [events, setEvents] = useState<EventCardType[]>(initialEvents);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Reduced motion detection
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const debouncedSearch = useDebounce(filterState.search, 300);

  const variants = prefersReducedMotion ? reducedMotionFallback : fadeUp;
  const containerVariants = prefersReducedMotion
    ? { hidden: {}, visible: {} }
    : staggerContainer;

  // ── Fetch events ──────────────────────────────────────────────────────────

  const fetchEvents = useCallback(
    async (tab: EventTab, filter: FilterState, cursor?: string) => {
      const params = new URLSearchParams();
      params.set("tab", tab);
      params.set("take", "20");
      if (filter.search) params.set("search", filter.search);
      if (filter.categoryId) params.set("categoryId", filter.categoryId);
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/events?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`);
      return res.json() as Promise<{
        data: EventCardType[];
        nextCursor?: string;
        total: number;
      }>;
    },
    []
  );

  // Initial fetch + refetch on tab or filter change
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setEvents([]);
      setNextCursor(undefined);
      setHasMore(false);

      try {
        const result = await fetchEvents(activeTab, { ...filterState, search: debouncedSearch });
        if (cancelled) return;
        setEvents(result.data);
        setNextCursor(result.nextCursor);
        setHasMore(!!result.nextCursor);
      } catch (err) {
        console.error("[EventsGrid] fetch error:", err);
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, debouncedSearch, filterState.categoryId]);

  // ── Infinite scroll ───────────────────────────────────────────────────────

  const loadMore = useCallback(async () => {
    if (isFetchingMore || !hasMore || !nextCursor) return;
    setIsFetchingMore(true);

    try {
      const result = await fetchEvents(
        activeTab,
        { ...filterState, search: debouncedSearch },
        nextCursor
      );
      setEvents((prev) => [...prev, ...result.data]);
      setNextCursor(result.nextCursor);
      setHasMore(!!result.nextCursor);
    } catch (err) {
      console.error("[EventsGrid] load more error:", err);
    } finally {
      setIsFetchingMore(false);
    }
  }, [isFetchingMore, hasMore, nextCursor, fetchEvents, activeTab, filterState, debouncedSearch]);

  const { ref: sentinelRef } = useInfiniteScroll(loadMore, { threshold: 0.1 });

  // ── Tab switching ─────────────────────────────────────────────────────────

  const handleTabChange = useCallback((tab: EventTab) => {
    setActiveTab(tab);
    setFilterState({ search: "", categoryId: undefined });
    setSelectedEventId(null);
  }, []);

  // ── Filter change ─────────────────────────────────────────────────────────

  const handleFilterChange = useCallback((next: FilterState) => {
    setFilterState(next);
    setSelectedEventId(null);
  }, []);

  // ── Card click ────────────────────────────────────────────────────────────

  const handleCardClick = useCallback((eventId: string) => {
    setSelectedEventId(eventId);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedEventId(null);
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <section className="w-full">
      {/* ── Tab Bar ── */}
      <div
        className="relative flex items-center gap-1 border-b border-[var(--color-border)] mb-6"
        role="tablist"
        aria-label="Event tabs"
      >
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeTab === key}
            aria-controls={`events-panel-${key}`}
            id={`events-tab-${key}`}
            onClick={() => handleTabChange(key)}
            className={`
              relative px-6 py-3 text-sm font-medium rounded-t-lg transition-colors duration-150
              focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-inset
              ${
                activeTab === key
                  ? "text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }
            `}
          >
            {label}
            {/* Sliding indicator */}
            {activeTab === key && (
              <motion.span
                layoutId="event-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[var(--color-accent)]"
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <div className="mb-6">
        <EventsFilter
          state={filterState}
          onChange={handleFilterChange}
          categories={categories}
        />
      </div>

      {/* ── Event Grid Panel ── */}
      <div
        id={`events-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`events-tab-${activeTab}`}
      >
        {isLoading ? (
          <GridSkeleton />
        ) : events.length === 0 ? (
          <EmptyEvents tab={activeTab} />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTab}-${debouncedSearch}-${filterState.categoryId ?? ""}`}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {events.map((event) => (
                <motion.div key={event.id} variants={variants}>
                  <EventCard
                    event={event}
                    onClick={() => handleCardClick(event.id)}
                  />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {/* ── Infinite Scroll Sentinel (past tab only) ── */}
        {activeTab === "past" && !isLoading && hasMore && (
          <div
            ref={sentinelRef}
            className="flex justify-center py-8"
            aria-hidden="true"
          >
            {isFetchingMore && <Spinner size="md" label="Loading more events" />}
          </div>
        )}

        {/* ── Load more indicator for other tabs if needed ── */}
        {activeTab !== "past" && isFetchingMore && (
          <div className="flex justify-center py-8">
            <Spinner size="md" label="Loading more events" />
          </div>
        )}
      </div>

      {/* ── Event Detail Overlay ── */}
      <AnimatePresence>
        {selectedEventId && (
          <EventDetailOverlay
            key={selectedEventId}
            eventId={selectedEventId}
            onClose={handleCloseDetail}
          />
        )}
      </AnimatePresence>
    </section>
  );
}