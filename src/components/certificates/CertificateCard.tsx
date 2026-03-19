// src/components/certificates/CertificateCard.tsx
"use client";

import { Award, Download, Share2 } from "lucide-react";

import { formatDate } from "@/lib/utils";
import { Badge, toast } from "@/components/ui/Feedback";
import type { CertificateCard as CertificateCardType } from "@/types/index";

interface CertificateCardProps {
  certificate: CertificateCardType;
}

export function CertificateCard({ certificate }: CertificateCardProps): JSX.Element {
  const { serial, achievement, issuedAt, isRevoked, pdfUrl, template } = certificate;

  const handleDownload = (): void => {
    window.open(pdfUrl, "_blank", "noopener,noreferrer");
  };

  const handleShare = async (): Promise<void> => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
    const verifyUrl = `${baseUrl}/verify/${serial}`;
    try {
      await navigator.clipboard.writeText(verifyUrl);
      toast("Verification link copied!", "success");
    } catch {
      // Fallback for browsers without clipboard API
      try {
        const textArea = document.createElement("textarea");
        textArea.value = verifyUrl;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        toast("Verification link copied!", "success");
      } catch {
        toast("Failed to copy link. Please try again.", "error");
      }
    }
  };

  return (
    <div
      className="relative rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)] overflow-hidden flex flex-col"
      aria-label={`Certificate: ${achievement}`}
    >
      {/* Decorative gradient top bar */}
      <div
        className="h-1 w-full flex-shrink-0"
        style={{
          background: "linear-gradient(to right, var(--color-primary), var(--color-accent))",
        }}
        aria-hidden="true"
      />

      {/* Revoked overlay badge */}
      {isRevoked && (
        <div className="absolute top-3 right-3 z-10">
          <Badge variant="error" size="sm">
            Revoked
          </Badge>
        </div>
      )}

      {/* Card body */}
      <div
        className={[
          "flex flex-col gap-4 p-6 flex-1",
          isRevoked ? "opacity-50" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* Icon + template name */}
        <div className="flex items-start gap-3">
          <Award
            size={32}
            className="text-[var(--color-accent)] flex-shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-xs font-mono text-[var(--color-text-secondary)] uppercase tracking-wider truncate">
              {template.name}
            </span>
            <span className="text-[10px] font-mono text-[var(--color-text-secondary)] uppercase tracking-widest opacity-70">
              {template.type}
            </span>
          </div>
        </div>

        {/* Achievement */}
        <p className="text-lg font-display text-[var(--color-text-primary)] leading-snug">
          {achievement}
        </p>

        {/* Issued date */}
        <p className="text-sm text-[var(--color-text-secondary)]">
          Issued on{" "}
          <span className="text-[var(--color-text-primary)] font-medium">
            {formatDate(issuedAt, "short")}
          </span>
        </p>

        {/* Serial number */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-text-secondary)]">Serial:</span>
          <code
            className="text-sm font-mono bg-[var(--color-bg-elevated)] text-[var(--color-accent)] px-2 py-1 rounded-sm tracking-wide select-all"
            title="Certificate serial number"
          >
            {serial}
          </code>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 px-6 pb-6 pt-0">
        <button
          type="button"
          onClick={handleDownload}
          disabled={isRevoked}
          aria-label={`Download PDF for ${achievement}`}
          className={[
            "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg",
            "text-sm font-medium transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1 focus:ring-offset-[var(--color-bg-surface)]",
            isRevoked
              ? "opacity-40 cursor-not-allowed bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]"
              : [
                  "bg-[var(--color-primary)] text-white",
                  "hover:bg-[var(--color-primary)]/90 active:scale-[0.98]",
                ].join(" "),
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <Download size={15} aria-hidden="true" />
          Download PDF
        </button>

        <button
          type="button"
          onClick={handleShare}
          disabled={isRevoked}
          aria-label={`Copy verification link for ${achievement}`}
          className={[
            "flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg",
            "text-sm font-medium transition-all duration-200 border",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1 focus:ring-offset-[var(--color-bg-surface)]",
            isRevoked
              ? "opacity-40 cursor-not-allowed border-[var(--color-border)] text-[var(--color-text-secondary)]"
              : [
                  "border-[var(--color-border)] text-[var(--color-text-primary)]",
                  "hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
                  "active:scale-[0.98]",
                ].join(" "),
          ]
            .filter(Boolean)
            .join(" ")}
      >
        <Share2 size={15} aria-hidden="true" />
        Share
      </button>
    </div>
  </div>
  );
}