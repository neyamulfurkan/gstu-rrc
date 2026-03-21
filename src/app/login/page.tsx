// src/app/login/page.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import useSWR from "swr";

import { Input, PasswordInput } from "@/components/ui/Forms";
import { Alert, Spinner } from "@/components/ui/Feedback";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LoginPageProps {
  searchParams: {
    callbackUrl?: string;
    error?: string;
  };
}

interface PublicConfig {
  logoUrl?: string;
  clubName?: string;
  heroFallbackImg?: string;
  heroImages?: Array<{ url: string; order: number }>;
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── Error message mapping ────────────────────────────────────────────────────

function resolveErrorMessage(errorCode: string | undefined): string | null {
  if (!errorCode) return null;
  switch (errorCode) {
    case "CredentialsSignin":
      return "Invalid email/username or password. Please try again.";
    case "unauthorized":
      return "You are not authorized to access that page.";
    case "SessionRequired":
      return "Please log in to continue.";
    default:
      return "An error occurred. Please try again.";
  }
}

// ─── LoginPage ────────────────────────────────────────────────────────────────

export default function LoginPage({ searchParams }: LoginPageProps): JSX.Element {
  const router = useRouter();
  const { status } = useSession();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    resolveErrorMessage(searchParams.error)
  );
  const [shakeKey, setShakeKey] = useState(0);

