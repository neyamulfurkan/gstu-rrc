// src/hooks/useInfiniteScroll.ts
import { useCallback, useEffect, useRef } from "react";

export function useInfiniteScroll(
  callback: () => void,
  options?: { threshold?: number }
): { ref: React.RefCallback<Element> } {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const callbackRef = useRef<() => void>(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const ref = useCallback(
    (node: Element | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      if (!node) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            callbackRef.current();
          }
        },
        {
          threshold: options?.threshold ?? 0.1,
          rootMargin: "0px 0px 400px 0px",
        }
      );

      observerRef.current.observe(node);
    },
    [options?.threshold]
  );

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  return { ref };
}