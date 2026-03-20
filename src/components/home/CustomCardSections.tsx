// src/components/home/CustomCardSections.tsx
import React from "react";
import Link from "next/link";
import Image from "next/image";
import type { CustomCardSection } from "@/types/index";
import { cn } from "@/lib/utils";

interface CustomCardSectionsProps {
  sections: CustomCardSection[];
}

export function CustomCardSections({ sections }: CustomCardSectionsProps): JSX.Element {
  if (!sections || sections.length === 0) return <></>;

  return (
    <>
      {sections.map((section) => (
        <section
          key={section.id}
          aria-label={section.heading ?? "Custom section"}
          className="py-16 px-4 md:px-6 lg:px-8 bg-[var(--color-bg-surface)]"
        >
          <div className="max-w-7xl mx-auto">
            {(section.heading || section.subtitle) && (
              <div className="text-center mb-10">
                {section.heading && (
                  <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)]">
                    {section.heading}
                  </h2>
                )}
                {section.subtitle && (
                  <p className="mt-2 text-[var(--color-text-secondary)] text-sm max-w-xl mx-auto">
                    {section.subtitle}
                  </p>
                )}
              </div>
            )}

            {section.cards.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {section.cards.map((card) => (
                  <div
                    key={card.id}
                    className={cn(
                      "rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] overflow-hidden",
                      "transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-card-border-hover)]",
                      "hover:shadow-[0_0_16px_var(--color-glow-accent)]"
                    )}
                  >
                    {card.imageUrl && (
                      <div className="relative h-48 overflow-hidden">
                        <Image
                          src={card.imageUrl}
                          alt={card.heading}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="text-base font-bold text-[var(--color-text-primary)] font-[var(--font-heading)] mb-2">
                        {card.heading}
                      </h3>
                      {card.description &&
                        typeof card.description === "object" &&
                        (card.description as { content?: unknown[] }).content && (
                          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-4">
                            {(
                              card.description as {
                                content?: Array<{
                                  content?: Array<{ text?: string }>;
                                }>;
                              }
                            ).content
                              ?.flatMap((n) => n.content?.map((t) => t.text) ?? [])
                              .filter(Boolean)
                              .join(" ")}
                          </p>
                        )}
                      {card.buttonLabel && card.buttonUrl && (
                        <Link
                          href={card.buttonUrl}
                          className={cn(
                            "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
                            card.buttonStyle === "secondary"
                              ? "border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)]/40"
                              : card.buttonStyle === "ghost"
                              ? "text-[var(--color-primary)] hover:underline"
                              : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]",
                            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                          )}
                        >
                          {card.buttonLabel}
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ))}
    </>
  );
}