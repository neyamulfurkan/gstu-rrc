// src/app/not-found.tsx
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function NotFoundPage(): JSX.Element {
  return (
    <div
      className={cn(
        "relative min-h-screen flex items-center justify-center overflow-hidden",
        "bg-[var(--color-bg-base)]"
      )}
    >
      {/* Circuit board SVG texture background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cpath d='M10 10 H40 V40 H10 Z M60 10 H90 V40 H60 Z M10 60 H40 V90 H10 Z M60 60 H90 V90 H60 Z' stroke='%23ffffff' stroke-width='1' fill='none'/%3E%3Cpath d='M40 25 H60 M25 40 V60 M75 40 V60 M40 75 H60' stroke='%23ffffff' stroke-width='1'/%3E%3Ccircle cx='40' cy='25' r='2' fill='%23ffffff'/%3E%3Ccircle cx='60' cy='25' r='2' fill='%23ffffff'/%3E%3Ccircle cx='25' cy='40' r='2' fill='%23ffffff'/%3E%3Ccircle cx='75' cy='40' r='2' fill='%23ffffff'/%3E%3Ccircle cx='25' cy='60' r='2' fill='%23ffffff'/%3E%3Ccircle cx='75' cy='60' r='2' fill='%23ffffff'/%3E%3Ccircle cx='40' cy='75' r='2' fill='%23ffffff'/%3E%3Ccircle cx='60' cy='75' r='2' fill='%23ffffff'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "100px 100px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center">
        {/* 404 display */}
        <div
          className={cn(
            "font-display select-none leading-none",
            "text-[6rem] sm:text-[8rem] lg:text-[10rem]",
            "bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]",
            "bg-clip-text text-transparent"
          )}
          aria-label="404"
        >
          404
        </div>

        {/* Heading */}
        <h1
          className={cn(
            "mt-4 font-heading text-2xl font-bold tracking-tight",
            "text-[var(--color-text-primary)]"
          )}
        >
          Page Not Found
        </h1>

        {/* Description */}
        <p
          className={cn(
            "mt-3 max-w-md text-base leading-relaxed",
            "text-[var(--color-text-secondary)]"
          )}
        >
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        {/* Decorative divider */}
        <div
          aria-hidden="true"
          className={cn(
            "mt-8 mb-8 h-px w-24",
            "bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent"
          )}
        />

        {/* Action buttons */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
          <Link
            href="/"
            className={cn(
              "inline-flex items-center justify-center rounded-lg px-6 py-3",
              "font-semibold text-sm tracking-wide transition-all duration-200",
              "bg-[var(--color-primary)] text-[var(--color-bg-base)]",
              "hover:opacity-90 hover:shadow-[0_0_20px_var(--color-glow-primary)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-base)]"
            )}
          >
            Return to Home
          </Link>

          <Link
            href="/members"
            className={cn(
              "inline-flex items-center justify-center rounded-lg px-6 py-3",
              "font-semibold text-sm tracking-wide transition-all duration-200",
              "border border-[var(--color-text-secondary)] text-[var(--color-text-primary)]",
              "hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-base)]"
            )}
          >
            Browse Members
          </Link>
        </div>
      </div>
    </div>
  );
}