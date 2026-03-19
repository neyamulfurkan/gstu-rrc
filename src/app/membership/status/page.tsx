// src/app/membership/status/page.tsx

import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Alert } from "@/components/ui/Feedback";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface ApplicationStatusPageProps {
  searchParams: { email?: string };
}

export default async function ApplicationStatusPage({
  searchParams,
}: ApplicationStatusPageProps): Promise<JSX.Element> {
  const email = searchParams.email?.trim().toLowerCase() || "";

  let application: {
    status: string;
    adminNote: string | null;
    createdAt: Date;
    reviewedAt: Date | null;
    memberId: string | null;
  } | null = null;

  let fetchError = false;

  if (email) {
    try {
      application = await prisma.application.findFirst({
        where: { email },
        select: {
          status: true,
          adminNote: true,
          createdAt: true,
          reviewedAt: true,
          memberId: true,
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (err) {
      console.error("[membership/status] DB error:", err);
      fetchError = true;
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg-base)] flex items-start justify-center px-4 py-16 sm:py-24">
      <div className="w-full max-w-lg">
        {/* Page heading */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)] mb-2">
            Application Status
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm">
            Enter the email address you used to apply and we&apos;ll show you
            the current status of your membership application.
          </p>
        </div>

        {/* Status Check Form */}
        <form
          method="get"
          action="/membership/status"
          className="mb-8 bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl p-6"
        >
          <div className="mb-4">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              name="email"
              defaultValue={searchParams.email || ""}
              required
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-base)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-medium text-sm px-4 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-surface)]"
          >
            Check Status
          </button>
        </form>

        {/* Results area */}
        {email && (
          <div className="space-y-4">
            {fetchError ? (
              <Alert
                variant="error"
                title="Unable to check status"
                message="We encountered an error looking up your application. Please try again in a moment."
              />
            ) : !application ? (
              <Alert
                variant="info"
                title="No application found"
                message={`No application was found for "${email}". Please check the email address and try again, or submit a new application.`}
              />
            ) : application.status === "pending" ? (
              <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  {/* Spinner ring */}
                  <span className="inline-flex items-center justify-center">
                    <svg
                      width={28}
                      height={28}
                      viewBox="0 0 28 28"
                      fill="none"
                      className="animate-spin"
                      aria-hidden="true"
                    >
                      <circle
                        cx={14}
                        cy={14}
                        r={11}
                        stroke="currentColor"
                        strokeWidth={2.5}
                        strokeOpacity={0.2}
                        className="text-[var(--color-warning)]"
                      />
                      <path
                        d="M 14 3 A 11 11 0 0 1 25 14"
                        stroke="var(--color-warning)"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  <div>
                    <p className="text-base font-semibold text-[var(--color-warning)]">
                      Under Review
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Review typically takes 24–48 hours
                    </p>
                  </div>
                </div>

                <p className="text-sm text-[var(--color-text-secondary)] mb-1">
                  Your application is being reviewed by our team. We&apos;ll
                  send you an email once a decision has been made.
                </p>

                <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex flex-wrap gap-x-6 gap-y-1 text-xs text-[var(--color-text-secondary)]">
                  <span>
                    <span className="font-medium text-[var(--color-text-primary)]">
                      Submitted:
                    </span>{" "}
                    {formatDate(application.createdAt, "short")}
                  </span>
                  <span>
                    <span className="font-medium text-[var(--color-text-primary)]">
                      Email:
                    </span>{" "}
                    {email}
                  </span>
                </div>
              </div>
            ) : application.status === "approved" ? (
              <div className="bg-[var(--color-bg-surface)] border border-[var(--color-success)]/40 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-success)]/15">
                    <svg
                      width={18}
                      height={18}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--color-success)"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-base font-semibold text-[var(--color-success)]">
                      Application Approved!
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {application.reviewedAt
                        ? `Approved on ${formatDate(application.reviewedAt, "short")}`
                        : "Welcome to the club!"}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-[var(--color-text-secondary)] mb-5">
                  Congratulations! Your membership application has been approved.
                  You can now log in to your account using the email address and
                  password you set during registration.
                </p>

                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-success)] hover:opacity-90 text-white font-medium text-sm px-5 py-2.5 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-surface)]"
                >
                  Log In to Your Account
                  <svg
                    width={14}
                    height={14}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1={5} y1={12} x2={19} y2={12} />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </Link>
              </div>
            ) : application.status === "rejected" ? (
              <div className="bg-[var(--color-bg-surface)] border border-[var(--color-error)]/40 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-error)]/15">
                    <svg
                      width={18}
                      height={18}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--color-error)"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <line x1={18} y1={6} x2={6} y2={18} />
                      <line x1={6} y1={6} x2={18} y2={18} />
                    </svg>
                  </span>
                  <div>
                    <p className="text-base font-semibold text-[var(--color-error)]">
                      Application Not Approved
                    </p>
                    {application.reviewedAt && (
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        Reviewed on {formatDate(application.reviewedAt, "short")}
                      </p>
                    )}
                  </div>
                </div>

                {application.adminNote ? (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">
                      Reason
                    </p>
                    <p className="text-sm text-[var(--color-text-primary)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg px-3.5 py-2.5">
                      {application.adminNote}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                    Unfortunately your application was not approved at this time.
                    If you believe this is an error, please contact us.
                  </p>
                )}

                <p className="text-sm text-[var(--color-text-secondary)] mb-5">
                  If the issue mentioned above can be corrected, you are
                  welcome to submit a new application.
                </p>

                <Link
                  href="/membership"
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-bg-elevated)] hover:bg-[var(--color-border)] border border-[var(--color-border)] text-[var(--color-text-primary)] font-medium text-sm px-5 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-surface)]"
                >
                  Apply Again
                  <svg
                    width={14}
                    height={14}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1={5} y1={12} x2={19} y2={12} />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </Link>
              </div>
            ) : (
              /* Unknown status fallback */
              <Alert
                variant="info"
                title="Status Unknown"
                message="Your application status could not be determined. Please contact us for assistance."
              />
            )}
          </div>
        )}

        {/* Back link */}
        <div className="mt-8 text-center">
          <Link
            href="/membership"
            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors focus:outline-none focus:underline"
          >
            ← Back to Membership
          </Link>
        </div>
      </div>
    </main>
  );
}