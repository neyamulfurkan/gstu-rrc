// src/components/home/HomeSections.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

import { cn, formatDate, cloudinaryUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/Feedback";
import { EmptyState } from "@/components/ui/DataDisplay";
import type {
  WhyJoinCard,
  AdvisorEntry,
  ClubConfigPublic,
  InstrumentCard,
} from "@/types/index";

// ─── Animation Variants ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 20 },
  },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] as number[] },
  },
};

const slideInLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 80, damping: 18 },
  },
};

const reducedMotionFallback = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.1 } },
};

// ─── Reduced Motion Hook ──────────────────────────────────────────────────────

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}

// ─── Dynamic Lucide Icon ──────────────────────────────────────────────────────

interface DynamicIconProps {
  name: string;
  size?: number;
  className?: string;
}

function DynamicIcon({ name, size = 24, className }: DynamicIconProps): JSX.Element | null {
  const [Icon, setIcon] = useState<React.ComponentType<{ size?: number; className?: string }> | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("lucide-react")
      .then((mod) => {
        if (!cancelled) {
          const IconComp = (mod as Record<string, unknown>)[name] as
            | React.ComponentType<{ size?: number; className?: string }>
            | undefined;
          if (IconComp) setIcon(() => IconComp);
        }
      })
      .catch(() => {
        // silently fail — icon name may be invalid
      });
    return () => {
      cancelled = true;
    };
  }, [name]);

  if (!Icon) {
    return (
      <div
        style={{ width: size, height: size }}
        className={cn("rounded bg-[var(--color-bg-elevated)]", className)}
        aria-hidden="true"
      />
    );
  }

  return <Icon size={size} className={className} />;
}

// ─── WhyJoinSection ───────────────────────────────────────────────────────────

interface WhyJoinSectionProps {
  cards: WhyJoinCard[];
}

export function WhyJoinSection({ cards }: WhyJoinSectionProps): JSX.Element {
  const reduced = useReducedMotion();
  const itemVariant = reduced ? reducedMotionFallback : fadeUp;
  const containerVariant = reduced ? reducedMotionFallback : staggerContainer;

  const sorted = [...cards].sort((a, b) => a.sortOrder - b.sortOrder);

  if (sorted.length === 0) {
    return (
      <section
        aria-label="Why join section"
        className="py-20 px-6 bg-[var(--color-bg-base)]"
      />
    );
  }

  return (
    <section
      aria-label="Why join us"
      className="py-20 px-6 bg-[var(--color-bg-base)] relative overflow-hidden"
    >
      {/* Background decoration */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 50% 0%, var(--color-primary) 0%, transparent 60%)",
          opacity: 0.04,
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section header */}
        <motion.div
          className="text-center mb-14"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={reduced ? reducedMotionFallback : fadeUp}
        >
          <span
            className="inline-block mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)] font-[var(--font-mono)]"
          >
            Membership Benefits
          </span>
          <h2
            className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)] leading-tight"
          >
            Why Join the Club?
          </h2>
          <p className="mt-4 text-[var(--color-text-secondary)] text-base max-w-xl mx-auto leading-relaxed">
            Be part of a community that builds, researches, and innovates. Here&apos;s what you gain.
          </p>
        </motion.div>

        {/* Cards grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={containerVariant}
        >
          {sorted.map((card) => (
            <motion.article
              key={card.id}
              variants={itemVariant}
              className={cn(
                "group relative rounded-xl border border-[var(--color-border)] p-6",
                "bg-[var(--color-bg-surface)] transition-all duration-300",
                "hover:-translate-y-1.5 hover:border-[var(--color-card-border-hover)]",
                "hover:shadow-[0_0_16px_var(--color-glow-accent)]",
                "focus-within:border-[var(--color-accent)]"
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  "mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl",
                  "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
                  "group-hover:bg-[var(--color-primary)]/20 transition-colors duration-300"
                )}
                aria-hidden="true"
              >
                <DynamicIcon name={card.icon} size={22} />
              </div>

              {/* Heading */}
              <h3 className="text-base font-bold text-[var(--color-text-primary)] font-[var(--font-heading)] mb-2 leading-snug">
                {card.heading}
              </h3>

              {/* Description */}
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                {card.description}
              </p>

              {/* Learn more link */}
              {card.learnMoreUrl && (
                <Link
                  href={card.learnMoreUrl}
                  className={cn(
                    "mt-4 inline-flex items-center gap-1.5 text-xs font-semibold",
                    "text-[var(--color-accent)] hover:underline",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 rounded"
                  )}
                >
                  Learn more
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M2 6h8M7 3l3 3-3 3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              )}

              {/* Decorative corner accent */}
              <div
                className="absolute top-0 right-0 w-16 h-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                aria-hidden="true"
                style={{
                  background:
                    "radial-gradient(circle at top right, var(--color-accent) 0%, transparent 70%)",
                  opacity: 0,
                }}
              />
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── AdvisorsSection ──────────────────────────────────────────────────────────

