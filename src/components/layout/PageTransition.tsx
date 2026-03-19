// src/components/layout/PageTransition.tsx
"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type TransitionStyle = "fade" | "slide" | "wipe";

interface VariantConfig {
  initial: Record<string, unknown>;
  animate: Record<string, unknown>;
  exit: Record<string, unknown>;
  transition: Record<string, unknown>;
}

const VARIANTS: Record<TransitionStyle, VariantConfig> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  },
  slide: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.2 },
  },
  wipe: {
    initial: { clipPath: "inset(0 100% 0 0)" },
    animate: { clipPath: "inset(0 0% 0 0)" },
    exit: { clipPath: "inset(0 0 0 100%)" },
    transition: { duration: 0.3, ease: "easeInOut" },
  },
};

const REDUCED_MOTION_VARIANT: VariantConfig = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.1 },
};

interface MotionModule {
  AnimatePresence: React.ComponentType<{
    mode?: "wait" | "sync" | "popLayout";
    children: React.ReactNode;
  }>;
  motion: {
    div: React.ComponentType<{
      key?: string;
      variants?: Record<string, unknown>;
      initial?: string;
      animate?: string;
      exit?: string;
      transition?: Record<string, unknown>;
      style?: React.CSSProperties;
      children?: React.ReactNode;
    }>;
  };
}

export function PageTransition({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const pathname = usePathname();
  const [transitionStyle, setTransitionStyle] =
    useState<TransitionStyle>("fade");
  const [prefersReducedMotion, setPrefersReducedMotion] =
    useState<boolean>(false);
  const [motionModule, setMotionModule] = useState<MotionModule | null>(null);
  const motionLoadedRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const bodyStyle = document.body.dataset.transitionStyle as
      | TransitionStyle
      | undefined;
    const validStyles: TransitionStyle[] = ["fade", "slide", "wipe"];
    if (bodyStyle && validStyles.includes(bodyStyle)) {
      setTransitionStyle(bodyStyle);
    } else {
      setTransitionStyle("fade");
    }

    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mql.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    mql.addEventListener("change", handleChange);

    return () => {
      mql.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    if (motionLoadedRef.current) return;
    motionLoadedRef.current = true;

    import("framer-motion")
      .then((mod) => {
        setMotionModule({
          AnimatePresence: mod.AnimatePresence as MotionModule["AnimatePresence"],
          motion: mod.motion as unknown as MotionModule["motion"],
        });
      })
      .catch(() => {
        motionLoadedRef.current = false;
      });
  }, []);

  const activeVariant: VariantConfig = prefersReducedMotion
    ? REDUCED_MOTION_VARIANT
    : VARIANTS[transitionStyle];

  const motionVariants = {
    initial: activeVariant.initial,
    animate: activeVariant.animate,
    exit: activeVariant.exit,
  };

  if (!motionModule) {
    return <>{children}</>;
  }

  const { AnimatePresence, motion } = motionModule;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        variants={motionVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={activeVariant.transition}
        style={{ minHeight: "100%" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}