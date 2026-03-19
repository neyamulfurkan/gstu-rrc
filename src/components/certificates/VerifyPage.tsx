// src/components/certificates/VerifyPage.tsx

import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, CheckCircle, XCircle, User, Award, Calendar, Hash, PenSquare, ArrowLeft, ExternalLink } from "lucide-react";

import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Feedback";
import type { CertificateCardWithRecipient } from "@/types/index";

interface CertificateVerifyDisplayProps {
  certificate: CertificateCardWithRecipient | null;
}

export function CertificateVerifyDisplay({
  certificate,
}: CertificateVerifyDisplayProps): JSX.Element {
  // ── Path 1: Not found ─────────────────────────────────────────────────────
  if (!certificate) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center">
          {/* Animated red X */}
          <div className="mx-auto mb-6 w-24 h-24 flex items-center justify-center rounded-full bg-[var(--color-error)]/10 border-2 border-[var(--color-error)]/30">
            <svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <style>{`
                @keyframes drawX {
                  from { stroke-dashoffset: 100; }
                  to { stroke-dashoffset: 0; }
                }
                .x-line {
                  stroke-dasharray: 100;
                  stroke-dashoffset: 100;
                  animation: drawX 0.5s ease-out forwards;
                }
                .x-line:nth-child(2) {
                  animation-delay: 0.2s;
                }
              `}</style>
              <line
                className="x-line"
                x1="18"
                y1="18"
                x2="46"
                y2="46"
                stroke="var(--color-error)"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <line
                className="x-line"
                x1="46"
                y1="18"
                x2="18"
                y2="46"
                stroke="var(--color-error)"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-3"
            style={{ fontFamily: "var(--font-display)" }}>
            Certificate Not Found
          </h1>

          <p className="text-[var(--color-text-secondary)] mb-2 leading-relaxed">
            This certificate serial number does not exist in our records.
          </p>
          <p className="text-[var(--color-text-secondary)] text-sm mb-8 leading-relaxed">
            If you believe this is an error, please contact us directly.
          </p>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium
              bg-[var(--color-bg-elevated)] border border-[var(--color-border)]
              text-[var(--color-text-primary)] hover:border-[var(--color-accent)]
              transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // ── Path 2: Revoked ───────────────────────────────────────────────────────
  if (certificate.isRevoked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-6 w-24 h-24 flex items-center justify-center rounded-full
              bg-amber-500/10 border-2 border-amber-500/30">
              <AlertTriangle
                size={48}
                className="text-amber-500"
                aria-hidden="true"
              />
            </div>

            <h1
              className="text-2xl font-bold text-amber-500 mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Certificate Revoked
            </h1>

            <p className="text-[var(--color-text-secondary)] leading-relaxed">
              This certificate has been revoked and is no longer valid.
            </p>
          </div>

          {/* Reference info card */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-500/70 mb-4">
              Certificate Reference (Revoked)
            </p>

            {/* Issued to */}
            <div className="flex items-start gap-3">
              <User size={16} className="text-[var(--color-text-secondary)] mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-[var(--color-text-secondary)] mb-0.5">Issued To</p>
                <div className="flex items-center gap-2">
                  {certificate.recipient.avatarUrl && (
                    <Image
                      src={certificate.recipient.avatarUrl}
                      alt={certificate.recipient.fullName}
                      width={20}
                      height={20}
                      className="rounded-full flex-shrink-0 opacity-60"
                    />
                  )}
                  <span className="text-sm text-[var(--color-text-primary)] opacity-70 font-medium truncate">
                    {certificate.recipient.fullName}
                  </span>
                </div>
              </div>
            </div>

            {/* Achievement */}
            <div className="flex items-start gap-3">
              <Award size={16} className="text-[var(--color-text-secondary)] mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-[var(--color-text-secondary)] mb-0.5">Achievement</p>
                <p className="text-sm text-[var(--color-text-primary)] opacity-70 truncate">
                  {certificate.achievement}
                </p>
              </div>
            </div>

            {/* Issued on */}
            <div className="flex items-start gap-3">
              <Calendar size={16} className="text-[var(--color-text-secondary)] mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-[var(--color-text-secondary)] mb-0.5">Originally Issued On</p>
                <p className="text-sm text-[var(--color-text-primary)] opacity-70">
                  {formatDate(certificate.issuedAt, "short")}
                </p>
              </div>
            </div>

            {/* Serial */}
            <div className="flex items-start gap-3">
              <Hash size={16} className="text-[var(--color-text-secondary)] mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-[var(--color-text-secondary)] mb-0.5">Serial Number</p>
                <p
                  className="text-sm text-[var(--color-text-primary)] opacity-70 truncate"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {certificate.serial}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium
                bg-[var(--color-bg-elevated)] border border-[var(--color-border)]
                text-[var(--color-text-primary)] hover:border-[var(--color-accent)]
                transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Path 3: Valid certificate ─────────────────────────────────────────────
  const certTypeLabelMap: Record<string, string> = {
    participation: "Participation",
    achievement: "Achievement",
    completion: "Completion",
    custom: "Certificate",
  };

  const certTypeVariantMap: Record<string, "success" | "primary" | "accent" | "neutral"> = {
    participation: "primary",
    achievement: "accent",
    completion: "success",
    custom: "neutral",
  };

  const typeLabel = certTypeLabelMap[certificate.template.type] ?? "Certificate";
  const typeVariant = certTypeVariantMap[certificate.template.type] ?? "neutral";

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full">
        {/* ── Valid header ── */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-6 w-24 h-24 flex items-center justify-center rounded-full
            bg-[var(--color-success)]/10 border-2 border-[var(--color-success)]/30">
            <svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <style>{`
                @keyframes drawCheck {
                  from { stroke-dashoffset: 80; }
                  to { stroke-dashoffset: 0; }
                }
                .check-path {
                  stroke-dasharray: 80;
                  stroke-dashoffset: 80;
                  animation: drawCheck 0.8s ease-out 0.1s forwards;
                }
              `}</style>
              <polyline
                className="check-path"
                points="14,33 27,47 50,18"
                stroke="var(--color-success)"
                strokeWidth="5.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>

          <h1
            className="text-2xl font-bold mb-2"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-success)",
            }}
          >
            Valid Certificate
          </h1>

          <p className="text-[var(--color-text-secondary)] text-sm">
            This certificate has been verified and is authentic.
          </p>
        </div>

        {/* ── Certificate details card ── */}
        <div
          className="rounded-xl border bg-[var(--color-bg-surface)] p-6 space-y-5"
          style={{
            borderColor: "var(--color-success)",
            boxShadow: "0 0 24px var(--color-glow-accent, rgba(0,229,255,0.08))",
          }}
        >
          {/* Template name + type badge */}
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-[var(--color-border)]">
            <p
              className="text-base font-semibold text-[var(--color-text-primary)] truncate"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {certificate.template.name}
            </p>
            <Badge variant={typeVariant} size="md">
              {typeLabel}
            </Badge>
          </div>

          {/* Issued to */}
          <div className="flex items-start gap-3">
            <User
              size={16}
              className="text-[var(--color-text-secondary)] mt-0.5 flex-shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-[var(--color-text-secondary)] mb-1">Issued To</p>
              <div className="flex items-center gap-2.5">
                <div className="relative flex-shrink-0">
                  {certificate.recipient.avatarUrl ? (
                    <Image
                      src={certificate.recipient.avatarUrl}
                      alt={certificate.recipient.fullName}
                      width={32}
                      height={32}
                      className="rounded-full object-cover border border-[var(--color-border)]"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                        bg-[var(--color-bg-elevated)] border border-[var(--color-border)]
                        text-[var(--color-text-primary)]"
                    >
                      {certificate.recipient.fullName
                        .split(" ")
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join("")
                        .toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                  {certificate.recipient.fullName}
                </span>
              </div>
            </div>
          </div>

          {/* Achievement */}
          <div className="flex items-start gap-3">
            <Award
              size={16}
              className="text-[var(--color-text-secondary)] mt-0.5 flex-shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-[var(--color-text-secondary)] mb-1">Achievement</p>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                {certificate.achievement}
              </p>
            </div>
          </div>

          {/* Issued on */}
          <div className="flex items-start gap-3">
            <Calendar
              size={16}
              className="text-[var(--color-text-secondary)] mt-0.5 flex-shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-[var(--color-text-secondary)] mb-1">Issued On</p>
              <p className="text-sm text-[var(--color-text-primary)]">
                {formatDate(certificate.issuedAt, "full")}
              </p>
            </div>
          </div>

          {/* Serial number */}
          <div className="flex items-start gap-3">
            <Hash
              size={16}
              className="text-[var(--color-text-secondary)] mt-0.5 flex-shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-[var(--color-text-secondary)] mb-1">Serial Number</p>
              <p
                className="text-sm text-[var(--color-text-primary)] tracking-wider"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {certificate.serial}
              </p>
            </div>
          </div>

          {/* Signed by */}
          <div
            className="flex items-start gap-3 pt-4 border-t border-[var(--color-border)]"
          >
            <PenSquare
              size={16}
              className="text-[var(--color-text-secondary)] mt-0.5 flex-shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-[var(--color-text-secondary)] mb-1">Issued By</p>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                {certificate.signedByName}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {certificate.signedByDesignation}
              </p>
            </div>
          </div>
        </div>

        {/* ── View member profile CTA ── */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={`/members/${certificate.recipient.username}`}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg
              text-sm font-semibold transition-all
              bg-[var(--color-primary)] text-white
              hover:bg-[var(--color-primary)]/90 hover:shadow-[0_0_12px_var(--color-glow-primary,rgba(0,229,255,0.3))]
              focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          >
            <ExternalLink size={15} aria-hidden="true" />
            View Member Profile
          </Link>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg
              text-sm font-medium transition-colors
              bg-[var(--color-bg-elevated)] border border-[var(--color-border)]
              text-[var(--color-text-primary)] hover:border-[var(--color-accent)]
              focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}