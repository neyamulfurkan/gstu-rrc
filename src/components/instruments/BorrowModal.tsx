// src/components/instruments/BorrowModal.tsx
"use client";

import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Modal } from "@/components/ui/Overlay";
import { Input, Textarea, FormLabel, FormError } from "@/components/ui/Forms";
import { Spinner, Alert } from "@/components/ui/Feedback";
import { borrowRequestSchema } from "@/lib/validations";
import type { InstrumentCard } from "@/types/index";

// ─── Types ────────────────────────────────────────────────────────────────────

type BorrowFormValues = z.infer<typeof borrowRequestSchema>;

export interface BorrowModalProps {
  instrument: InstrumentCard;
  onClose: () => void;
  onSuccess: () => void;
}

// ─── BorrowModal ──────────────────────────────────────────────────────────────

export function BorrowModal({ instrument, onClose, onSuccess }: BorrowModalProps): JSX.Element {
  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    watch,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BorrowFormValues>({
    resolver: zodResolver(borrowRequestSchema),
    defaultValues: {
      instrumentId: instrument.id,
      purpose: "",
      borrowDate: new Date(today),
      returnDate: new Date(today),
      notes: "",
    },
  });

  const borrowDateValue = watch("borrowDate");

  const getMinReturnDate = (): string => {
    if (!borrowDateValue) return today;
    try {
      const d = new Date(borrowDateValue);
      if (isNaN(d.getTime())) return today;
      // Return date must be after borrow date (next day at earliest)
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      return next.toISOString().split("T")[0];
    } catch {
      return today;
    }
  };

  async function onSubmit(data: BorrowFormValues) {
    try {
      const response = await fetch(`/api/instruments/${instrument.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request",
          purpose: data.purpose,
          borrowDate: data.borrowDate,
          returnDate: data.returnDate,
          notes: data.notes ?? "",
        }),
      });

      if (response.status === 201 || response.ok) {
        onSuccess();
        return;
      }

      if (response.status === 409) {
        setError("root", {
          message: "You already have a pending borrow request for this instrument.",
        });
        return;
      }

      if (response.status === 400) {
        let body: { error?: string; message?: string } = {};
        try {
          body = await response.json();
        } catch {
          // ignore parse error
        }
        setError("root", {
          message: body.error ?? body.message ?? "Invalid request. Please check your inputs.",
        });
        return;
      }

      if (response.status === 401) {
        setError("root", { message: "You must be logged in to request a borrow." });
        return;
      }

      if (response.status === 403) {
        setError("root", {
          message: "This instrument is not available for borrowing at this time.",
        });
        return;
      }

      setError("root", {
        message: "Something went wrong. Please try again.",
      });
    } catch {
      setError("root", {
        message: "Network error. Please check your connection and try again.",
      });
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Request to Borrow: ${instrument.name}`}
      size="md"
      closeOnBackdrop={!isSubmitting}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5 p-6">
        {/* Root / server error */}
        {errors.root?.message && (
          <Alert
            variant="error"
            message={errors.root.message}
            dismissible={false}
          />
        )}

        {/* Instrument summary row */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={instrument.imageUrl}
            alt={instrument.name}
            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
              {instrument.name}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {instrument.category.name}
            </p>
          </div>
          <span
            className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
            style={{
              color: "var(--color-success)",
              backgroundColor: "rgba(0,200,150,0.1)",
              border: "1px solid rgba(0,200,150,0.2)",
            }}
          >
            Available
          </span>
        </div>

        {/* Purpose */}
        <div>
          <Textarea
            {...register("purpose")}
            label="Purpose"
            required
            placeholder="Describe why you need this instrument and how you plan to use it (min 10 characters)..."
            error={errors.purpose?.message}
            id="borrow-purpose"
            rows={3}
            disabled={isSubmitting}
          />
        </div>

        {/* Date row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Borrow Date */}
          <div>
            <Controller
              name="borrowDate"
              control={control}
              render={({ field }) => (
                <Input
                  label="Borrow Date"
                  type="date"
                  required
                  id="borrow-date"
                  min={today}
                  value={
                    field.value
                      ? new Date(field.value).toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    field.onChange(val ? new Date(val) : undefined);
                  }}
                  error={errors.borrowDate?.message}
                  disabled={isSubmitting}
                />
              )}
            />
          </div>

          {/* Return Date */}
          <div>
            <Controller
              name="returnDate"
              control={control}
              render={({ field }) => (
                <Input
                  label="Return Date"
                  type="date"
                  required
                  id="return-date"
                  min={getMinReturnDate()}
                  value={
                    field.value
                      ? new Date(field.value).toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    field.onChange(val ? new Date(val) : undefined);
                  }}
                  error={errors.returnDate?.message}
                  disabled={isSubmitting}
                />
              )}
            />
          </div>
        </div>

        {/* Additional Notes (optional) */}
        <div>
          <Textarea
            {...register("notes")}
            label="Additional Notes"
            placeholder="Any additional information for the admin (optional)..."
            id="borrow-notes"
            rows={2}
            disabled={isSubmitting}
          />
        </div>

        {/* Policy note */}
        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
          By submitting this request, you agree to return the instrument in the same
          condition by the specified return date. Abuse of this service may result in
          suspension of borrowing privileges.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-150
              text-[var(--color-text-secondary)]
              hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)]
              focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg
              bg-[var(--color-primary)] text-[var(--color-text-inverse)]
              hover:bg-[var(--color-primary-hover)]
              focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-elevated)]
              disabled:opacity-60 disabled:cursor-not-allowed
              transition-colors duration-150"
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" label="Submitting request..." />
                <span>Submitting…</span>
              </>
            ) : (
              "Submit Request"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}