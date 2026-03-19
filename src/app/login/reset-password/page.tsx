// src/app/login/reset-password/page.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { validateToken, resetPassword } from "./actions";
import { Alert, Spinner } from "@/components/ui/Feedback";
import { PasswordInput, FormLabel, FormError } from "@/components/ui/Forms";
import { cn } from "@/lib/utils";

// ─── Password Strength Meter ───────────────────────────────────────────────────

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!password) return { score: 0, label: "", color: "transparent" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Very Weak", color: "var(--color-error)" };
  if (score === 2) return { score, label: "Weak", color: "var(--color-warning)" };
  if (score === 3) return { score, label: "Fair", color: "var(--color-warning)" };
  if (score === 4) return { score, label: "Strong", color: "var(--color-success)" };
  return { score, label: "Very Strong", color: "var(--color-success)" };
}

interface PasswordStrengthMeterProps {
  password: string;
}

function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps): JSX.Element | null {
  if (!password) return null;
  const { score, label, color } = getPasswordStrength(password);
  const segments = 5;

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{
              backgroundColor: i < score ? color : "var(--color-bg-elevated)",
            }}
          />
        ))}
      </div>
      <p className="text-xs" style={{ color }}>
        {label}
      </p>
    </div>
  );
}

// ─── Main Page Component ───────────────────────────────────────────────────────

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string };
}): JSX.Element {
  const token = searchParams.token;

  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [memberId, setMemberId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string>("");
  const [confirmError, setConfirmError] = useState<string>("");
  const [serverError, setServerError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);

  const checkToken = useCallback(async () => {
    if (!token) {
      setTokenValid(false);
      return;
    }
    const result = await validateToken(token);
    setTokenValid(result.valid);
    setMemberId(result.memberId);
  }, [token]);

  useEffect(() => {
    checkToken();
  }, [checkToken]);

  const validateForm = (): boolean => {
    let valid = true;
    setPasswordError("");
    setConfirmError("");
    setServerError("");

    if (!password) {
      setPasswordError("Password is required.");
      valid = false;
    } else if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      valid = false;
    } else if (!/[A-Z]/.test(password)) {
      setPasswordError("Password must contain at least one uppercase letter.");
      valid = false;
    } else if (!/[0-9]/.test(password)) {
      setPasswordError("Password must contain at least one number.");
      valid = false;
    } else if (!/[^A-Za-z0-9]/.test(password)) {
      setPasswordError("Password must contain at least one special character.");
      valid = false;
    }

    if (!confirmPassword) {
      setConfirmError("Please confirm your password.");
      valid = false;
    } else if (password !== confirmPassword) {
      setConfirmError("Passwords do not match.");
      valid = false;
    }

    return valid;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!token || !memberId) return;

    setIsLoading(true);
    setServerError("");

    try {
      const result = await resetPassword(token, password, memberId);
      if (result.success) {
        setSuccess(true);
      } else {
        setServerError(result.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (tokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)]">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" label="Validating reset link..." />
          <p className="text-sm text-[var(--color-text-secondary)]">
            Validating reset link…
          </p>
        </div>
      </div>
    );
  }

  // ── Invalid/expired token ────────────────────────────────────────────────────
  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)] px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
              style={{ backgroundColor: "var(--color-error)" + "1a" }}
              aria-hidden="true"
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="16"
                  cy="16"
                  r="14"
                  stroke="var(--color-error)"
                  strokeWidth="2"
                />
                <path
                  d="M10.5 10.5L21.5 21.5M21.5 10.5L10.5 21.5"
                  stroke="var(--color-error)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}
            >
              Invalid Reset Link
            </h1>
          </div>
          <Alert
            variant="error"
            title="Link expired or invalid"
            message="This reset link is invalid or has expired. Reset links are valid for 1 hour. Please request a new one."
          />
          <div className="flex flex-col gap-3">
            <Link
              href="/login/forgot-password"
              className={cn(
                "flex items-center justify-center w-full rounded-lg px-4 py-2.5 text-sm font-semibold",
                "bg-[var(--color-accent)] text-[var(--color-bg-base)]",
                "hover:opacity-90 transition-opacity duration-150",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-base)]"
              )}
            >
              Request New Reset Link
            </Link>
            <Link
              href="/login"
              className={cn(
                "flex items-center justify-center w-full rounded-lg px-4 py-2.5 text-sm font-medium",
                "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
                "border border-[var(--color-border)] hover:border-[var(--color-accent)]/50",
                "transition-colors duration-150",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-base)]"
              )}
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Success state ────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)] px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
              style={{ backgroundColor: "var(--color-success)" + "1a" }}
              aria-hidden="true"
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="16"
                  cy="16"
                  r="14"
                  stroke="var(--color-success)"
                  strokeWidth="2"
                />
                <path
                  d="M9 16.5L13.5 21L23 11"
                  stroke="var(--color-success)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}
            >
              Password Reset!
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Your password has been successfully updated.
            </p>
          </div>
          <Alert
            variant="success"
            title="Password updated successfully"
            message="You can now log in with your new password. For security, all active sessions have been invalidated."
          />
          <Link
            href="/login"
            className={cn(
              "flex items-center justify-center w-full rounded-lg px-4 py-2.5 text-sm font-semibold",
              "bg-[var(--color-accent)] text-[var(--color-bg-base)]",
              "hover:opacity-90 transition-opacity duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-base)]"
            )}
          >
            Continue to Login
          </Link>
        </div>
      </div>
    );
  }

  // ── Reset form ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)] px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
            style={{ backgroundColor: "var(--color-accent)" + "1a" }}
            aria-hidden="true"
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="6"
                y="14"
                width="20"
                height="14"
                rx="2"
                stroke="var(--color-accent)"
                strokeWidth="2"
              />
              <path
                d="M10 14V10a6 6 0 0112 0v4"
                stroke="var(--color-accent)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="16" cy="21" r="2" fill="var(--color-accent)" />
            </svg>
          </div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}
          >
            Set New Password
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Choose a strong password for your account.
          </p>
        </div>

        {/* Form card */}
        <div
          className="rounded-2xl border p-6 space-y-5"
          style={{
            backgroundColor: "var(--color-bg-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          {serverError && (
            <Alert
              variant="error"
              message={serverError}
              dismissible
              onDismiss={() => setServerError("")}
            />
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* New password */}
            <div>
              <PasswordInput
                label="New Password"
                id="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError("");
                }}
                error={passwordError}
                required
                autoComplete="new-password"
                placeholder="Enter your new password"
                disabled={isLoading}
              />
              <PasswordStrengthMeter password={password} />
              <p className="mt-1.5 text-xs text-[var(--color-text-secondary)]">
                Must be at least 8 characters with uppercase, number, and special character.
              </p>
            </div>

            {/* Confirm password */}
            <div>
              <PasswordInput
                label="Confirm New Password"
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (confirmError) setConfirmError("");
                }}
                error={confirmError}
                required
                autoComplete="new-password"
                placeholder="Re-enter your new password"
                disabled={isLoading}
              />
              {/* Inline match indicator */}
              {confirmPassword && password && !confirmError && (
                <p
                  className="mt-1 text-xs"
                  style={{
                    color:
                      password === confirmPassword
                        ? "var(--color-success)"
                        : "var(--color-error)",
                  }}
                >
                  {password === confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                "flex items-center justify-center gap-2 w-full rounded-lg px-4 py-2.5 text-sm font-semibold",
                "bg-[var(--color-accent)] text-[var(--color-bg-base)]",
                "hover:opacity-90 transition-opacity duration-150",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-surface)]",
                "disabled:opacity-60 disabled:cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" label="Resetting password..." />
                  <span>Resetting…</span>
                </>
              ) : (
                "Reset Password"
              )}
            </button>
          </form>
        </div>

        {/* Back link */}
        <p className="text-center text-sm text-[var(--color-text-secondary)]">
          Remember your password?{" "}
          <Link
            href="/login"
            className={cn(
              "font-medium text-[var(--color-accent)]",
              "hover:underline underline-offset-4 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
            )}
          >
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}