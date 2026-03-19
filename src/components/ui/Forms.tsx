// src/components/ui/Forms.tsx
"use client";

import * as React from "react";
import { ChevronDown, Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import type { WithClassName } from "@/types/ui";

// ─── FormLabel ────────────────────────────────────────────────────────────────

export interface FormLabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement>,
    WithClassName {
  required?: boolean;
}

export const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ children, className, required, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "block text-sm font-medium text-[var(--color-text-primary)] mb-1",
        className
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-1 text-[var(--color-error)]" aria-hidden="true">
          *
        </span>
      )}
    </label>
  )
);
FormLabel.displayName = "FormLabel";

// ─── FormError ────────────────────────────────────────────────────────────────

export interface FormErrorProps extends WithClassName {
  id?: string;
  children?: React.ReactNode;
}

export const FormError: React.FC<FormErrorProps> = ({ children, className, id }) => {
  if (!children) return null;
  return (
    <span
      id={id}
      role="alert"
      aria-live="polite"
      className={cn(
        "block mt-1 text-xs text-[var(--color-error)]",
        className
      )}
    >
      {children}
    </span>
  );
};
FormError.displayName = "FormError";

// ─── Input ────────────────────────────────────────────────────────────────────

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    WithClassName {
  error?: string;
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, id, required, ...props }, ref) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const errorId = inputId ? `${inputId}-error` : undefined;

    return (
      <div className="w-full">
        {label && (
          <FormLabel htmlFor={inputId} required={required}>
            {label}
          </FormLabel>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error && errorId ? errorId : undefined}
          className={cn(
            "block w-full rounded-lg px-3 py-2 text-sm",
            "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
            "border border-[var(--color-border)]",
            "placeholder:text-[var(--color-text-secondary)]",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error
              ? "border-[var(--color-error)] focus:ring-[var(--color-error)] focus:border-[var(--color-error)]"
              : "",
            className
          )}
          {...props}
        />
        {error && <FormError id={errorId}>{error}</FormError>}
      </div>
    );
  }
);
Input.displayName = "Input";

