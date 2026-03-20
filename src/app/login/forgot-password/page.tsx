// src/app/login/forgot-password/page.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";

import { Input } from "@/components/ui/Forms";
import { Alert, Spinner } from "@/components/ui/Feedback";
import { requestPasswordReset } from "./actions";

export default function ForgotPasswordPage(): JSX.Element {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | undefined>(undefined);

  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setEmailError("Email address is required.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError("Please enter a valid email address.");
      return false;
    }
    setEmailError(undefined);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (!validateEmail(email)) return;

    setIsLoading(true);

    try {
      await requestPasswordReset(email.trim().toLowerCase());
      // Always show the success screen regardless of whether the email was found
      setSubmitted(true);
    } catch (err) {
      console.error("[forgot-password] Client-side submission error:", err);
      // Still show success screen — do not reveal if email exists
      setSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ backgroundColor: "var(--color-bg-base)" }}
    >
      {/* Background circuit texture */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        aria-hidden="true"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg stroke='%23ffffff' stroke-width='1'%3E%3Cpath d='M10 10h40v40H10z'/%3E%3Cpath d='M20 10v10M40 10v10M10 20h10M40 20h10M20 40v10M40 40v10M10 40h10M40 40h10'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Back to login */}
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors"
          style={{ color: "var(--color-text-secondary)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color =
              "var(--color-text-primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color =
              "var(--color-text-secondary)";
          }}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to Login
        </Link>

        {/* Card */}
        <div
          className="rounded-2xl border p-8"
          style={{
            backgroundColor: "var(--color-bg-surface)",
            borderColor: "var(--color-border)",
            boxShadow:
              "0 0 0 1px var(--color-border), 0 20px 60px rgba(0,0,0,0.4)",
          }}
        >
          {!submitted ? (
            <>
              {/* Header */}
              <div className="mb-8">
                <div
                  className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
                  style={{ backgroundColor: "var(--color-accent)/10" }}
                >
                  <Mail
                    size={24}
                    aria-hidden="true"
                    style={{ color: "var(--color-accent)" }}
                  />
                </div>
                <h1
                  className="text-2xl font-bold mb-2"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  Forgot Password?
                </h1>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  No worries. Enter your registered email address and we&apos;ll send
                  you a link to reset your password.
                </p>
              </div>

              {/* Error alert */}
              {formError && (
                <div className="mb-4">
                  <Alert variant="error" message={formError} dismissible onDismiss={() => setFormError(null)} />
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <Input
                  type="email"
                  label="Email Address"
                  placeholder="your@email.com"
                  autoComplete="email"
                  autoFocus
                  required
                  value={email}
                  error={emailError}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) {
                      setEmailError(undefined);
                    }
                  }}
                  onBlur={(e) => {
                    if (e.target.value) {
                      validateEmail(e.target.value);
                    }
                  }}
                  disabled={isLoading}
                />

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: "var(--color-accent)",
                    color: "var(--color-bg-base)",
                    outline: "2px solid var(--color-accent)",
                  }}
                >
                  {isLoading ? (
                    <>
                      <Spinner size="sm" label="Sending reset link..." />
                      <span>Sending...</span>
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </form>

              {/* Footer */}
              <p
                className="mt-6 text-xs text-center"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Remember your password?{" "}
                <Link
                  href="/login"
                  className="font-medium transition-colors"
                  style={{ color: "var(--color-accent)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.textDecoration =
                      "underline";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.textDecoration =
                      "none";
                  }}
                >
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            /* Success Screen */
            <div className="text-center py-4">
              <div className="flex justify-center mb-6">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "var(--color-success)/15" }}
                >
                  <CheckCircle
                    size={36}
                    aria-hidden="true"
                    style={{ color: "var(--color-success)" }}
                  />
                </div>
              </div>

              <h2
                className="text-xl font-bold mb-3"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--color-text-primary)",
                }}
              >
                Check Your Inbox
              </h2>

              <p
                className="text-sm leading-relaxed mb-2"
                style={{ color: "var(--color-text-secondary)" }}
              >
                If an account with{" "}
                <span
                  className="font-medium"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {email}
                </span>{" "}
                exists, we've sent a password reset link.
              </p>

              <p
                className="text-sm leading-relaxed mb-8"
                style={{ color: "var(--color-text-secondary)" }}
              >
                The link will expire in <strong>1 hour</strong>. Check your
                spam folder if you don&apos;t see it.
              </p>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setEmail("");
                    setEmailError(undefined);
                  }}
                  className="w-full rounded-lg px-4 py-2.5 text-sm font-medium border transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1"
                  style={{
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-primary)",
                    backgroundColor: "var(--color-bg-elevated)",
                  }}
                >
                  Try a different email
                </button>

                <Link
                  href="/login"
                  className="block w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-center transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1"
                  style={{
                    backgroundColor: "var(--color-accent)",
                    color: "var(--color-bg-base)",
                  }}
                >
                  Back to Login
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Decorative glow */}
        <div
          className="absolute -inset-0.5 rounded-2xl opacity-10 pointer-events-none blur-xl -z-10"
          aria-hidden="true"
          style={{ backgroundColor: "var(--color-accent)" }}
        />
      </div>
    </div>
  );
}