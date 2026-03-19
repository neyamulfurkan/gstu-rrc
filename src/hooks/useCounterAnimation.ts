// src/hooks/useCounterAnimation.ts
import { useEffect, useRef, useState } from "react";

export function useCounterAnimation(
  target: number,
  duration: number = 1500,
  startOnView: boolean = true
): { count: number; ref: React.RefObject<HTMLElement> } {
  const [count, setCount] = useState<number>(0);
  const ref = useRef<HTMLElement>(null);
  const triggeredRef = useRef<boolean>(false);
  const rafRef = useRef<number | null>(null);

  const runAnimation = (): void => {
    if (triggeredRef.current) return;
    triggeredRef.current = true;

    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(target);
      return;
    }

    const startTime = performance.now();

    const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

    const step = (currentTime: number): void => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOut(progress);
      const currentCount = Math.round(easedProgress * target);
      setCount(currentCount);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setCount(target);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!startOnView) {
      runAnimation();
      return;
    }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          runAnimation();
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(element);

    return (): void => {
      observer.disconnect();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [target, duration, startOnView]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return (): void => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  return { count, ref };
}