interface AdvisorsSectionProps {
  advisors: AdvisorEntry[];
}

export function AdvisorsSection({ advisors }: AdvisorsSectionProps): JSX.Element {
  const reduced = useReducedMotion();

  const currentAdvisors = advisors.filter((a) => a.isCurrent);
  const exAdvisors = advisors.filter((a) => !a.isCurrent);

  if (advisors.length === 0) return <></>;

  return (
    <section
      aria-label="Advisors"
      className="py-20 px-6 bg-[var(--color-bg-surface)]"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-14"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={reduced ? reducedMotionFallback : fadeUp}
        >
          <span className="inline-block mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)] font-[var(--font-mono)]">
            Our Mentors
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)]">
            Faculty Advisors
          </h2>
        </motion.div>

        {/* Current advisors */}
        {currentAdvisors.length > 0 && (
          <motion.div
            className="space-y-8 mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={reduced ? reducedMotionFallback : staggerContainer}
          >
            {currentAdvisors.map((advisor) => (
              <motion.article
                key={advisor.id}
                variants={reduced ? reducedMotionFallback : slideInLeft}
                className={cn(
                  "flex flex-col md:flex-row gap-6 rounded-xl border border-[var(--color-border)]",
                  "bg-[var(--color-bg-elevated)] p-6 transition-all duration-300",
                  "hover:border-[var(--color-primary)]/40",
                  advisor.member?.username ? "cursor-pointer" : ""
                )}
                onClick={() => {
                  if (advisor.member?.username) {
                    window.location.href = `/members/${advisor.member.username}`;
                  }
                }}
                role={advisor.member?.username ? "link" : undefined}
                tabIndex={advisor.member?.username ? 0 : undefined}
                onKeyDown={(e) => {
                  if (advisor.member?.username && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    window.location.href = `/members/${advisor.member.username}`;
                  }
                }}
              >
                {/* Photo */}
                <div className="flex-shrink-0">
                  <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-xl overflow-hidden border border-[var(--color-border)]">
                    {advisor.photoUrl ? (
                      <Image
                        src={cloudinaryUrl(advisor.photoUrl, { width: 128, height: 128 })}
                        alt={`Photo of ${advisor.name}`}
                        fill
                        sizes="128px"
                        className="object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] text-2xl font-bold font-[var(--font-display)]"
                        aria-hidden="true"
                      >
                        {advisor.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start gap-2 mb-1">
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)] font-[var(--font-heading)]">
                      {advisor.member?.username ? (
                        <Link
                          href={`/members/${advisor.member.username}`}
                          className="hover:text-[var(--color-accent)] transition-colors focus:outline-none focus:underline inline-flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {advisor.name}
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="opacity-60">
                            <path d="M2 10L10 2M10 2H5M10 2v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </Link>
                      ) : (
                        advisor.name
                      )}
                    </h3>
                    <Badge variant="accent" size="sm">
                      Current
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-[var(--color-primary)] mb-0.5">
                    {advisor.designation}
                  </p>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                    {advisor.institution}
                  </p>

                  {advisor.bio && (
                    <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-4 line-clamp-3">
                      {advisor.bio}
                    </p>
                  )}

                  {/* Research interests */}
                  {advisor.researchInterests.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {advisor.researchInterests.map((interest, idx) => (
                        <span
                          key={idx}
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                            "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20"
                          )}
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Social links */}
                  {advisor.email && (
                    <a
                      href={`mailto:${advisor.email}`}
                      className={cn(
                        "text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors",
                        "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
                      )}
                    >
                      {advisor.email}
                    </a>
                  )}
                </div>
              </motion.article>
            ))}
          </motion.div>
        )}

        {/* Ex-advisors */}
        {exAdvisors.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] font-[var(--font-mono)] mb-6">
              Former Advisors
            </h3>
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={reduced ? reducedMotionFallback : staggerContainer}
            >
              {exAdvisors.map((advisor) => (
                <motion.div
                  key={advisor.id}
                  variants={reduced ? reducedMotionFallback : scaleIn}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border border-[var(--color-border)] p-3",
                    "bg-[var(--color-bg-surface)] opacity-70 hover:opacity-100 transition-opacity duration-200"
                  )}
                >
                  <div className="relative w-10 h-10 flex-shrink-0 rounded-full overflow-hidden border border-[var(--color-border)]">
                    {advisor.photoUrl ? (
                      <Image
                        src={cloudinaryUrl(advisor.photoUrl, { width: 40, height: 40 })}
                        alt={`Photo of ${advisor.name}`}
                        fill
                        sizes="40px"
                        className="object-cover grayscale"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] text-sm font-bold">
                        {advisor.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate">
                      {advisor.name}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)] truncate">
                      {advisor.periodStart && advisor.periodEnd
                        ? `${advisor.periodStart}–${advisor.periodEnd}`
                        : advisor.designation}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── CTABanner ────────────────────────────────────────────────────────────────

interface CTABannerProps {
  config: ClubConfigPublic;
}

export function CTABanner({ config }: CTABannerProps): JSX.Element {
  const reduced = useReducedMotion();
  const { status } = useSession();

  if (status === "authenticated") return <></>;

  return (
    <section
      aria-label="Call to action"
      className="py-20 px-6 bg-[var(--color-bg-base)]"
    >
      <motion.div
        className={cn(
          "max-w-4xl mx-auto rounded-2xl border border-[var(--color-primary)]/20",
          "bg-[var(--color-primary)]/10 p-10 md:p-14 text-center",
          "relative overflow-hidden"
        )}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={reduced ? reducedMotionFallback : scaleIn}
      >
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse at center, var(--color-primary) 0%, transparent 70%)",
            opacity: 0.06,
          }}
        />

        {/* Circuit decoration */}
        <div
          className="absolute top-4 right-4 w-24 h-24 opacity-10 pointer-events-none"
          aria-hidden="true"
        >
          <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="48" cy="48" r="40" stroke="var(--color-accent)" strokeWidth="1" strokeDasharray="4 4" />
            <circle cx="48" cy="48" r="24" stroke="var(--color-primary)" strokeWidth="1" />
            <circle cx="48" cy="48" r="4" fill="var(--color-accent)" />
          </svg>
        </div>

        <div className="relative z-10">
          <span className="inline-block mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)] font-[var(--font-mono)]">
            Join Us Today
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)] leading-tight mb-4">
            Ready to Build the Future?
          </h2>
          <p className="text-[var(--color-text-secondary)] text-base max-w-lg mx-auto leading-relaxed mb-8">
            {config.clubDescription
              ? config.clubDescription.slice(0, 160)
              : `Join ${config.clubName} and be part of a community that turns ideas into reality through robotics, research, and innovation.`}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {config.heroCtaLabel1 && config.heroCtaUrl1 && (
              <Link
                href={config.heroCtaUrl1}
                className={cn(
                  "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg",
                  "bg-[var(--color-primary)] text-white font-semibold text-sm",
                  "hover:opacity-90 active:scale-95 transition-all duration-150",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2"
                )}
              >
                {config.heroCtaLabel1}
              </Link>
            )}
            {config.heroCtaLabel2 && config.heroCtaUrl2 && (
              <Link
                href={config.heroCtaUrl2}
                className={cn(
                  "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg",
                  "border border-[var(--color-primary)]/40 text-[var(--color-primary)] font-semibold text-sm",
                  "hover:bg-[var(--color-primary)]/10 active:scale-95 transition-all duration-150",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2"
                )}
              >
                {config.heroCtaLabel2}
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    </section>
  );
}

