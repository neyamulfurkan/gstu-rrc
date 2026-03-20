// src/components/ui/Overlay.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  createContext,
  useContext,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModalProps, WithChildren } from "@/types/ui";

// ─── Focus Trap Utility ───────────────────────────────────────────────────────

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)).filter(
    (el) => !el.closest("[hidden]") && !el.closest("[aria-hidden='true']")
  );
}

function useFocusTrap(ref: React.RefObject<HTMLElement | null>, isActive: boolean) {
  useEffect(() => {
    if (!isActive || !ref.current) return;

    const container = ref.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Focus first focusable element
    const focusables = getFocusableElements(container);
    if (focusables.length > 0) {
      focusables[0].focus();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;

      const focusableEls = getFocusableElements(container);
      if (focusableEls.length === 0) {
        e.preventDefault();
        return;
      }

      const firstEl = focusableEls[0];
      const lastEl = focusableEls[focusableEls.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }

    container.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isActive, ref]);
}

// ─── Body Scroll Lock ─────────────────────────────────────────────────────────

function useBodyScrollLock(isActive: boolean) {
  useEffect(() => {
    if (!isActive) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isActive]);
}

// ─── Portal Wrapper ───────────────────────────────────────────────────────────

function Portal({ children }: WithChildren) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export interface ExtendedModalProps extends ModalProps, WithChildren {
  closeOnBackdrop?: boolean;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
  showCloseButton?: boolean;
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", damping: 25, stiffness: 350 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 8,
    transition: { duration: 0.15 },
  },
};

