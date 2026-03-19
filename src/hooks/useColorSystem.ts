// src/hooks/useColorSystem.ts
import { useMemo } from "react";

export function useColorSystem(): {
  getColor: (token: string) => string;
  getCssVar: (token: string) => string;
} {
  return useMemo(
    () => ({
      getColor: (token: string): string => {
        if (typeof window === "undefined") return "";
        return getComputedStyle(document.documentElement)
          .getPropertyValue("--color-" + token)
          .trim();
      },
      getCssVar: (token: string): string => {
        return "var(--color-" + token + ")";
      },
    }),
    []
  );
}