// ─── InstrumentTeaser ─────────────────────────────────────────────────────────

interface InstrumentTeaserProps {
  instruments: InstrumentCard[];
}

function getStatusVariant(
  status: string
): "success" | "warning" | "error" | "neutral" {
  switch (status) {
    case "available":
      return "success";
    case "on_loan":
      return "warning";
    case "under_maintenance":
      return "error";
    default:
      return "neutral";
  }
}

function formatStatus(status: string): string {
  switch (status) {
    case "available":
      return "Available";
    case "on_loan":
      return "On Loan";
    case "under_maintenance":
      return "Maintenance";
    default:
      return status.replace(/_/g, " ");
  }
}

export function InstrumentTeaser({ instruments }: InstrumentTeaserProps): JSX.Element {
  const reduced = useReducedMotion();

  const displayed = instruments.slice(0, 6);

  if (displayed.length === 0) return <></>;

  return (
    <section
      aria-label="Instrument library"
      className="py-20 px-6 bg-[var(--color-bg-surface)]"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={reduced ? reducedMotionFallback : fadeUp}
        >
          <div>
            <span className="inline-block mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)] font-[var(--font-mono)]">
              Equipment Library
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)]">
              Instruments & Tools
            </h2>
            <p className="mt-2 text-[var(--color-text-secondary)] text-sm max-w-md">
              Members can borrow lab equipment and instruments for research and project work.
            </p>
          </div>
          <Link
            href="/instruments"
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
              "border border-[var(--color-border)] text-[var(--color-text-secondary)]",
              "hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] whitespace-nowrap flex-shrink-0"
            )}
          >
            View All
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M2.5 7h9M9 4l3 3-3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </motion.div>

        {/* Cards */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={reduced ? reducedMotionFallback : staggerContainer}
        >
          {displayed.map((instrument) => (
            <motion.article
              key={instrument.id}
              variants={reduced ? reducedMotionFallback : fadeUp}
              className={cn(
                "group rounded-xl border border-[var(--color-border)] overflow-hidden",
                "bg-[var(--color-bg-elevated)] transition-all duration-300",
                "hover:-translate-y-1 hover:border-[var(--color-card-border-hover)]",
                "hover:shadow-[0_0_16px_var(--color-glow-accent)]"
              )}
            >
              {/* Image */}
              <div className="relative h-40 overflow-hidden bg-[var(--color-bg-surface)]">
                {instrument.imageUrl ? (
                  <Image
                    src={instrument.imageUrl.startsWith("http") ? instrument.imageUrl : cloudinaryUrl(instrument.imageUrl, { width: 400, height: 160 })}
                    alt={instrument.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <DynamicIcon name="Wrench" size={32} className="text-[var(--color-text-secondary)] opacity-40" />
                  </div>
                )}
                {/* Status badge overlay */}
                <div className="absolute top-2.5 right-2.5">
                  <Badge variant={getStatusVariant(instrument.status)} size="sm">
                    {formatStatus(instrument.status)}
                  </Badge>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <p className="text-xs text-[var(--color-text-secondary)] mb-1 font-[var(--font-mono)] uppercase tracking-wider">
                  {instrument.category.name}
                </p>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)] font-[var(--font-heading)] mb-2 line-clamp-1">
                  {instrument.name}
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
                  {instrument.description}
                </p>

                {instrument.status === "on_loan" && instrument.borrower && (
                  <p className="mt-2 text-xs text-[var(--color-warning)]">
                    Borrowed by {instrument.borrower.fullName}
                    {instrument.returnDate && (
                      <> · Due {formatDate(instrument.returnDate, "short")}</>
                    )}
                  </p>
                )}
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── CertificationSpotlight ───────────────────────────────────────────────────

interface CertificationSpotlightProps {
  config: ClubConfigPublic;
}

export function CertificationSpotlight({ config }: CertificationSpotlightProps): JSX.Element {
  const reduced = useReducedMotion();

  return (
    <section
      aria-label="Certification program"
      className="py-20 px-6 bg-[var(--color-bg-base)] relative overflow-hidden"
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "linear-gradient(135deg, var(--color-accent-secondary) 0%, transparent 50%, var(--color-primary) 100%)",
          opacity: 0.04,
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text content */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={reduced ? reducedMotionFallback : slideInLeft}
          >
            <span className="inline-block mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)] font-[var(--font-mono)]">
              Recognition Program
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)] leading-tight mb-4">
              Earn Official Certificates
            </h2>
            <p className="text-[var(--color-text-secondary)] text-base leading-relaxed mb-8">
              Participate in events, contribute to projects, and complete training programs to earn
              verifiable digital certificates from {config.clubName}. Each certificate is
              blockchain-verifiable and shareable on LinkedIn.
            </p>

            <ul className="space-y-3 mb-8" aria-label="Certificate program benefits">
              {[
                "Event participation certificates",
                "Project contribution recognition",
                "Training program completion awards",
                "Leadership and committee certificates",
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)]">
                  <span
                    className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--color-success)]/20 flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M2 5l2 2 4-4"
                        stroke="var(--color-success)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href="/certificates"
              className={cn(
                "inline-flex items-center gap-2 px-6 py-3 rounded-lg",
                "bg-[var(--color-accent-secondary)] text-white font-semibold text-sm",
                "hover:opacity-90 active:scale-95 transition-all duration-150",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2"
              )}
            >
              View My Certificates
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M2.5 7h9M9 4l3 3-3 3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </motion.div>

          {/* Certificate sample mockup */}
          <motion.div
            className="relative"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={reduced ? reducedMotionFallback : scaleIn}
          >
            {/* Floating shadow cards (depth effect) */}
            <div
              className="absolute -bottom-3 -right-3 w-full h-full rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5"
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-1.5 -right-1.5 w-full h-full rounded-2xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5"
              aria-hidden="true"
            />

            {/* Main certificate card */}
            <div
              className={cn(
                "relative rounded-2xl border border-[var(--color-border)] overflow-hidden",
                "bg-[var(--color-bg-elevated)] p-8 shadow-[0_24px_64px_rgba(0,0,0,0.5)]"
              )}
              aria-label="Sample certificate preview"
            >
              {/* Blur overlay */}
              <div
                className="absolute inset-0 backdrop-blur-[2px]"
                aria-hidden="true"
              />

              {/* Certificate content (blurred mockup) */}
              <div className="relative z-10 text-center space-y-4 select-none" aria-hidden="true">
                {/* Logo placeholder */}
                <div className="mx-auto w-16 h-16 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center border border-[var(--color-primary)]/30">
                  {config.logoUrl ? (
                    <Image
                      src={cloudinaryUrl(config.logoUrl, { width: 64, height: 64 })}
                      alt=""
                      width={40}
                      height={40}
                      className="object-contain"
                    />
                  ) : (
                    <span className="text-xl font-bold text-[var(--color-primary)] font-[var(--font-display)]">
                      {config.clubShortName?.charAt(0) ?? "G"}
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-text-secondary)] font-[var(--font-mono)]">
                    Certificate of Achievement
                  </p>
                  <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
                    This is to certify that
                  </p>
                  <div className="mt-2 h-6 bg-[var(--color-bg-surface)] rounded-full w-40 mx-auto opacity-60" />
                </div>

                <div>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    has successfully completed
                  </p>
                  <div className="mt-2 h-5 bg-[var(--color-accent)]/20 rounded-full w-52 mx-auto opacity-70" />
                </div>

                {/* Decorative divider */}
                <div className="flex items-center gap-3 pt-2">
                  <div className="flex-1 h-px bg-[var(--color-border)]" />
                  <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]/40" />
                  <div className="flex-1 h-px bg-[var(--color-border)]" />
                </div>

                {/* Signature area */}
                <div className="flex justify-between items-end pt-1">
                  <div className="text-left">
                    <div className="h-4 bg-[var(--color-bg-surface)] rounded w-20 opacity-50 mb-1" />
                    <p className="text-xs text-[var(--color-text-secondary)] opacity-70">
                      President, {config.clubShortName}
                    </p>
                  </div>
                  {/* QR code placeholder */}
                  <div className="w-10 h-10 bg-[var(--color-bg-surface)] rounded border border-[var(--color-border)] opacity-60 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <rect x="2" y="2" width="6" height="6" rx="1" stroke="var(--color-text-secondary)" strokeWidth="1.5" />
                      <rect x="12" y="2" width="6" height="6" rx="1" stroke="var(--color-text-secondary)" strokeWidth="1.5" />
                      <rect x="2" y="12" width="6" height="6" rx="1" stroke="var(--color-text-secondary)" strokeWidth="1.5" />
                      <rect x="12" y="12" width="3" height="3" fill="var(--color-text-secondary)" opacity="0.5" />
                      <rect x="15" y="15" width="3" height="3" fill="var(--color-text-secondary)" opacity="0.5" />
                    </svg>
                  </div>
                </div>

                {/* Serial */}
                <p className="text-xs font-[var(--font-mono)] text-[var(--color-text-secondary)] opacity-50">
                  GSTU-2026-XXXXXXXX
                </p>
              </div>

              {/* "Sample" watermark */}
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                aria-hidden="true"
              >
                <span
                  className="text-5xl font-black uppercase tracking-widest text-[var(--color-primary)] opacity-[0.06] rotate-[-25deg] select-none font-[var(--font-display)]"
                >
                  Sample
                </span>
              </div>
            </div>

            {/* Verification badge */}
            <div
              className={cn(
                "absolute -top-3 -left-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full",
                "bg-[var(--color-success)]/20 border border-[var(--color-success)]/30",
                "text-xs font-semibold text-[var(--color-success)]"
              )}
              aria-hidden="true"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M2 5l2 2 4-4"
                  stroke="var(--color-success)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Verifiable
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}