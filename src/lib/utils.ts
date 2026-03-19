// src/lib/utils.ts

/**
 * Formats a date into a human-readable string.
 * @param date - The date to format (Date object or ISO string)
 * @param format - "relative" | "full" | "short" (default: "relative")
 */
export function formatDate(
  date: Date | string | null | undefined,
  format: "relative" | "full" | "short" = "relative"
): string {
  if (date === null || date === undefined) return "—";
  const d = typeof date === "string" ? new Date(date) : date;

  if (!d || isNaN(d.getTime())) return "Invalid date";

  if (format === "relative") {
    const now = Date.now();
    const diffMs = d.getTime() - now;
    const absDiffMs = Math.abs(diffMs);
    const isPast = diffMs < 0;

    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

    const seconds = Math.round(absDiffMs / 1000);
    const minutes = Math.round(absDiffMs / 60000);
    const hours = Math.round(absDiffMs / 3600000);
    const days = Math.round(absDiffMs / 86400000);
    const weeks = Math.round(absDiffMs / 604800000);
    const months = Math.round(absDiffMs / 2592000000);
    const years = Math.round(absDiffMs / 31536000000);

    const sign = isPast ? -1 : 1;

    if (seconds < 60) return rtf.format(sign * seconds, "second");
    if (minutes < 60) return rtf.format(sign * minutes, "minute");
    if (hours < 24) return rtf.format(sign * hours, "hour");
    if (days < 7) return rtf.format(sign * days, "day");
    if (weeks < 5) return rtf.format(sign * weeks, "week");
    if (months < 12) return rtf.format(sign * months, "month");
    return rtf.format(sign * years, "year");
  }

  if (format === "full") {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  }

  // short
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

/**
 * Generates a URL-safe slug from a title string.
 * @param title - The string to convert
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/**
 * Generates a simple hash number from a string.
 * Used internally for consistent color derivation.
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Returns a hex color string derived from hashing the input string.
 * Produces consistent, visually distinct colors for each unique input.
 * @param str - The string to hash into a color
 */
export function hashColor(str: string): string {
  const hash = simpleHash(str);
  const hue = hash % 360;
  const saturation = 55 + (hash % 30); // 55–84%
  const lightness = 40 + (hash % 20); // 40–59%
  // Convert HSL to hex
  const s = saturation / 100;
  const l = lightness / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number): string => {
    const k = (n + hue / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Generates a data URI for an initials-based avatar using HTML Canvas.
 * Falls back to an empty string in non-browser environments.
 * @param name - The full name to derive initials from
 */
export function generateInitialsAvatar(name: string): string {
  if (typeof window === "undefined") return "";

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

  const bgColor = hashColor(name);
  const size = 96;

  try {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // Background
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Text
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${size * 0.38}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, size / 2, size / 2);

    return canvas.toDataURL("image/png");
  } catch {
    return "";
  }
}

/**
 * Truncates a string at a word boundary and appends an ellipsis.
 * @param text - The text to truncate
 * @param maxLength - Maximum character count before truncation
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > 0) {
    return truncated.slice(0, lastSpace) + "…";
  }
  return truncated + "…";
}

/**
 * Builds a Cloudinary transformation URL from a public ID and options.
 * @param publicId - The Cloudinary public ID of the asset
 * @param options - Transformation options (width, height, format, quality)
 */
export function cloudinaryUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    format?: string;
    quality?: string;
  } = {}
): string {
  const cloudName =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
      : "";

  if (!cloudName || !publicId) return publicId || "";

  const { width, height, format = "auto", quality = "auto" } = options;

  const transforms: string[] = [`f_${format}`, `q_${quality}`];

  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (width && height) transforms.push("c_fill");

  const transformStr = transforms.join(",");

  // Handle already-full URLs (Cloudinary delivery URLs)
  if (publicId.startsWith("http")) {
    return publicId;
  }

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformStr}/${publicId}`;
}

/**
 * Extracts plain text from a TipTap/ProseMirror JSON document.
 * Strips all formatting, max 160 chars for use in meta descriptions.
 * @param json - TipTap JSON document
 */
export function parseRichText(json: unknown): string {
  if (!json || typeof json !== "object") return "";

  function extractText(node: Record<string, unknown>): string {
    if (node.type === "text" && typeof node.text === "string") {
      return node.text;
    }

    if (Array.isArray(node.content)) {
      return (node.content as Record<string, unknown>[])
        .map(extractText)
        .join(" ");
    }

    return "";
  }

  try {
    const doc = json as Record<string, unknown>;
    const text = extractText(doc)
      .replace(/\s+/g, " ")
      .trim();
    return truncateText(text, 160);
  } catch {
    return "";
  }
}

/**
 * Formats a number as a currency string using Intl.NumberFormat.
 * @param amount - The numeric amount to format
 * @param currency - Currency code (default: "BDT")
 */
export function formatCurrency(amount: number, currency = "BDT"): string {
  try {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Fallback for environments where BDT may not be supported
    return `${currency} ${amount.toLocaleString()}`;
  }
}

/**
 * Generates a unique certificate serial number with GSTU prefix and year.
 * Format: "GSTU-YYYY-XXXXXXXX"
 */
export function generateSerial(): string {
  const year = new Date().getFullYear();
  let uuid: string;

  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    uuid = crypto.randomUUID();
  } else {
    // Fallback for environments without crypto.randomUUID
    uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  const part = uuid.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `GSTU-${year}-${part}`;
}

/**
 * Merges class name strings, filtering out falsy values.
 * Equivalent to clsx for simple use cases.
 * @param classes - Any number of class strings, undefined, false, or null
 */
export function cn(
  ...classes: (string | undefined | false | null)[]
): string {
  return classes.filter(Boolean).join(" ");
}