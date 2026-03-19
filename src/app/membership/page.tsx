// src/app/membership/page.tsx

import type { Metadata } from "next";
import { Lock } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { generateBaseMetadata } from "@/lib/seo";
import { RegistrationForm } from "@/components/membership/RegistrationForm";
import { WhyJoinSection } from "@/components/home/HomeSections";
import type { ClubConfigPublic, WhyJoinCard } from "@/types/index";

export const revalidate = 60;

async function getMembershipData() {
  const [rawConfig, departments, whyJoinCards] = await Promise.all([
    prisma.clubConfig.findUnique({
      where: { id: "main" },
      select: {
        clubName: true,
        clubShortName: true,
        clubMotto: true,
        clubDescription: true,
        universityName: true,
        departmentName: true,
        foundedYear: true,
        address: true,
        email: true,
        phone: true,
        logoUrl: true,
        faviconUrl: true,
        fbUrl: true,
        ytUrl: true,
        igUrl: true,
        liUrl: true,
        ghUrl: true,
        twitterUrl: true,
        extraSocialLinks: true,
        metaDescription: true,
        seoKeywords: true,
        gscVerifyTag: true,
        ogImageUrl: true,
        regStatus: true,
        membershipFee: true,
        bkashNumber: true,
        bkashName: true,
        nagadNumber: true,
        nagadName: true,
        requireScreenshot: true,
        privacyPolicy: true,
        termsOfUse: true,
        heroType: true,
        heroVideoUrl: true,
        heroFallbackImg: true,
        heroImages: true,
        heroCtaLabel1: true,
        heroCtaUrl1: true,
        heroCtaLabel2: true,
        heroCtaUrl2: true,
        overlayOpacity: true,
        colorConfig: true,
        displayFont: true,
        bodyFont: true,
        monoFont: true,
        headingFont: true,
        animationStyle: true,
        transitionStyle: true,
        particleEnabled: true,
        particleCount: true,
        particleSpeed: true,
        particleColor: true,
        announcementTickerSpeed: true,
        footerCopyright: true,
        aiEnabled: true,
        aiChatHistory: true,
        constitutionUrl: true,
      },
    }),
    prisma.department.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.whyJoinCard.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        icon: true,
        heading: true,
        description: true,
        learnMoreUrl: true,
        sortOrder: true,
      },
    }),
  ]);

  return { rawConfig, departments, whyJoinCards };
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const config = await prisma.clubConfig.findUnique({
      where: { id: "main" },
      select: {
        clubName: true,
        clubShortName: true,
        clubMotto: true,
        clubDescription: true,
        universityName: true,
        departmentName: true,
        foundedYear: true,
        address: true,
        email: true,
        phone: true,
        logoUrl: true,
        faviconUrl: true,
        fbUrl: true,
        ytUrl: true,
        igUrl: true,
        liUrl: true,
        ghUrl: true,
        twitterUrl: true,
        extraSocialLinks: true,
        metaDescription: true,
        seoKeywords: true,
        gscVerifyTag: true,
        ogImageUrl: true,
        regStatus: true,
        membershipFee: true,
        bkashNumber: true,
        nagadNumber: true,
        heroType: true,
        heroVideoUrl: true,
        heroFallbackImg: true,
        heroImages: true,
        heroCtaLabel1: true,
        heroCtaUrl1: true,
        heroCtaLabel2: true,
        heroCtaUrl2: true,
        overlayOpacity: true,
        colorConfig: true,
        displayFont: true,
        bodyFont: true,
        monoFont: true,
        headingFont: true,
        animationStyle: true,
        transitionStyle: true,
        particleEnabled: true,
        particleCount: true,
        particleSpeed: true,
        particleColor: true,
        announcementTickerSpeed: true,
        privacyPolicy: true,
        termsOfUse: true,
        footerCopyright: true,
        aiEnabled: true,
        aiChatHistory: true,
        constitutionUrl: true,
      },
    });

    if (!config) {
      return { title: "Membership Registration" };
    }

    const base = generateBaseMetadata(config as unknown as ClubConfigPublic);

    return {
      ...base,
      title: `Join ${config.clubName} — Membership Registration`,
      description: `Apply to become a member of ${config.clubName} at ${config.universityName}. Fill out the registration form to get started.`,
      openGraph: {
        ...(base.openGraph ?? {}),
        title: `Join ${config.clubName}`,
        description: `Apply to become a member of ${config.clubName} at ${config.universityName}.`,
        url: `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/membership`,
      },
    };
  } catch (err) {
    console.error("[membership/page] generateMetadata error:", err);
    return { title: "Membership Registration" };
  }
}