const sizeClasses: Record<NonNullable<ExtendedModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[95vw] w-full h-[95vh]",
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  closeOnBackdrop = true,
  size = "md",
  className,
  showCloseButton = true,
}: ExtendedModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2)}`).current;

  useFocusTrap(dialogRef, isOpen);
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  }

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="modal-backdrop"
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.2 }}
            onClick={handleBackdropClick}
          >
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? titleId : undefined}
              className={cn(
                "relative w-full rounded-2xl overflow-hidden flex flex-col",
                "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
                "shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)]",
                size === "full" ? "overflow-y-auto" : "max-h-[90vh]",
                sizeClasses[size],
                className
              )}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              {(title || showCloseButton) && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] shrink-0">
                  {title && (
                    <h2
                      id={titleId}
                      className="text-lg font-semibold text-[var(--color-text-primary)] font-[var(--font-heading)]"
                    >
                      {title}
                    </h2>
                  )}
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      aria-label="Close dialog"
                      className={cn(
                        "p-1.5 rounded-lg text-[var(--color-text-secondary)]",
                        "hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)]",
                        "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                        "transition-colors duration-150",
                        !title && "ml-auto"
                      )}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}
              <div className="flex-1 overflow-y-auto">{children}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

export interface DrawerProps extends WithChildren {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  side?: "right" | "left" | "bottom";
  className?: string;
  showCloseButton?: boolean;
  width?: string;
  disableBodyScrollLock?: boolean;
}

const drawerRightVariants = {
  hidden: { x: "100%", opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring", damping: 28, stiffness: 300 },
  },
  exit: {
    x: "100%",
    opacity: 0,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

const drawerLeftVariants = {
  hidden: { x: "-100%", opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring", damping: 28, stiffness: 300 },
  },
  exit: {
    x: "-100%",
    opacity: 0,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

const drawerBottomVariants = {
  hidden: { y: "100%", opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", damping: 28, stiffness: 300 },
  },
  exit: {
    y: "100%",
    opacity: 0,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  side = "right",
  className,
  showCloseButton = true,
  width = "480px",
  disableBodyScrollLock = false,
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(`drawer-title-${Math.random().toString(36).slice(2)}`).current;

  useFocusTrap(drawerRef, isOpen);
  useBodyScrollLock(disableBodyScrollLock ? false : isOpen);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (side === "bottom" && info.offset.y > 100) {
      onClose();
    } else if (side === "right" && info.offset.x > 100) {
      onClose();
    } else if (side === "left" && info.offset.x < -100) {
      onClose();
    }
  }

  const variants =
    side === "bottom"
      ? drawerBottomVariants
      : side === "left"
      ? drawerLeftVariants
      : drawerRightVariants;

  const drawerClasses =
    side === "bottom"
      ? "fixed bottom-0 left-0 right-0 w-full max-h-[90vh] rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
      : side === "left"
      ? "fixed top-0 left-0 h-full"
      : "fixed top-0 right-0 h-full";

  const shadowClass =
    side === "left"
      ? "shadow-[10px_0_40px_-10px_rgba(0,0,0,0.8)]"
      : side === "bottom"
      ? "shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.8)]"
      : "shadow-[-10px_0_40px_-10px_rgba(0,0,0,0.8)]";

  const borderClass =
    side === "bottom"
      ? "border-t"
      : side === "left"
      ? "border-r"
      : "border-l";

  const dragAxis = side === "bottom" ? "y" : "x";
  const dragConstraints =
    side === "bottom"
      ? { top: 0, bottom: 0 }
      : side === "left"
      ? { left: 0, right: 0 }
      : { left: 0, right: 0 };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="drawer-backdrop"
              className="fixed inset-0 z-[200]"
              style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.2 }}
              onClick={onClose}
            />

            <motion.div
              ref={drawerRef}
              key="drawer-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? titleId : undefined}
              className={cn(
                "z-[201] flex flex-col",
                "bg-[var(--color-bg-elevated)] border-[var(--color-border)]",
                shadowClass,
                borderClass,
                drawerClasses,
                className
              )}
              style={
                side !== "bottom"
                  ? { width: `min(${width}, 100vw)` }
                  : undefined
              }
              variants={variants}
              initial="hidden"
              animate="visible"
              exit="exit"
              drag={dragAxis}
              dragConstraints={dragConstraints}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
            >
              {side === "bottom" && (
                <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing shrink-0">
                  <div className="w-10 h-1 rounded-full bg-[var(--color-border)]" />
                </div>
              )}

              {(title || showCloseButton) && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] shrink-0">
                  {title && (
                    <h2
                      id={titleId}
                      className="text-lg font-semibold text-[var(--color-text-primary)] font-[var(--font-heading)]"
                    >
                      {title}
                    </h2>
                  )}
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      aria-label="Close panel"
                      className={cn(
                        "p-1.5 rounded-lg text-[var(--color-text-secondary)]",
                        "hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)]",
                        "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                        "transition-colors duration-150",
                        !title && "ml-auto"
                      )}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}

              <div className="flex-1 overflow-y-auto">{children}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
}

// ─── DropdownMenu ─────────────────────────────────────────────────────────────

interface DropdownPosition {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

export interface DropdownMenuProps extends WithChildren {
  trigger: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}

export interface DropdownMenuItemProps {
  onClick?: () => void;
  className?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  variant?: "default" | "danger";
  disabled?: boolean;
}

export interface DropdownMenuDividerProps {
  className?: string;
}

const dropdownVariants = {
  hidden: { opacity: 0, scale: 0.95, y: -4 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.12, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -4,
    transition: { duration: 0.1, ease: "easeIn" },
  },
};

export function DropdownMenu({ trigger, children, align = "right", className }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<DropdownPosition>({});
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const menuHeight = 320; // estimated max height
    const menuWidth = 224; // w-56

    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    const openAbove = spaceBelow < menuHeight && spaceAbove > spaceBelow;

    const newPosition: DropdownPosition = {};

    if (openAbove) {
      newPosition.bottom = viewportHeight - triggerRect.top + 4;
    } else {
      newPosition.top = triggerRect.bottom + 4;
    }

    if (align === "right") {
      const rightEdge = viewportWidth - triggerRect.right;
      newPosition.right = rightEdge < 0 ? 4 : viewportWidth - triggerRect.right;
    } else {
      newPosition.left = triggerRect.left < 0 ? 4 : triggerRect.left;
      if (triggerRect.left + menuWidth > viewportWidth) {
        delete newPosition.left;
        newPosition.right = 4;
      }
    }

    setPosition(newPosition);
  }, [align]);

  function toggle() {
    if (!isOpen) {
      calculatePosition();
    }
    setIsOpen((prev) => !prev);
  }

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }

    function handleScroll() {
      setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isOpen]);

  return (
    <div ref={triggerRef} className="relative inline-block">
      <div
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        role="button"
        tabIndex={0}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="focus:outline-none"
      >
        {trigger}
      </div>

      <Portal>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={menuRef}
              role="menu"
              aria-orientation="vertical"
              className={cn(
                "fixed z-[300] w-56 rounded-xl overflow-hidden",
                "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
                "shadow-[0_10px_40px_-10px_rgba(0,0,0,0.7)]",
                "py-1",
                className
              )}
              style={position}
              variants={dropdownVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </div>
  );
}

export function DropdownMenuItem({
  onClick,
  className,
  icon,
  children,
  variant = "default",
  disabled = false,
}: DropdownMenuItemProps) {
  return (
    <button
      role="menuitem"
      onClick={() => {
        if (!disabled && onClick) onClick();
      }}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left",
        "transition-colors duration-100",
        "focus:outline-none",
        variant === "default" && cn(
          "text-[var(--color-text-primary)]",
          "hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-accent)]",
          "focus:bg-[var(--color-bg-surface)]"
        ),
        variant === "danger" && cn(
          "text-[var(--color-error)]",
          "hover:bg-[var(--color-error)]/10",
          "focus:bg-[var(--color-error)]/10"
        ),
        disabled && "opacity-40 cursor-not-allowed pointer-events-none",
        className
      )}
    >
      {icon && (
        <span className="w-4 h-4 shrink-0 flex items-center justify-center">
          {icon}
        </span>
      )}
      <span>{children}</span>
    </button>
  );
}

export function DropdownMenuDivider({ className }: DropdownMenuDividerProps) {
  return (
    <div
      role="separator"
      className={cn("my-1 border-t border-[var(--color-border)]", className)}
    />
  );
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

export interface TooltipProps {
  content: React.ReactNode;
  placement?: "top" | "bottom" | "left" | "right";
  children: React.ReactElement;
  className?: string;
  delay?: number;
}

const tooltipVariantMap = {
  top: {
    hidden: { opacity: 0, y: 4, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
  },
  bottom: {
    hidden: { opacity: 0, y: -4, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
  },
  left: {
    hidden: { opacity: 0, x: 4, scale: 0.95 },
    visible: { opacity: 1, x: 0, scale: 1 },
  },
  right: {
    hidden: { opacity: 0, x: -4, scale: 0.95 },
    visible: { opacity: 1, x: 0, scale: 1 },
  },
};

const tooltipPositionClasses = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

export function Tooltip({
  content,
  placement = "top",
  children,
  className,
  delay = 300,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show() {
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  }

  function hide() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            role="tooltip"
            className={cn(
              "absolute z-[200] pointer-events-none whitespace-nowrap",
              "px-2.5 py-1.5 rounded-lg text-xs font-medium",
              "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
              "border border-[var(--color-border)]",
              "shadow-[0_4px_12px_rgba(0,0,0,0.5)]",
              tooltipPositionClasses[placement],
              className
            )}
            variants={tooltipVariantMap[placement]}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
            transition={{ duration: 0.12, ease: "easeOut" }}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

export interface LightboxImage {
  src: string;
  alt?: string;
  title?: string;
}

export interface LightboxProps {
  images: LightboxImage[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

const lightboxVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const lightboxImageVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
    scale: 0.97,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: { type: "spring", damping: 25, stiffness: 300 },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
    scale: 0.97,
    transition: { duration: 0.15 },
  }),
};

export function Lightbox({ images, initialIndex = 0, isOpen, onClose }: LightboxProps) {
  const [[currentIndex, direction], setPage] = useState([initialIndex, 0]);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setPage([initialIndex, 0]);
    }
  }, [isOpen, initialIndex]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") navigate(1);
      if (e.key === "ArrowLeft") navigate(-1);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex]);

  function navigate(dir: number) {
    setPage((prev) => {
      const [idx] = prev;
      const next = (idx + dir + images.length) % images.length;
      return [next, dir];
    });
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.changedTouches[0].screenX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    touchEndX.current = e.changedTouches[0].screenX;
    const delta = touchStartX.current - touchEndX.current;
    if (Math.abs(delta) > 50) {
      navigate(delta > 0 ? 1 : -1);
    }
  }

  const currentImage = images[currentIndex];

  if (!currentImage) return null;

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={lightboxRef}
            key="lightbox"
            className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.95)" }}
            variants={lightboxVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              aria-label="Close lightbox"
              className={cn(
                "absolute top-4 right-4 z-10 p-2 rounded-full",
                "bg-white/10 text-white hover:bg-white/20",
                "focus:outline-none focus:ring-2 focus:ring-white/50",
                "transition-colors duration-150"
              )}
            >
              <X className="w-6 h-6" />
            </button>

            {/* Navigation — Prev */}
            {images.length > 1 && (
              <button
                onClick={() => navigate(-1)}
                aria-label="Previous image"
                className={cn(
                  "absolute left-4 z-10 p-3 rounded-full",
                  "bg-white/10 text-white hover:bg-white/20",
                  "focus:outline-none focus:ring-2 focus:ring-white/50",
                  "transition-colors duration-150"
                )}
              >
                <ChevronDown className="w-6 h-6 rotate-90" />
              </button>
            )}

            {/* Navigation — Next */}
            {images.length > 1 && (
              <button
                onClick={() => navigate(1)}
                aria-label="Next image"
                className={cn(
                  "absolute right-4 z-10 p-3 rounded-full",
                  "bg-white/10 text-white hover:bg-white/20",
                  "focus:outline-none focus:ring-2 focus:ring-white/50",
                  "transition-colors duration-150"
                )}
              >
                <ChevronDown className="w-6 h-6 -rotate-90" />
              </button>
            )}

            {/* Image */}
            <div className="relative w-full h-full flex items-center justify-center px-16">
              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                  key={currentIndex}
                  custom={direction}
                  variants={lightboxImageVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="relative max-w-full max-h-full flex items-center justify-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentImage.src}
                    alt={currentImage.alt ?? currentImage.title ?? "Image"}
                    className="max-w-[85vw] max-h-[85vh] object-contain rounded-lg select-none"
                    draggable={false}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Caption */}
            {currentImage.title && (
              <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none">
                <div className="px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm text-white text-sm font-medium">
                  {currentImage.title}
                </div>
              </div>
            )}

            {/* Index indicator */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
                {images.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1 rounded-full transition-all duration-200",
                      i === currentIndex
                        ? "w-6 bg-white"
                        : "w-1.5 bg-white/40"
                    )}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}