  const { data: configData } = useSWR<{ data: PublicConfig }>("/api/config", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const config = configData?.data;

  // Redirect if already authenticated
  useEffect(() => {
    if (status === "authenticated") {
      router.push(searchParams.callbackUrl || "/profile");
    }
  }, [status, router, searchParams.callbackUrl]);

  // Determine hero image for the left panel
  const heroImage =
    config?.heroFallbackImg ||
    (config?.heroImages && config.heroImages.length > 0
      ? [...config.heroImages].sort((a, b) => a.order - b.order)[0]?.url
      : null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!identifier.trim() || !password) {
      setErrorMessage("Please enter your email/username and password.");
      setShakeKey((k) => k + 1);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await signIn("credentials", {
        identifier: identifier.trim(),
        password,
        redirect: false,
      });

      if (!result) {
        setErrorMessage("An unexpected error occurred. Please try again.");
        setShakeKey((k) => k + 1);
        return;
      }

      if (result.error) {
        const msg = resolveErrorMessage(result.error) ?? "Invalid credentials.";
        setErrorMessage(msg);
        setShakeKey((k) => k + 1);
        setPassword("");
        return;
      }

      // Success
      router.push(searchParams.callbackUrl || "/profile");
    } catch (err) {
      console.error("[LoginPage] signIn error:", err);
      setErrorMessage("An unexpected error occurred. Please try again.");
      setShakeKey((k) => k + 1);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Shake animation variant
  const shakeVariant = {
    animate: {
      x: [0, -10, 10, -6, 6, -3, 3, 0],
      transition: { duration: 0.45, ease: "easeInOut" },
    },
    initial: { x: 0 },
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)]">
        <Spinner size="lg" label="Checking session..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left Panel ─────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[var(--color-bg-base)] overflow-hidden">
        {heroImage ? (
          <Image
            src={heroImage}
            alt="GSTU Robotics Club"
            fill
            sizes="50vw"
            className="object-cover opacity-60"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-base)] via-[var(--color-bg-surface)] to-[var(--color-primary)]/20" />
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-bg-base)]/30 to-[var(--color-bg-base)]/70" />

        {/* Circuit board pattern overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M10 10h10v10H10zm20 0h10v10H30zm20 0h10v10H50zm-40 20h10v10H10zm20 0h10v10H30zm20 0h10v10H50zm-40 20h10v10H10zm20 0h10v10H30zm20 0h10v10H50zM15 15v10M35 15v10M55 15v10M15 35v10M35 35v10M55 35v10M20 20h10M40 20h10M20 40h10M40 40h10' stroke='%23ffffff' stroke-width='1' fill='none'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Left panel content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full pt-24">
          <div />

          <div className="space-y-4">
            <h2 className="font-display text-4xl font-bold text-[var(--color-text-primary)] leading-tight">
              Precision.
              <br />
              Curiosity.
              <br />
              Community.
            </h2>
            <p className="text-[var(--color-text-secondary)] text-lg max-w-sm">
              Join the community of engineers and researchers shaping tomorrow's technology.
            </p>
          </div>

          <div className="text-xs text-[var(--color-text-secondary)]">
            © {new Date().getFullYear()} {config?.clubName ?? "GSTU Robotics & Research Club"}. All rights reserved.
          </div>
        </div>
      </div>

      {/* ── Right Panel ────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-[var(--color-bg-base)] px-4 py-12 sm:px-6 lg:px-8 lg:max-w-[50%]">
        <div className="w-full max-w-md space-y-8" suppressHydrationWarning>
          {/* Mobile logo - only show when no left panel (small screens) */}
          <div className="flex flex-col items-center gap-3 lg:hidden">
            {config?.logoUrl && (
              <Image
                src={config.logoUrl}
                alt={config.clubName ?? "Club Logo"}
                width={48}
                height={48}
                className="rounded-xl object-contain"
              />
            )}
            {config?.clubName && (
              <span className="font-display text-lg font-bold text-[var(--color-text-primary)] tracking-wider text-center">
                {config.clubName}
              </span>
            )}
          </div>

          {/* Card with shake animation */}
          <motion.div
            key={shakeKey}
            variants={shakeVariant}
            initial="initial"
            animate={shakeKey > 0 ? "animate" : "initial"}
            className={cn(
              "rounded-2xl border border-[var(--color-border)]",
              "bg-[var(--color-bg-surface)]/80 backdrop-blur-md",
              "p-8 space-y-6 shadow-xl"
            )}
          >
            {/* Heading */}
            <div className="text-center space-y-1">
              <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] tracking-wide">
                Welcome Back
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Sign in to your account to continue
              </p>
            </div>

            {/* Error alert */}
            {errorMessage && (
              <Alert
                variant="error"
                message={errorMessage}
                dismissible
                onDismiss={() => setErrorMessage(null)}
              />
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <Input
                id="identifier"
                label="Email or Username"
                type="text"
                autoComplete="username email"
                placeholder="Enter your email or username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={isSubmitting}
                required
                aria-required="true"
              />

              <div className="space-y-1">
                <PasswordInput
                  id="password"
                  label="Password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                  aria-required="true"
                />
                <div className="flex justify-end">
                  <Link
                    href="/login/forgot-password"
                    className={cn(
                      "text-xs text-[var(--color-accent)] hover:underline",
                      "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
                    )}
                    tabIndex={0}
                  >
                    Forgot Password?
                  </Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "w-full flex items-center justify-center gap-2",
                  "rounded-lg px-4 py-2.5 text-sm font-semibold",
                  "bg-[var(--color-accent)] text-[var(--color-bg-base)]",
                  "transition-all duration-150",
                  "hover:opacity-90 active:scale-[0.98]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-surface)]",
                  "disabled:opacity-60 disabled:cursor-not-allowed"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" label="Signing in..." />
                    <span>Signing in…</span>
                  </>
                ) : (
                  "Login"
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--color-border)]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[var(--color-bg-surface)] px-3 text-[var(--color-text-secondary)]">
                  New to the club?
                </span>
              </div>
            </div>

            {/* Register link */}
            <div className="text-center">
              <Link
                href="/membership"
                className={cn(
                  "inline-flex items-center gap-1 text-sm font-medium",
                  "text-[var(--color-accent)] hover:underline",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
                )}
              >
                Apply for membership →
              </Link>
            </div>
          </motion.div>

          {/* Footer links */}
          <div className="flex items-center justify-center gap-4 text-xs text-[var(--color-text-secondary)]">
            <Link
              href="/"
              className="hover:text-[var(--color-text-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
            >
              Back to Home
            </Link>
            <span aria-hidden="true">·</span>
            <Link
              href="/membership/status"
              className="hover:text-[var(--color-text-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
            >
              Check Application Status
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}