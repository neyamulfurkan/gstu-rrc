// src/app/verify/[serial]/page.tsx

import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import type { CertificateCardWithRecipient } from "@/types/index";
import { CertificateVerifyDisplay } from "@/components/certificates/VerifyPage";

interface VerifyPageProps {
  params: { serial: string };
}

export async function generateMetadata({ params }: VerifyPageProps): Promise<Metadata> {
  return {
    title: `Verify Certificate | ${params.serial}`,
    robots: { index: false, follow: false },
  };
}

export default async function VerifyPage({ params }: VerifyPageProps): Promise<JSX.Element> {
  let certificate: CertificateCardWithRecipient | null = null;

  try {
    const raw = await prisma.certificate.findUnique({
      where: { serial: params.serial },
      select: {
        id: true,
        serial: true,
        isRevoked: true,
        issuedAt: true,
        achievement: true,
        signedByName: true,
        signedByDesignation: true,
        pdfUrl: true,
        template: {
          select: {
            name: true,
            type: true,
          },
        },
        recipient: {
          select: {
            fullName: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (raw) {
      certificate = {
        id: raw.id,
        serial: raw.serial,
        isRevoked: raw.isRevoked,
        issuedAt: raw.issuedAt,
        achievement: raw.achievement,
        signedByName: raw.signedByName,
        signedByDesignation: raw.signedByDesignation,
        pdfUrl: raw.pdfUrl,
        template: {
          name: raw.template.name,
          type: raw.template.type,
        },
        recipient: {
          fullName: raw.recipient.fullName,
          username: raw.recipient.username,
          avatarUrl: raw.recipient.avatarUrl,
        },
      };
    }
  } catch (error) {
    console.error(`[verify/${params.serial}] Failed to fetch certificate:`, error);
    certificate = null;
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg-base)] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <CertificateVerifyDisplay certificate={certificate} />
      </div>
    </main>
  );
}