// ─── Textarea ─────────────────────────────────────────────────────────────────

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    WithClassName {
  error?: string;
  label?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, id, required, onInput, ...props }, ref) => {
    const textareaId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const errorId = textareaId ? `${textareaId}-error` : undefined;

    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      const el = e.currentTarget;
      el.style.height = "auto";
      el.style.height = `${Math.max(80, el.scrollHeight)}px`;
      onInput?.(e);
    };

    return (
      <div className="w-full">
        {label && (
          <FormLabel htmlFor={textareaId} required={required}>
            {label}
          </FormLabel>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error && errorId ? errorId : undefined}
          onInput={handleInput}
          style={{ minHeight: "80px" }}
          className={cn(
            "block w-full rounded-lg px-3 py-2 text-sm resize-none overflow-hidden",
            "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
            "border border-[var(--color-border)]",
            "placeholder:text-[var(--color-text-secondary)]",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error
              ? "border-[var(--color-error)] focus:ring-[var(--color-error)] focus:border-[var(--color-error)]"
              : "",
            className
          )}
          {...props}
        />
        {error && <FormError id={errorId}>{error}</FormError>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

// ─── Select ───────────────────────────────────────────────────────────────────

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement>,
    WithClassName {
  error?: string;
  label?: string;
  placeholder?: string;
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      error,
      label,
      id,
      required,
      placeholder,
      options,
      children,
      ...props
    },
    ref
  ) => {
    const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const errorId = selectId ? `${selectId}-error` : undefined;

    return (
      <div className="w-full">
        {label && (
          <FormLabel htmlFor={selectId} required={required}>
            {label}
          </FormLabel>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            required={required}
            aria-invalid={!!error}
            aria-describedby={error && errorId ? errorId : undefined}
            className={cn(
              "block w-full appearance-none rounded-lg px-3 py-2 pr-9 text-sm",
              "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
              "border border-[var(--color-border)]",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              error
                ? "border-[var(--color-error)] focus:ring-[var(--color-error)] focus:border-[var(--color-error)]"
                : "",
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
            size={16}
            aria-hidden="true"
          />
        </div>
        {error && <FormError id={errorId}>{error}</FormError>}
      </div>
    );
  }
);
Select.displayName = "Select";

// ─── Checkbox ─────────────────────────────────────────────────────────────────

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">,
    WithClassName {
  error?: string;
  label?: React.ReactNode;
  description?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, error, label, description, id, required, ...props }, ref) => {
    const checkboxId = id ?? (typeof label === "string" ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const errorId = checkboxId ? `${checkboxId}-error` : undefined;
    const descriptionId = checkboxId && description ? `${checkboxId}-desc` : undefined;

    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-start gap-2.5">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            required={required}
            aria-invalid={!!error}
            aria-describedby={
              [errorId, descriptionId].filter(Boolean).join(" ") || undefined
            }
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 rounded border border-[var(--color-border)]",
              "bg-[var(--color-bg-elevated)]",
              "accent-[var(--color-accent)]",
              "cursor-pointer",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1 focus:ring-offset-[var(--color-bg-base)]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              error ? "border-[var(--color-error)]" : "",
              className
            )}
            {...props}
          />
          {(label || description) && (
            <div className="flex flex-col">
              {label && (
                <label
                  htmlFor={checkboxId}
                  className={cn(
                    "text-sm font-medium text-[var(--color-text-primary)] cursor-pointer",
                    props.disabled ? "opacity-50 cursor-not-allowed" : ""
                  )}
                >
                  {label}
                  {required && (
                    <span className="ml-1 text-[var(--color-error)]" aria-hidden="true">
                      *
                    </span>
                  )}
                </label>
              )}
              {description && (
                <p
                  id={descriptionId}
                  className="text-xs text-[var(--color-text-secondary)] mt-0.5"
                >
                  {description}
                </p>
              )}
            </div>
          )}
        </div>
        {error && <FormError id={errorId}>{error}</FormError>}
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";

// ─── RadioCard ────────────────────────────────────────────────────────────────

export interface RadioCardProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">,
    WithClassName {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  error?: string;
}

export const RadioCard = React.forwardRef<HTMLInputElement, RadioCardProps>(
  (
    { className, label, description, icon, error, id, checked, disabled, ...props },
    ref
  ) => {
    const cardId = id ?? label.toLowerCase().replace(/\s+/g, "-");
    const errorId = `${cardId}-error`;

    return (
      <div className={cn("flex flex-col gap-0.5", className)}>
        <label
          htmlFor={cardId}
          className={cn(
            "relative flex flex-col items-start gap-2 rounded-xl border p-4 cursor-pointer",
            "transition-all duration-150 select-none",
            "bg-[var(--color-bg-surface)]",
            checked
              ? "border-[var(--color-accent)] bg-[var(--color-bg-elevated)] shadow-[0_0_0_1px_var(--color-accent)]"
              : "border-[var(--color-border)] hover:border-[var(--color-accent)]/50",
            disabled ? "opacity-50 cursor-not-allowed" : "",
            error ? "border-[var(--color-error)]" : ""
          )}
        >
          <input
            ref={ref}
            type="radio"
            id={cardId}
            checked={checked}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className="sr-only"
            {...props}
          />
          {icon && (
            <span
              className={cn(
                "flex items-center justify-center",
                checked
                  ? "text-[var(--color-accent)]"
                  : "text-[var(--color-text-secondary)]"
              )}
              aria-hidden="true"
            >
              {icon}
            </span>
          )}
          <span className="flex flex-col gap-0.5">
            <span
              className={cn(
                "text-sm font-semibold",
                checked
                  ? "text-[var(--color-accent)]"
                  : "text-[var(--color-text-primary)]"
              )}
            >
              {label}
            </span>
            {description && (
              <span className="text-xs text-[var(--color-text-secondary)]">
                {description}
              </span>
            )}
          </span>
          {/* Selection indicator dot */}
          <span
            className={cn(
              "absolute right-3 top-3 h-4 w-4 rounded-full border-2 transition-all duration-150",
              checked
                ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
                : "border-[var(--color-border)] bg-transparent"
            )}
            aria-hidden="true"
          >
            {checked && (
              <span className="absolute inset-[3px] rounded-full bg-[var(--color-bg-base)]" />
            )}
          </span>
        </label>
        {error && <FormError id={errorId}>{error}</FormError>}
      </div>
    );
  }
);
RadioCard.displayName = "RadioCard";

// ─── PasswordInput ────────────────────────────────────────────────────────────

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">,
    WithClassName {
  error?: string;
  label?: string;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, error, label, id, required, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const errorId = inputId ? `${inputId}-error` : undefined;

    const toggleVisibility = () => setShowPassword((prev) => !prev);

    return (
      <div className="w-full">
        {label && (
          <FormLabel htmlFor={inputId} required={required}>
            {label}
          </FormLabel>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={showPassword ? "text" : "password"}
            required={required}
            aria-invalid={!!error}
            aria-describedby={error && errorId ? errorId : undefined}
            className={cn(
              "block w-full rounded-lg px-3 py-2 pr-10 text-sm",
              "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
              "border border-[var(--color-border)]",
              "placeholder:text-[var(--color-text-secondary)]",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              error
                ? "border-[var(--color-error)] focus:ring-[var(--color-error)] focus:border-[var(--color-error)]"
                : "",
              className
            )}
            {...props}
          />
          <button
            type="button"
            onClick={toggleVisibility}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className={cn(
              "absolute right-2.5 top-1/2 -translate-y-1/2",
              "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
            )}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff size={16} aria-hidden="true" />
            ) : (
              <Eye size={16} aria-hidden="true" />
            )}
          </button>
        </div>
        {error && <FormError id={errorId}>{error}</FormError>}
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";