export default async function MembershipPage(): Promise<JSX.Element> {
  let rawConfig: Awaited<ReturnType<typeof getMembershipData>>["rawConfig"] = null;
  let departments: Array<{ id: string; name: string }> = [];
  let whyJoinCards: WhyJoinCard[] = [];

  try {
    const data = await getMembershipData();
    rawConfig = data.rawConfig;
    departments = data.departments;
    whyJoinCards = data.whyJoinCards as WhyJoinCard[];
  } catch (err) {
    console.error("[membership/page] Data fetch error:", err);
  }

  // Registration closed — serve a server-rendered message for crawlers
  if (!rawConfig || rawConfig.regStatus === "closed") {
    return (
      <main className="min-h-screen bg-[var(--color-bg-base)]">
        {/* Page header */}
        <section className="relative py-20 overflow-hidden">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(ellipse at 50% 0%, var(--color-primary) 0%, transparent 70%)",
            }}
            aria-hidden="true"
          />
          <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] mb-6">
              <span
                className="h-2 w-2 rounded-full bg-[var(--color-warning)]"
                aria-hidden="true"
              />
              Registration Closed
            </div>

            <div className="flex justify-center mb-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[var(--color-border)] bg-[var(--color-bg-surface)]">
                <Lock
                  size={36}
                  className="text-[var(--color-text-secondary)]"
                  aria-hidden="true"
                />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)] mb-4">
              Membership Registration is Currently Closed
            </h1>

            <p className="text-base text-[var(--color-text-secondary)] mb-4 max-w-lg mx-auto">
              We are not accepting new member applications at this time. Please
              check back later or follow our social media channels for
              announcements about when registration reopens.
            </p>

            {rawConfig && (
              <p className="text-sm text-[var(--color-text-secondary)]">
                For enquiries, contact us at{" "}
                <a
                  href={`mailto:${rawConfig.email}`}
                  className="text-[var(--color-accent)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
                >
                  {rawConfig.email}
                </a>
              </p>
            )}

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="/"
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              >
                Return to Home
              </a>
              <a
                href="/membership/status"
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              >
                Check Application Status
              </a>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const config = rawConfig;

  return (
    <main className="min-h-screen bg-[var(--color-bg-base)]">
      {/* Page header */}
      <section className="relative py-16 overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 50% 0%, var(--color-primary) 0%, transparent 70%)",
          }}
          aria-hidden="true"
        />
        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] mb-4">
            <span
              className="h-2 w-2 rounded-full bg-[var(--color-success)] animate-pulse"
              aria-hidden="true"
            />
            Registration Open
          </div>

          <h1 className="text-4xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)] mb-3">
            Join{" "}
            <span className="text-[var(--color-accent)]">
              {config.clubShortName || config.clubName}
            </span>
          </h1>

          <p className="text-base text-[var(--color-text-secondary)] max-w-xl mx-auto">
            Become part of the robotics and research community at{" "}
            {config.universityName}. Fill out the form below to apply for
            membership.
          </p>

          {config.membershipFee > 0 && (
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
              Membership fee:{" "}
              <span className="font-semibold text-[var(--color-accent)]">
                BDT {config.membershipFee}
              </span>{" "}
              (one-time)
            </p>
          )}
        </div>
      </section>

      {/* Why Join section — benefits above the form */}
      {whyJoinCards.length > 0 && (
        <section className="bg-[var(--color-bg-base)]">
          <WhyJoinSection cards={whyJoinCards} />
        </section>
      )}

      {/* Divider */}
      <div
        className="mx-auto max-w-2xl px-4"
        aria-hidden="true"
      >
        <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />
      </div>

      {/* Registration form */}
      <section
        id="registration-form"
        className="py-10 bg-[var(--color-bg-base)]"
        aria-labelledby="form-heading"
      >
        <div className="mx-auto max-w-xl px-4">
          <h2 id="form-heading" className="sr-only">
            Membership Registration Form
          </h2>
          <RegistrationForm
            config={{
              membershipFee: config.membershipFee,
              bkashNumber: config.bkashNumber,
              nagadNumber: config.nagadNumber,
              privacyPolicy: config.privacyPolicy,
              termsOfUse: config.termsOfUse,
              requireScreenshot: config.requireScreenshot,
            }}
            departments={departments}
          />
        </div>
      </section>

      {/* Footer note */}
      <section className="py-8">
        <div className="mx-auto max-w-xl px-4 text-center">
          <p className="text-xs text-[var(--color-text-secondary)]">
            Already submitted an application?{" "}
            <a
              href="/membership/status"
              className="text-[var(--color-accent)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
            >
              Check your application status
            </a>
          </p>
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            Already a member?{" "}
            <a
              href="/login"
              className="text-[var(--color-accent)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
            >
              Log in here
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}