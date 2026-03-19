// src/app/error.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps): JSX.Element {
  useEffect(() => {
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)] px-4">
      <div
        className={cn(
          "flex flex-col items-center text-center max-w-md w-full",
          "animate-[fadeUp_0.4s_ease-out_both]"
        )}
        style={
          {
            "--tw-animate-fadeUp": "fadeUp",
          } as React.CSSProperties
        }
      >
        {/* Icon */}
        <div
          className={cn(
            "mb-6 flex items-center justify-center rounded-full",
            "w-24 h-24 bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20"
          )}
        >
          <AlertTriangle
            size={48}
            className="text-[var(--color-warning)]"
            aria-hidden="true"
          />
        </div>

        {/* Heading */}
        <h1
          className={cn(
            "font-display text-2xl font-bold mb-3",
            "text-[var(--color-text-primary)]"
          )}
        >
          Something went wrong
        </h1>

        {/* Description */}
        <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed mb-4">
          An unexpected error occurred. We apologize for the inconvenience.
        </p>

        {/* Error digest */}
        {error.digest && (
          <div
            className={cn(
              "mb-6 w-full rounded-lg px-4 py-2.5",
              "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]"
            )}
          >
            <p className="text-xs text-[var(--color-text-secondary)] mb-0.5">
              Error reference:
            </p>
            <code className="font-mono text-xs text-[var(--color-text-secondary)] break-all">
              {error.digest}
            </code>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={reset}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5",
              "bg-[var(--color-accent)] text-[var(--color-bg-base)] font-semibold text-sm",
              "hover:opacity-90 active:scale-95 transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2",
              "focus:ring-offset-[var(--color-bg-base)]"
            )}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Try Again
          </button>

          <Link
            href="/"
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5",
              "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] font-semibold text-sm",
              "border border-[var(--color-border)]",
              "hover:bg-[var(--color-bg-surface)] active:scale-95 transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2",
              "focus:ring-offset-[var(--color-bg-base)]"
            )}
          >
            <Home size={16} aria-hidden="true" />
            Return Home
          </Link>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-\\[fadeUp_0\\.4s_ease-out_both\\] {
          animation: fadeUp 0.4s ease-out both;
        }
      `}</style>
    </div>
  );
}