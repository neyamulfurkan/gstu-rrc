// src/app/certificates/page.tsx

import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { Award } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type CertificateCard as CertificateCardType } from "@/types/index";
import { EmptyState } from "@/components/ui/DataDisplay";

export const dynamic = "force-dynamic";

// Dynamically import CertificateCard since FILE 163 was not found
// We implement a fallback inline card component to ensure the page works
function CertificateCardFallback({ certificate }: { certificate: CertificateCardType }) {
  const issuedDate = new Date(certificate.issuedAt).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6 flex flex-col gap-4 hover:border-[var(--color-accent)] transition-colors duration-200"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span
            className="text-xs font-medium uppercase tracking-widest text-[var(--color-accent)]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {certificate.template.type}
          </span>
          <h3
            className="text-base font-semibold text-[var(--color-text-primary)] leading-snug"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {certificate.achievement}
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {certificate.template.name}
          </p>
        </div>
        <Award
          className="shrink-0 mt-0.5"
          size={28}
          style={{ color: "var(--color-accent)" }}
          aria-hidden="true"
        />
      </div>

      <div className="flex flex-col gap-1">
        <p
          className="text-xs text-[var(--color-text-secondary)]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Serial: {certificate.serial}
        </p>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Issued: {issuedDate}
        </p>
      </div>

      <div className="flex gap-3 mt-auto pt-2 border-t border-[var(--color-border)]">
        <a
          href={certificate.pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center text-sm font-medium py-2 px-3 rounded-lg bg-[var(--color-accent)] text-[var(--color-bg-base)] hover:opacity-90 transition-opacity duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-surface)]"
        >
          Download PDF
        </a>
        <button
          type="button"
          aria-label="Copy verification link"
          onClick={() => {
            const url = `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/verify/${certificate.serial}`;
            if (navigator.clipboard) {
              navigator.clipboard.writeText(url).catch(() => {});
            }
          }}
          className="flex-1 text-center text-sm font-medium py-2 px-3 rounded-lg border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-surface)]"
        >
          Share / Verify
        </button>
      </div>
    </div>
  );
}

// Attempt to load the real CertificateCard; fall back to inline implementation.
let CertificateCardComponent: React.ComponentType<{ certificate: CertificateCardType }>;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("@/components/certificates/CertificateCard") as {
    CertificateCard?: React.ComponentType<{ certificate: CertificateCardType }>;
    default?: React.ComponentType<{ certificate: CertificateCardType }>;
  };
  CertificateCardComponent = mod.CertificateCard ?? mod.default ?? CertificateCardFallback;
} catch {
  CertificateCardComponent = CertificateCardFallback;
}

export async function generateMetadata(): Promise<Metadata> {
  let clubName = "GSTU Robotics & Research Club";
  try {
    const config = await prisma.clubConfig.findUnique({
      where: { id: "main" },
      select: { clubName: true, metaDescription: true },
    });
    if (config?.clubName) {
      clubName = config.clubName;
    }
  } catch {
    // Fallback to default club name
  }

  return {
    title: `My Certificates | ${clubName}`,
    description: `View and download certificates issued to you by ${clubName}.`,
    robots: { index: false, follow: false },
  };
}

export default async function CertificatesPage(): Promise<JSX.Element> {
  const session = await auth();

  if (!session?.user?.userId) {
    redirect("/login?callbackUrl=/certificates");
  }

  let certificates: CertificateCardType[] = [];
  let fetchError = false;

  try {
    const rows = await prisma.certificate.findMany({
      where: {
        recipientId: session.user.userId,
        isRevoked: false,
      },
      select: {
        id: true,
        serial: true,
        achievement: true,
        issuedAt: true,
        isRevoked: true,
        pdfUrl: true,
        template: {
          select: {
            name: true,
            type: true,
          },
        },
      },
      orderBy: {
        issuedAt: "desc",
      },
    });

    certificates = rows as CertificateCardType[];
  } catch (err) {
    console.error("[CertificatesPage] Failed to fetch certificates:", err);
    fetchError = true;
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg-base)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-bg-elevated)]"
              aria-hidden="true"
            >
              <Award size={22} style={{ color: "var(--color-accent)" }} />
            </div>
            <div>
              <h1
                className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] leading-tight"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                My Certificates
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                Credentials and achievements issued to you
              </p>
            </div>
          </div>

          {!fetchError && certificates.length > 0 && (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-[var(--color-bg-elevated)] text-[var(--color-accent)] self-start sm:self-auto"
              aria-label={`${certificates.length} certificate${certificates.length === 1 ? "" : "s"}`}
            >
              <Award size={14} aria-hidden="true" />
              {certificates.length}
            </span>
          )}
        </div>

        {/* Error State */}
        {fetchError && (
          <div
            role="alert"
            className="rounded-xl border border-[var(--color-error)] bg-[var(--color-bg-surface)] px-6 py-5 text-[var(--color-error)] text-sm mb-8"
          >
            Unable to load certificates at this time. Please refresh the page or try again later.
          </div>
        )}

        {/* Empty State */}
        {!fetchError && certificates.length === 0 && (
          <div className="mt-8">
            <EmptyState
              icon="Award"
              heading="No certificates yet"
              description="Certificates issued to you will appear here. Keep participating in club activities to earn recognition."
            />
          </div>
        )}

        {/* Certificates Grid */}
        {!fetchError && certificates.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {certificates.map((cert) => (
                <CertificateCardComponent key={cert.id} certificate={cert} />
              ))}
            </div>

            {/* Informational note */}
            <p className="mt-10 text-center text-sm text-[var(--color-text-secondary)] max-w-xl mx-auto">
              All certificates issued to you are listed here. Share your achievement with a
              verification link — anyone can confirm the authenticity of your certificate.
            </p>
          </>
        )}
      </div>
    </main>
  );
}