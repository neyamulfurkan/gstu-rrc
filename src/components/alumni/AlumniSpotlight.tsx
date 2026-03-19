// src/components/alumni/AlumniSpotlight.tsx

import Image from "next/image";
import Link from "next/link";
import type { AlumniSpotlightEntry } from "@/types/index";
import { cn } from "@/lib/utils";

interface AlumniSpotlightProps {
  spotlights: AlumniSpotlightEntry[];
}

export function AlumniSpotlight({ spotlights }: AlumniSpotlightProps): JSX.Element {
  const displaySpotlights = spotlights.slice(0, 3);

  if (displaySpotlights.length === 0) {
    return <></>;
  }

  return (
    <section className="w-full mb-12">
      <div className="mb-6">
        <h2
          className="font-display text-2xl font-bold text-[var(--color-text-primary)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Alumni Spotlight
        </h2>
        <p className="text-[var(--color-text-secondary)] mt-1 text-sm">
          Inspiring stories from our distinguished alumni
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {displaySpotlights.map((spotlight, index) => {
          const isEven = index % 2 === 0;

          return (
            <article
              key={spotlight.id}
              className={cn(
                "rounded-xl border p-6 flex flex-col gap-4",
                "bg-[var(--color-bg-surface)] border-[var(--color-border)]",
                "md:flex-row md:items-center md:gap-8",
                !isEven && "md:flex-row-reverse"
              )}
            >
              {/* Image Section */}
              <div className="flex-shrink-0 flex justify-center md:justify-start">
                <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-[var(--color-accent)]">
                  {spotlight.photoUrl ? (
                    <Image
                      src={spotlight.photoUrl}
                      alt={`${spotlight.name} — ${spotlight.position} at ${spotlight.company}`}
                      fill
                      className="object-cover"
                      sizes="128px"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-2xl font-bold text-white"
                      style={{ background: "var(--color-accent)" }}
                      aria-label={spotlight.name}
                    >
                      {spotlight.name
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((w) => w[0].toUpperCase())
                        .join("")}
                    </div>
                  )}
                </div>
              </div>

              {/* Content Section */}
              <div className="flex-1 min-w-0">
                {/* Name */}
                <div className="mb-1">
                  {spotlight.memberId ? (
                    <Link
                      href={`/alumni/${spotlight.memberId}`}
                      className="font-display text-xl font-bold text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {spotlight.name}
                    </Link>
                  ) : (
                    <span
                      className="font-display text-xl font-bold text-[var(--color-text-primary)]"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {spotlight.name}
                    </span>
                  )}
                </div>

                {/* Position and Company */}
                <p className="text-[var(--color-text-secondary)] text-sm mb-2">
                  {spotlight.position}
                  {spotlight.company && (
                    <>
                      {" "}
                      <span className="text-[var(--color-text-primary)] font-medium">
                        at {spotlight.company}
                      </span>
                    </>
                  )}
                </p>

                {/* Session Badge */}
                {spotlight.session && (
                  <span
                    className="inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-3"
                    style={{
                      backgroundColor: "var(--color-accent-dim, rgba(0,229,255,0.12))",
                      color: "var(--color-accent)",
                      border: "1px solid var(--color-accent)",
                    }}
                  >
                    Session {spotlight.session}
                  </span>
                )}

                {/* Quote */}
                {spotlight.quote && (
                  <blockquote className="border-l-2 border-[var(--color-accent)] pl-4 italic text-[var(--color-text-secondary)] text-sm leading-relaxed">
                    &ldquo;{spotlight.quote}&rdquo;
                  </blockquote>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}