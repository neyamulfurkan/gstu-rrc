// src/components/ui/Feedback.tsx
"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  CheckCircle,
  Info,
  X,
  XCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { BadgeVariant } from "@/types/ui";

// ─── Badge ────────────────────────────────────────────────────────────────────

interface BadgeProps {
  variant?: BadgeVariant;
  size?: "sm" | "md" | "lg";
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export function Badge({
  variant = "neutral",
  size = "md",
  className,
  style,
  children,
}: BadgeProps): JSX.Element {
  const variantClasses: Record<BadgeVariant, string> = {
    success:
      "text-[var(--color-success)] bg-[var(--color-success)]/10 border border-[var(--color-success)]/20",
    warning:
      "text-[var(--color-warning)] bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20",
    error:
      "text-[var(--color-error)] bg-[var(--color-error)]/10 border border-[var(--color-error)]/20",
    primary:
      "text-[var(--color-primary)] bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20",
    accent:
      "text-[var(--color-accent)] bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20",
    neutral:
      "text-[var(--color-text-secondary)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
  };

  const sizeClasses: Record<"sm" | "md" | "lg", string> = {
    sm: "px-1.5 py-0.5 text-xs",
    md: "px-2.5 py-0.5 text-xs",
    lg: "px-3 py-1 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      style={style}
    >
      {children}
    </span>
  );
}

// ─── Alert ────────────────────────────────────────────────────────────────────

interface AlertProps {
  variant?: "success" | "warning" | "error" | "info";
  title?: string;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export function Alert({
  variant = "info",
  title,
  message,
  dismissible = false,
  onDismiss,
  className,
}: AlertProps): JSX.Element | null {
  const [visible, setVisible] = useState(true);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  if (!visible) return null;

  const variantConfig: Record<
    "success" | "warning" | "error" | "info",
    {
      icon: React.ReactNode;
      containerClass: string;
      titleClass: string;
    }
  > = {
    success: {
      icon: (
        <CheckCircle
          size={18}
          className="text-[var(--color-success)] flex-shrink-0"
          aria-hidden="true"
        />
      ),
      containerClass:
        "bg-[var(--color-success)]/10 border border-[var(--color-success)]/30",
      titleClass: "text-[var(--color-success)]",
    },
    warning: {
      icon: (
        <AlertCircle
          size={18}
          className="text-[var(--color-warning)] flex-shrink-0"
          aria-hidden="true"
        />
      ),
      containerClass:
        "bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30",
      titleClass: "text-[var(--color-warning)]",
    },
    error: {
      icon: (
        <XCircle
          size={18}
          className="text-[var(--color-error)] flex-shrink-0"
          aria-hidden="true"
        />
      ),
      containerClass:
        "bg-[var(--color-error)]/10 border border-[var(--color-error)]/30",
      titleClass: "text-[var(--color-error)]",
    },
    info: {
      icon: (
        <Info
          size={18}
          className="text-[var(--color-primary)] flex-shrink-0"
          aria-hidden="true"
        />
      ),
      containerClass:
        "bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30",
      titleClass: "text-[var(--color-primary)]",
    },
  };

  const { icon, containerClass, titleClass } = variantConfig[variant];

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-lg p-4",
        containerClass,
        className
      )}
    >
      {icon}
      <div className="flex-1 min-w-0">
        {title && (
          <p className={cn("text-sm font-semibold leading-5 mb-0.5", titleClass)}>
            {title}
          </p>
        )}
        <p className="text-sm text-[var(--color-text-secondary)] leading-5">
          {message}
        </p>
      </div>
      {dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss alert"
          className={cn(
            "flex-shrink-0 rounded-md p-0.5 transition-colors",
            "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          )}
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: "sm" | "md" | "lg" | "full";
}

export function Skeleton({
  className,
  width,
  height,
  rounded = "md",
}: SkeletonProps): JSX.Element {
  const roundedClasses = {
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    full: "rounded-full",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[var(--color-bg-surface)]",
        "before:absolute before:inset-0",
        "before:bg-gradient-to-r before:from-transparent before:via-[var(--color-bg-elevated)] before:to-transparent",
        "before:animate-[shimmer_1.5s_infinite]",
        roundedClasses[rounded],
        "animate-pulse",
        className
      )}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
      }}
      aria-hidden="true"
    />
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

export function Spinner({
  size = "md",
  className,
  label = "Loading...",
}: SpinnerProps): JSX.Element {
  const sizeMap = { sm: 16, md: 24, lg: 40 };
  const px = sizeMap[size];
  const stroke = size === "sm" ? 2 : size === "md" ? 2.5 : 3;

  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-flex items-center justify-center", className)}
    >
      <svg
        width={px}
        height={px}
        viewBox={`0 0 ${px} ${px}`}
        fill="none"
        className="animate-spin"
        aria-hidden="true"
      >
        <circle
          cx={px / 2}
          cy={px / 2}
          r={px / 2 - stroke}
          stroke="currentColor"
          strokeWidth={stroke}
          strokeOpacity={0.2}
        />
        <path
          d={`M ${px / 2} ${stroke} A ${px / 2 - stroke} ${px / 2 - stroke} 0 0 1 ${px - stroke} ${px / 2}`}
          stroke="var(--color-accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  createdAt: number;
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({
  addToast: () => undefined,
});

// Module-level queue and listener for imperative `toast()` calls
type ToastListener = (message: string, type: ToastType) => void;
const _toastListeners: Set<ToastListener> = new Set();

/**
 * Imperative toast trigger — callable anywhere in the app.
 */
export function toast(message: string, type: ToastType = "info"): void {
  _toastListeners.forEach((fn) => fn(message, type));
}

interface ToastItemViewProps {
  item: ToastItem;
  onRemove: (id: string) => void;
}

function ToastItemView({ item, onRemove }: ToastItemViewProps): JSX.Element {
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(item.id);
    }, 3000);
    return () => clearTimeout(timer);
  }, [item.id, onRemove]);

  useEffect(() => {
    if (!progressRef.current) return;
    const el = progressRef.current;
    el.style.transition = "none";
    el.style.width = "100%";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = "width 3000ms linear";
        el.style.width = "0%";
      });
    });
  }, []);

  const variantConfig: Record<
    ToastType,
    { icon: React.ReactNode; barColor: string; borderColor: string }
  > = {
    success: {
      icon: <CheckCircle size={16} aria-hidden="true" className="text-[var(--color-success)]" />,
      barColor: "var(--color-success)",
      borderColor: "var(--color-success)",
    },
    error: {
      icon: <XCircle size={16} aria-hidden="true" className="text-[var(--color-error)]" />,
      barColor: "var(--color-error)",
      borderColor: "var(--color-error)",
    },
    info: {
      icon: <Info size={16} aria-hidden="true" className="text-[var(--color-primary)]" />,
      barColor: "var(--color-accent)",
      borderColor: "var(--color-primary)",
    },
  };

  const { icon, barColor, borderColor } = variantConfig[item.type];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        "relative overflow-hidden rounded-lg shadow-lg",
        "bg-[var(--color-bg-elevated)] border",
        "min-w-[280px] max-w-[360px]",
        "flex items-start gap-3 p-4",
        "animate-[slideInRight_0.3s_ease-out]"
      )}
      style={{ borderColor }}
    >
      <span className="flex-shrink-0 mt-0.5">{icon}</span>
      <p className="flex-1 text-sm text-[var(--color-text-primary)] leading-5 pr-2">
        {item.message}
      </p>
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        aria-label="Close notification"
        className={cn(
          "flex-shrink-0 rounded p-0.5 text-[var(--color-text-secondary)]",
          "hover:text-[var(--color-text-primary)] transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        )}
      >
        <X size={14} aria-hidden="true" />
      </button>
      {/* Progress bar */}
      <div
        className="absolute bottom-0 left-0 h-0.5"
        ref={progressRef}
        style={{ backgroundColor: barColor, width: "100%" }}
      />
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, type, createdAt: Date.now() }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    _toastListeners.add(addToast);
    return () => {
      _toastListeners.delete(addToast);
    };
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps): JSX.Element | null {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className={cn(
        "fixed z-[9999] flex flex-col gap-2 pointer-events-none",
        // Desktop: top-right; Mobile: top-center
        "top-4 right-4",
        "sm:top-4 sm:right-4",
        "max-sm:right-4 max-sm:left-4 max-sm:items-center"
      )}
    >
      {toasts.map((item) => (
        <div key={item.id} className="pointer-events-auto">
          <ToastItemView item={item} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────

interface ProgressBarProps {
  value: number; // 0–100
  variant?: BadgeVariant;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
  label?: string;
}

export function ProgressBar({
  value,
  variant = "accent",
  size = "md",
  showLabel = false,
  className,
  label,
}: ProgressBarProps): JSX.Element {
  const clampedValue = Math.min(100, Math.max(0, value));

  const trackColorMap: Record<BadgeVariant, string> = {
    success: "var(--color-success)",
    warning: "var(--color-warning)",
    error: "var(--color-error)",
    primary: "var(--color-primary)",
    accent: "var(--color-accent)",
    neutral: "var(--color-text-secondary)",
  };

  const sizeClasses: Record<"sm" | "md" | "lg", string> = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  };

  const barColor = trackColorMap[variant];

  return (
    <div className={cn("w-full", className)}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && (
            <span className="text-xs text-[var(--color-text-secondary)]">{label}</span>
          )}
          {showLabel && (
            <span className="text-xs font-medium text-[var(--color-text-primary)] ml-auto">
              {clampedValue}%
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? `${clampedValue}% progress`}
        className={cn(
          "w-full overflow-hidden rounded-full bg-[var(--color-bg-elevated)]",
          sizeClasses[size]
        )}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: `${clampedValue}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
    </div>
  );
}