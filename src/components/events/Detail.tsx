// src/components/events/Detail.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import useSWR from "swr";
import {
  Calendar,
  Clock,
  ExternalLink,
  Facebook,
  Link2,
  MapPin,
  Share2,
  User,
  Users,
  X,
} from "lucide-react";

import { cn, formatDate } from "@/lib/utils";
import { Badge, Skeleton, Spinner } from "@/components/ui/Feedback";
import {
  Drawer,
  DropdownMenu,
  DropdownMenuDivider,
  DropdownMenuItem,
  Lightbox,
  Modal,
} from "@/components/ui/Overlay";
import type { EventDetail as EventDetailType, GalleryItemCard } from "@/types/index";

// ─── Dynamic Imports ──────────────────────────────────────────────────────────

interface RichTextRendererProps {
  content: unknown;
}

const RichTextRenderer = dynamic<RichTextRendererProps>(
  () =>
    (async () => {
      const Fallback = ({ content }: RichTextRendererProps) => (
        <div className="text-[var(--color-text-secondary)] text-sm italic">
          {typeof content === "string" ? content : "Description not available."}
        </div>
      );
      Fallback.displayName = "RichTextRendererFallback";
      return { default: Fallback as React.ComponentType<RichTextRendererProps> };
    })(),
  { ssr: false, loading: () => <Skeleton className="h-32 w-full" rounded="md" /> }
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

function deriveEventStatus(
  startDate: Date | string,
  endDate?: Date | string | null
): { label: string; variant: "success" | "warning" | "neutral" } {
  const now = Date.now();
  const start = new Date(startDate).getTime();
  const end = endDate ? new Date(endDate).getTime() : null;

  if (start > now) {
    return { label: "Upcoming", variant: "warning" };
  }
  if (end && end >= now) {
    return { label: "Ongoing", variant: "success" };
  }
  return { label: "Past", variant: "neutral" };
}

function buildGoogleMapsUrl(venue: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`;
}

function buildFbShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

function getEventPermalink(slug: string): string {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_BASE_URL ?? "";
  return `${base}/events/${slug}`;
}

// ─── Skeleton Loading State ───────────────────────────────────────────────────

function EventDetailSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col">
      <Skeleton className="w-full h-[300px] rounded-none" />
      <div className="p-6 space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-8 w-3/4 rounded-md" />
        <Skeleton className="h-4 w-1/2 rounded-md" />
        <Skeleton className="h-4 w-2/5 rounded-md" />
        <Skeleton className="h-32 w-full rounded-md" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-10 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Gallery Thumbnail Strip ──────────────────────────────────────────────────

interface GalleryStripProps {
  items: GalleryItemCard[];
}

function GalleryStrip({ items }: GalleryStripProps): JSX.Element | null {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (items.length === 0) return null;

  const lightboxImages = items.map((item) => ({
    src: item.url,
    alt: item.altText,
    title: item.title ?? undefined,
  }));

  function openAt(index: number) {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }

  return (
    <section aria-label="Event gallery">
      <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
        Gallery
      </h3>
      <div
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[var(--color-border)]"
        role="list"
      >
        {items.map((item, idx) => (
          <button
            key={item.id}
            role="listitem"
            onClick={() => openAt(idx)}
            aria-label={`View ${item.title ?? `gallery image ${idx + 1}`}`}
            className={cn(
              "relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden",
              "border border-[var(--color-border)] hover:border-[var(--color-card-border-hover)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              "transition-all duration-150 group"
            )}
          >
            <Image
              src={item.url}
              alt={item.altText}
              fill
              sizes="80px"
              className="object-cover transition-transform duration-200 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      <Lightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </section>
  );
}

// ─── Attendees Row ────────────────────────────────────────────────────────────

interface AttendeesRowProps {
  attendees: EventDetailType["attendees"];
}

function AttendeesRow({ attendees }: AttendeesRowProps): JSX.Element | null {
  if (attendees.length === 0) return null;

  const MAX_VISIBLE = 6;
  const visible = attendees.slice(0, MAX_VISIBLE);
  const overflow = attendees.length - MAX_VISIBLE;

  return (
    <section aria-label="Attendees">
      <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
        Attendees
      </h3>
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2" role="list">
          {visible.map((member) => (
            <div
              key={member.id}
              role="listitem"
              title={member.fullName}
              className={cn(
                "relative w-9 h-9 rounded-full overflow-hidden",
                "border-2 border-[var(--color-bg-elevated)]",
                "flex-shrink-0"
              )}
            >
              {member.avatarUrl ? (
                <Image
                  src={member.avatarUrl}
                  alt={member.fullName}
                  fill
                  sizes="36px"
                  className="object-cover"
                />
              ) : (
                <div
                  className="w-full h-full bg-[var(--color-bg-surface)] flex items-center justify-center"
                  aria-hidden="true"
                >
                  <User size={14} className="text-[var(--color-text-secondary)]" />
                </div>
              )}
            </div>
          ))}
          {overflow > 0 && (
            <div
              className={cn(
                "relative w-9 h-9 rounded-full",
                "border-2 border-[var(--color-bg-elevated)]",
                "bg-[var(--color-bg-surface)] flex items-center justify-center",
                "text-xs font-medium text-[var(--color-text-secondary)]"
              )}
              aria-label={`${overflow} more attendees`}
            >
              +{overflow}
            </div>
          )}
        </div>
        <span className="text-sm text-[var(--color-text-secondary)] flex items-center gap-1.5">
          <Users size={14} aria-hidden="true" />
          {attendees.length} {attendees.length === 1 ? "person" : "people"} attending
        </span>
      </div>
    </section>
  );
}

// ─── Share Dropdown ───────────────────────────────────────────────────────────

interface ShareDropdownProps {
  slug: string;
  title: string;
}

function ShareDropdown({ slug, title }: ShareDropdownProps): JSX.Element {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleCopyLink() {
    const url = getEventPermalink(slug);
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        timeoutRef.current = setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        // Fallback for environments without clipboard API
        const el = document.createElement("textarea");
        el.value = url;
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        setCopied(true);
        timeoutRef.current = setTimeout(() => setCopied(false), 2000);
      });
  }

  function handleFbShare() {
    const url = getEventPermalink(slug);
    window.open(buildFbShareUrl(url), "_blank", "noopener,noreferrer,width=600,height=400");
  }

  return (
    <DropdownMenu
      trigger={
        <button
          type="button"
          aria-label="Share event"
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium",
            "bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)]",
            "hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]",
            "border border-[var(--color-border)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
            "transition-colors duration-150"
          )}
        >
          <Share2 size={15} aria-hidden="true" />
          Share
        </button>
      }
      align="right"
    >
      <DropdownMenuItem
        onClick={handleCopyLink}
        icon={<Link2 size={14} aria-hidden="true" />}
      >
        {copied ? "Copied!" : "Copy Link"}
      </DropdownMenuItem>
      <DropdownMenuDivider />
      <DropdownMenuItem
        onClick={handleFbShare}
        icon={<Facebook size={14} aria-hidden="true" />}
      >
        Share on Facebook
      </DropdownMenuItem>
    </DropdownMenu>
  );
}

// ─── Event Detail Content ─────────────────────────────────────────────────────

interface EventDetailContentProps {
  event: EventDetailType;
  onClose?: () => void;
  standalone?: boolean;
}

function EventDetailContent({
  event,
  onClose,
  standalone,
}: EventDetailContentProps): JSX.Element {
  const status = deriveEventStatus(event.startDate, event.endDate);

  const startFull = formatDate(event.startDate, "full");
  const endFull = event.endDate ? formatDate(event.endDate, "full") : null;

  const mapsUrl = event.mapLink ?? buildGoogleMapsUrl(event.venue);

  return (
    <article className="flex flex-col">
      {/* Cover Image */}
      <div className="relative w-full h-[300px] flex-shrink-0 overflow-hidden bg-[var(--color-bg-surface)]">
        {event.coverUrl ? (
          <Image
            src={event.coverUrl}
            alt={event.title}
            fill
            sizes="(max-width: 768px) 100vw, 672px"
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[var(--color-bg-surface)]">
            <Calendar size={48} className="text-[var(--color-text-secondary)]" aria-hidden="true" />
          </div>
        )}
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(6,11,20,0.9) 0%, rgba(6,11,20,0.3) 40%, transparent 100%)",
          }}
          aria-hidden="true"
        />

        {/* Badges overlaid on cover */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2 flex-wrap">
          <Badge
            variant={
              status.variant === "success"
                ? "success"
                : status.variant === "warning"
                ? "warning"
                : "neutral"
            }
          >
            {status.label}
          </Badge>
          {event.category?.name && (
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white border border-white/20"
              style={{ backgroundColor: event.category.color ?? "var(--color-primary)" }}
            >
              {event.category.name}
            </span>
          )}
          {event.registrationEnabled && (
            <Badge variant="accent">Registration Open</Badge>
          )}
        </div>

        {/* Close button for non-standalone mode */}
        {!standalone && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close event detail"
            className={cn(
              "absolute top-4 right-4 p-2 rounded-full",
              "bg-black/50 text-white hover:bg-black/70",
              "focus:outline-none focus:ring-2 focus:ring-white/50",
              "transition-colors duration-150"
            )}
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-6 space-y-5 overflow-y-auto">
        {/* Title */}
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] font-[var(--font-heading)] leading-tight">
          {event.title}
        </h2>

        {/* Meta rows */}
        <div className="space-y-2.5">
          {/* Date */}
          <div className="flex items-start gap-2.5 text-sm text-[var(--color-text-secondary)]">
            <Calendar
              size={16}
              className="text-[var(--color-accent)] mt-0.5 flex-shrink-0"
              aria-hidden="true"
            />
            <div>
              <span className="text-[var(--color-text-primary)]">{startFull}</span>
              {endFull && (
                <>
                  <span className="mx-2 text-[var(--color-text-secondary)]">→</span>
                  <span className="text-[var(--color-text-primary)]">{endFull}</span>
                </>
              )}
              {event.allDay && (
                <span className="ml-2 text-xs text-[var(--color-text-secondary)]">(All day)</span>
              )}
            </div>
          </div>

          {/* Venue */}
          <div className="flex items-center gap-2.5 text-sm">
            <MapPin
              size={16}
              className="text-[var(--color-accent)] flex-shrink-0"
              aria-hidden="true"
            />
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "text-[var(--color-text-primary)] hover:text-[var(--color-accent)]",
                "underline underline-offset-2 decoration-[var(--color-border)]",
                "hover:decoration-[var(--color-accent)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded",
                "transition-colors duration-150 inline-flex items-center gap-1"
              )}
              aria-label={`View ${event.venue} on Google Maps`}
            >
              {event.venue}
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          </div>

          {/* Organizer */}
          {event.organizerName && (
            <div className="flex items-center gap-2.5 text-sm text-[var(--color-text-secondary)]">
              <User
                size={16}
                className="text-[var(--color-accent)] flex-shrink-0"
                aria-hidden="true"
              />
              <span>
                Organized by{" "}
                <span className="text-[var(--color-text-primary)] font-medium">
                  {event.organizerName}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Divider */}
        <hr className="border-[var(--color-border)]" />

        {/* Rich Text Description */}
        {event.description && (
          <section aria-label="Event description">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
              About this Event
            </h3>
            <div className="prose prose-sm max-w-none text-[var(--color-text-primary)]">
              <RichTextRenderer content={event.description as unknown} />
            </div>
          </section>
        )}

        {/* Gallery Strip */}
        {event.galleryItems && event.galleryItems.length > 0 && (
          <>
            <hr className="border-[var(--color-border)]" />
            <GalleryStrip items={event.galleryItems} />
          </>
        )}

        {/* Attendees */}
        {event.attendees && event.attendees.length > 0 && (
          <>
            <hr className="border-[var(--color-border)]" />
            <AttendeesRow attendees={event.attendees} />
          </>
        )}

        {/* Share */}
        <hr className="border-[var(--color-border)]" />
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--color-text-secondary)]">
            Share this event
          </span>
          <ShareDropdown slug={event.slug} title={event.title} />
        </div>
      </div>
    </article>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────

function EventDetailError({ onClose }: { onClose?: () => void }): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center p-12 gap-4 min-h-[300px]">
      <Clock size={40} className="text-[var(--color-error)]" aria-hidden="true" />
      <p className="text-[var(--color-text-primary)] font-medium">
        Failed to load event details
      </p>
      <p className="text-sm text-[var(--color-text-secondary)] text-center max-w-xs">
        The event could not be found or there was a network error. Please try again.
      </p>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "mt-2 px-4 py-2 rounded-lg text-sm font-medium",
            "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]",
            "hover:bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
            "transition-colors duration-150"
          )}
        >
          Close
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export interface EventDetailProps {
  eventId: string;
  onClose?: () => void;
  standalone?: boolean;
}

export function EventDetail({
  eventId,
  onClose,
  standalone = false,
}: EventDetailProps): JSX.Element {
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  // Detect mobile on mount and window resize
  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 768);
    }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const { data, error, isLoading } = useSWR<{ data: EventDetailType }>(
    eventId ? `/api/events/${eventId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  const event = data?.data;

  const handleClose = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  // ── Standalone Mode ─────────────────────────────────────────────────────────
  if (standalone) {
    if (isLoading) {
      return (
        <div className="max-w-3xl mx-auto">
          <EventDetailSkeleton />
        </div>
      );
    }

    if (error || !event) {
      return (
        <div className="max-w-3xl mx-auto">
          <EventDetailError onClose={onClose} />
        </div>
      );
    }

    return (
      <div className="max-w-3xl mx-auto bg-[var(--color-bg-elevated)] rounded-2xl overflow-hidden border border-[var(--color-border)]">
        <EventDetailContent event={event} standalone />
      </div>
    );
  }

  // ── Modal / Drawer Mode ─────────────────────────────────────────────────────

  // Loading content
  const loadingContent = <EventDetailSkeleton />;

  // Error content
  const errorContent = <EventDetailError onClose={handleClose} />;

  // Resolved content
  const resolvedContent = event ? (
    <EventDetailContent event={event} onClose={handleClose} standalone={false} />
  ) : null;

  const content = isLoading ? loadingContent : error || !event ? errorContent : resolvedContent;

  if (isMobile) {
    return (
      <Drawer
        isOpen={isOpen}
        onClose={handleClose}
        side="bottom"
        showCloseButton={false}
        className="max-h-[92vh]"
      >
        {content}
      </Drawer>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      showCloseButton={false}
      className="overflow-hidden"
    >
      {content}
    </Modal>
  );
}