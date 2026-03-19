"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

interface SuccessScreenProps {
  applicantName: string;
  email: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 20 },
  },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.9 },
  },
};

const steps = [
  {
    number: "01",
    title: "Application Review",
    description: "An admin will review your submitted information and payment details.",
  },
  {
    number: "02",
    title: "Payment Verification",
    description: "Your bKash or Nagad transaction will be verified against our records.",
  },
  {
    number: "03",
    title: "Account Created",
    description: "Once approved, your account is created and login credentials sent to your email.",
  },
];

export function SuccessScreen({ applicantName, email }: SuccessScreenProps): JSX.Element {
  const circleRef = useRef<SVGCircleElement>(null);
  const checkRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const circle = circleRef.current;
    const check = checkRef.current;
    if (!circle || !check) return;

    const circleLen = circle.getTotalLength?.() ?? 201;
    const checkLen = check.getTotalLength?.() ?? 60;

    circle.style.strokeDasharray = String(circleLen);
    circle.style.strokeDashoffset = String(circleLen);
    check.style.strokeDasharray = String(checkLen);
    check.style.strokeDashoffset = String(checkLen);

    // Trigger reflow
    void circle.getBoundingClientRect();

    circle.style.transition = "stroke-dashoffset 0.6s cubic-bezier(0.65,0,0.35,1)";
    circle.style.strokeDashoffset = "0";

    const checkTimer = setTimeout(() => {
      check.style.transition = "stroke-dashoffset 0.5s cubic-bezier(0.65,0,0.35,1)";
      check.style.strokeDashoffset = "0";
    }, 500);

    return () => clearTimeout(checkTimer);
  }, []);

  const statusUrl = `/membership/status?email=${encodeURIComponent(email)}`;

  return (
    <div
      className={cn(
        "min-h-[400px] flex flex-col items-center justify-center",
        "py-16 px-4 text-center"
      )}
    >
      {/* Animated SVG Checkmark */}
      <div className="mb-8">
        <svg
          width="96"
          height="96"
          viewBox="0 0 96 96"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Glow filter */}
          <defs>
            <filter id="checkGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background circle fill */}
          <circle
            cx="48"
            cy="48"
            r="44"
            fill="var(--color-success)"
            fillOpacity="0.1"
          />

          {/* Animated stroke circle */}
          <circle
            ref={circleRef}
            cx="48"
            cy="48"
            r="32"
            stroke="var(--color-success)"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            transform="rotate(-90 48 48)"
            filter="url(#checkGlow)"
          />

          {/* Animated check path */}
          <path
            ref={checkRef}
            d="M30 48 L42 60 L66 36"
            stroke="var(--color-success)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            filter="url(#checkGlow)"
          />
        </svg>
      </div>

      {/* Staggered content */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center gap-6 w-full max-w-lg"
      >
        {/* Club logo placeholder */}
        <motion.div variants={fadeUp}>
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              "bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30"
            )}
            aria-hidden="true"
          >
            <span
              className="text-xs font-bold text-[var(--color-primary)]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              GR
            </span>
          </div>
        </motion.div>

        {/* Heading */}
        <motion.div variants={fadeUp}>
          <h1
            className="text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Application Submitted!
          </h1>
        </motion.div>

        {/* Personalised message */}
        <motion.p
          variants={fadeUp}
          className="text-[var(--color-text-secondary)] text-base leading-relaxed"
        >
          Thank you,{" "}
          <span className="text-[var(--color-text-primary)] font-semibold">
            {applicantName}
          </span>
          ! We&apos;ll review your application and notify you at{" "}
          <span
            className="text-[var(--color-accent)] font-medium break-all"
            style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}
          >
            {email}
          </span>
          .
        </motion.p>

        {/* Divider */}
        <motion.div
          variants={fadeUp}
          className="w-full h-px bg-[var(--color-border)]"
          aria-hidden="true"
        />

        {/* What happens next */}
        <motion.div variants={fadeUp} className="w-full text-left">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)] mb-4">
            What happens next
          </p>
          <ol className="space-y-4" aria-label="Application next steps">
            {steps.map((step) => (
              <li key={step.number} className="flex items-start gap-4">
                <span
                  className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                    "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
                    "text-xs font-bold text-[var(--color-accent)]"
                  )}
                  style={{ fontFamily: "var(--font-mono)" }}
                  aria-hidden="true"
                >
                  {step.number}
                </span>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-0.5">
                    {step.title}
                  </p>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          variants={fadeUp}
          className="flex flex-col sm:flex-row gap-3 w-full pt-2"
        >
          <Link
            href="/"
            className={cn(
              "flex-1 inline-flex items-center justify-center",
              "px-5 py-2.5 rounded-md text-sm font-medium",
              "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
              "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
              "hover:border-[var(--color-border-accent)]",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            )}
          >
            Return to Home
          </Link>

          <Link
            href={statusUrl}
            className={cn(
              "flex-1 inline-flex items-center justify-center",
              "px-5 py-2.5 rounded-md text-sm font-medium",
              "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]",
              "text-[var(--color-text-inverse)]",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            )}
          >
            Check Application Status
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}