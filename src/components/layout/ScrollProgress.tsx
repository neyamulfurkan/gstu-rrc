// src/components/layout/ScrollProgress.tsx
"use client";

import { useState, useEffect } from "react";

export function ScrollProgress(): JSX.Element {
  const [scrollPercent, setScrollPercent] = useState<number>(0);

  useEffect(() => {
    const handleScroll = (): void => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) {
        setScrollPercent(0);
        return;
      }
      const percent = (scrollTop / docHeight) * 100;
      setScrollPercent(Math.min(100, Math.max(0, percent)));
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed left-0 top-0 z-[9999] h-[3px] bg-[var(--color-accent)]"
      style={{ width: `${scrollPercent}%`, willChange: "width", transition: "none" }}
    />
  );
}