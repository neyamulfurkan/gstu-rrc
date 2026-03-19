// src/components/layout/CustomCursor.tsx
"use client";

import { useEffect, useRef, useState } from "react";

export function CustomCursor(): JSX.Element | null {
  const [shouldRender, setShouldRender] = useState(false);

  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  const mouseX = useRef(0);
  const mouseY = useRef(0);
  const ringX = useRef(0);
  const ringY = useRef(0);
  const rafId = useRef<number>(0);

  const isHoveringClickable = useRef(false);
  const isHoveringImage = useRef(false);

  useEffect(() => {
    // Touch device check — skip custom cursor entirely
    if (navigator.maxTouchPoints > 0) return;

    // Reduced motion check
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;

    setShouldRender(true);
  }, []);

  useEffect(() => {
    if (!shouldRender) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    // Initialize positions off-screen to avoid flash at 0,0
    mouseX.current = -200;
    mouseY.current = -200;
    ringX.current = -200;
    ringY.current = -200;

    function onMouseMove(e: MouseEvent): void {
      mouseX.current = e.clientX;
      mouseY.current = e.clientY;

      // Update dot position immediately (synchronous, 60fps)
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 4}px)`;
      }

      // Check hover targets
      const target = e.target as Element | null;

      const clickable =
        target?.closest("a, button, [role='button'], [role='link'], label, input, select, textarea") ??
        null;
      const image = target?.closest("img") ?? null;

      const wasClickable = isHoveringClickable.current;
      const wasImage = isHoveringImage.current;

      isHoveringClickable.current = clickable !== null;
      isHoveringImage.current = image !== null && clickable === null;

      const ringEl = ringRef.current;
      if (!ringEl) return;

      if (isHoveringClickable.current && !wasClickable) {
        ringEl.classList.add("cursor-ring--clickable");
        ringEl.classList.remove("cursor-ring--image");
        ringEl.textContent = "";
      } else if (!isHoveringClickable.current && wasClickable) {
        ringEl.classList.remove("cursor-ring--clickable");
        ringEl.textContent = "";
      }

      if (isHoveringImage.current && !wasImage) {
        ringEl.classList.add("cursor-ring--image");
        ringEl.classList.remove("cursor-ring--clickable");
        ringEl.textContent = "View";
      } else if (!isHoveringImage.current && wasImage) {
        ringEl.classList.remove("cursor-ring--image");
        ringEl.textContent = "";
      }
    }

    function onMouseLeave(): void {
      if (dotRef.current) {
        dotRef.current.style.opacity = "0";
      }
      if (ringRef.current) {
        ringRef.current.style.opacity = "0";
      }
    }

    function onMouseEnter(): void {
      if (dotRef.current) {
        dotRef.current.style.opacity = "1";
      }
      if (ringRef.current) {
        ringRef.current.style.opacity = "1";
      }
    }

    function animate(): void {
      // Spring interpolation for ring: lerp 12% toward target each frame
      ringX.current += (mouseX.current - ringX.current) * 0.12;
      ringY.current += (mouseY.current - ringY.current) * 0.12;

      const ringEl = ringRef.current;
      if (ringEl) {
        const isClickable = isHoveringClickable.current;
        const isImage = isHoveringImage.current;
        const scale = isClickable ? 1.6 : isImage ? 1.4 : 1;
        ringEl.style.transform = `translate(${ringX.current - 16}px, ${ringY.current - 16}px) scale(${scale})`;
      }

      rafId.current = requestAnimationFrame(animate);
    }

    rafId.current = requestAnimationFrame(animate);

    document.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mouseenter", onMouseEnter);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseenter", onMouseEnter);
      cancelAnimationFrame(rafId.current);
    };
  }, [shouldRender]);

  if (!shouldRender) return null;

  return (
    <>
      {/* Cursor dot — updates synchronously with mouse */}
      <div
        ref={dotRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "8px",
          height: "8px",
          borderRadius: "9999px",
          backgroundColor: "var(--color-accent)",
          zIndex: 9999,
          pointerEvents: "none",
          willChange: "transform",
          transition: "background-color 0.15s ease",
        }}
      />

      {/* Cursor ring — spring-lerp follows mouse */}
      <style>{`
        .cursor-ring {
          position: fixed;
          top: 0;
          left: 0;
          width: 32px;
          height: 32px;
          border-radius: 9999px;
          border: 2px solid rgba(var(--color-accent-rgb, 0, 229, 255), 0.5);
          border-color: color-mix(in srgb, var(--color-accent) 50%, transparent);
          z-index: 9998;
          pointer-events: none;
          will-change: transform;
          transition: border-color 0.15s ease, opacity 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 7px;
          font-weight: 700;
          letter-spacing: 0.03em;
          color: var(--color-accent);
          overflow: hidden;
        }
        .cursor-ring--clickable {
          border-color: var(--color-primary);
          border-width: 2px;
        }
        .cursor-ring--image {
          border-color: var(--color-accent);
          background: rgba(0, 0, 0, 0.4);
          font-size: 7px;
          color: var(--color-accent);
        }
      `}</style>
      <div
        ref={ringRef}
        aria-hidden="true"
        className="cursor-ring"
      />
    </>
  );
}