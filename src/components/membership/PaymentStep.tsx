// src/components/membership/PaymentStep.tsx
"use client";

import React, { useCallback, useState } from "react";
import { Copy, Check, Smartphone, CreditCard } from "lucide-react";

import { RadioCard, Input, FormLabel } from "@/components/ui/Forms";
import { CloudinaryWidget } from "@/components/ui/Media";
import { Alert } from "@/components/ui/Feedback";
import { cn, formatCurrency } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaymentStepConfig {
  membershipFee: number;
  bkashNumber: string;
  nagadNumber: string;
  requireScreenshot: boolean;
}

interface PaymentStepValue {
  paymentMethod: string;
  transactionId: string;
  senderPhone: string;
  screenshotUrl: string;
}

interface PaymentStepProps {
  config: PaymentStepConfig;
  value: PaymentStepValue;
  onChange: (v: PaymentStepValue) => void;
}

// ─── CopyableNumber ──────────────────────────────────────────────────────────

interface CopyableNumberProps {
  number: string;
  label: string;
}

function CopyableNumber({ number, label }: CopyableNumberProps): JSX.Element {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments without clipboard API
      const el = document.createElement("textarea");
      el.value = number;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [number]);

  return (
    <div className="flex flex-col gap-1">
      <FormLabel>{label}</FormLabel>
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-lg border px-4 py-3",
          "bg-[var(--color-bg-elevated)] transition-colors duration-150",
          copied
            ? "border-[var(--color-success)]/50"
            : "border-[var(--color-border-accent)]"
        )}
      >
        <span
          className="font-mono text-base font-semibold tracking-widest text-[var(--color-accent)]"
          aria-label={`Account number: ${number}`}
        >
          {number}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Copied!" : `Copy ${label}`}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1",
            "focus:ring-offset-[var(--color-bg-elevated)]",
            copied
              ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
              : "bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]"
          )}
        >
          {copied ? (
            <>
              <Check size={12} aria-hidden="true" />
              Copied!
            </>
          ) : (
            <>
              <Copy size={12} aria-hidden="true" />
              Copy
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── PaymentStep ─────────────────────────────────────────────────────────────

export function PaymentStep({
  config,
  value,
  onChange,
}: PaymentStepProps): JSX.Element {
  const { membershipFee, bkashNumber, nagadNumber, requireScreenshot } = config;
  const { paymentMethod, transactionId, senderPhone, screenshotUrl } = value;

  const activeNumber =
    paymentMethod === "bkash"
      ? bkashNumber
      : paymentMethod === "nagad"
      ? nagadNumber
      : null;

  const handleMethodChange = useCallback(
    (method: "bkash" | "nagad") => {
      onChange({ ...value, paymentMethod: method });
    },
    [onChange, value]
  );

  const handleFieldChange = useCallback(
    (field: keyof PaymentStepValue, fieldValue: string) => {
      onChange({ ...value, [field]: fieldValue });
    },
    [onChange, value]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Fee Display */}
      <div
        className={cn(
          "flex items-center justify-between rounded-xl border px-5 py-4",
          "bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30"
        )}
        aria-label={`Membership fee: ${formatCurrency(membershipFee)}`}
      >
        <div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">
            Membership Fee
          </p>
          <p
            className="mt-0.5 text-2xl font-bold tracking-tight text-[var(--color-text-primary)]"
            aria-live="polite"
          >
            {formatCurrency(membershipFee)}
          </p>
        </div>
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full",
            "bg-[var(--color-primary)]/20 text-[var(--color-primary)]"
          )}
          aria-hidden="true"
        >
          <CreditCard size={22} />
        </div>
      </div>

      {/* Payment Method Selection */}
      <fieldset>
        <legend className="mb-3 text-sm font-medium text-[var(--color-text-primary)]">
          Select Payment Method{" "}
          <span className="text-[var(--color-error)] ml-0.5" aria-hidden="true">
            *
          </span>
        </legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* bKash */}
          <RadioCard
            name="paymentMethod"
            value="bkash"
            checked={paymentMethod === "bkash"}
            onChange={() => handleMethodChange("bkash")}
            label="bKash"
            description="Pay via bKash mobile banking"
            icon={
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg font-bold text-sm",
                  "bg-[#E2136E]/15 text-[#E2136E]"
                )}
                aria-hidden="true"
              >
                b
              </div>
            }
          />

          {/* Nagad */}
          <RadioCard
            name="paymentMethod"
            value="nagad"
            checked={paymentMethod === "nagad"}
            onChange={() => handleMethodChange("nagad")}
            label="Nagad"
            description="Pay via Nagad mobile banking"
            icon={
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  "bg-[#F05A28]/15"
                )}
                aria-hidden="true"
              >
                <Smartphone size={16} className="text-[#F05A28]" />
              </div>
            }
          />
        </div>
      </fieldset>

      {/* Payment Instructions */}
      {paymentMethod && activeNumber && (
        <div className="flex flex-col gap-4">
          {/* Instructions Banner */}
          <Alert
            variant="info"
            title="Payment Instructions"
            message={`Send ${formatCurrency(membershipFee)} to the ${
              paymentMethod === "bkash" ? "bKash" : "Nagad"
            } number below. Use the "Send Money" option. Note the Transaction ID after payment.`}
          />

          {/* Copyable Account Number */}
          <CopyableNumber
            number={activeNumber}
            label={`${paymentMethod === "bkash" ? "bKash" : "Nagad"} Account Number`}
          />

          {/* Step-by-step mini guide */}
          <ol className="flex flex-col gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4">
            <li className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  "bg-[var(--color-primary)]/20 text-[var(--color-primary)]"
                )}
                aria-hidden="true"
              >
                1
              </span>
              Open your{" "}
              <span className="font-medium text-[var(--color-text-primary)]">
                &nbsp;{paymentMethod === "bkash" ? "bKash" : "Nagad"}&nbsp;
              </span>{" "}
              app and select{" "}
              <strong className="text-[var(--color-text-primary)]">
                &nbsp;Send Money
              </strong>
              .
            </li>
            <li className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  "bg-[var(--color-primary)]/20 text-[var(--color-primary)]"
                )}
                aria-hidden="true"
              >
                2
              </span>
              Enter the number above and send exactly{" "}
              <strong className="text-[var(--color-text-primary)]">
                &nbsp;{formatCurrency(membershipFee)}
              </strong>
              .
            </li>
            <li className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  "bg-[var(--color-primary)]/20 text-[var(--color-primary)]"
                )}
                aria-hidden="true"
              >
                3
              </span>
              Copy the{" "}
              <strong className="text-[var(--color-text-primary)]">
                &nbsp;Transaction ID
              </strong>{" "}
              from the confirmation message and fill in the form below.
            </li>
          </ol>
        </div>
      )}

      {/* Transaction Details Form */}
      <div className="flex flex-col gap-4">
        <Input
          label="Transaction ID"
          id="transactionId"
          placeholder="e.g. 8ABC1234XY"
          required
          value={transactionId}
          onChange={(e) => handleFieldChange("transactionId", e.target.value)}
          disabled={!paymentMethod}
          autoComplete="off"
          spellCheck={false}
        />

        <Input
          label="Sender Phone Number"
          id="senderPhone"
          type="tel"
          placeholder="01XXXXXXXXX"
          required
          value={senderPhone}
          onChange={(e) => handleFieldChange("senderPhone", e.target.value)}
          disabled={!paymentMethod}
          autoComplete="tel"
          inputMode="numeric"
          maxLength={11}
        />

        {/* Screenshot Upload */}
        {requireScreenshot && (
          <div>
            <CloudinaryWidget
              folder="payments"
              value={screenshotUrl || null}
              onChange={(url) => handleFieldChange("screenshotUrl", url)}
              label="Payment Screenshot"
              accept="image/*"
              disabled={!paymentMethod}
            />
            <p className="mt-1.5 text-xs text-[var(--color-text-secondary)]">
              Upload a screenshot of your payment confirmation. Accepted formats:
              JPG, PNG, WebP.
            </p>
          </div>
        )}
      </div>

      {/* No method selected hint */}
      {!paymentMethod && (
        <p className="text-center text-sm text-[var(--color-text-secondary)]">
          Please select a payment method above to continue.
        </p>
      )}
    </div>
  );
}