// src/lib/colorSystem.ts

const COLOR_TOKEN_LIST = [
  "--color-bg-base",
  "--color-bg-surface",
  "--color-bg-elevated",
  "--color-bg-overlay",
  "--color-primary",
  "--color-primary-hover",
  "--color-accent",
  "--color-accent-secondary",
  "--color-accent-warm",
  "--color-text-primary",
  "--color-text-secondary",
  "--color-text-inverse",
  "--color-border",
  "--color-border-accent",
  "--color-success",
  "--color-warning",
  "--color-error",
  "--color-gradient-hero-start",
  "--color-gradient-hero-end",
  "--color-glow-primary",
  "--color-glow-accent",
  "--color-nav-bg",
  "--color-nav-text",
  "--color-nav-active",
  "--color-footer-bg",
  "--color-card-border-hover",
] as const;

type ColorToken = (typeof COLOR_TOKEN_LIST)[number];
type ColorConfig = Record<string, string>;

export interface ThemePreset {
  name: string;
  colors: Record<ColorToken, string>;
  fonts?: {
    display?: string;
    heading?: string;
    body?: string;
    mono?: string;
  };
}

export const THEME_PRESETS: Record<string, ThemePreset> = {
  "cyber-blue": {
    name: "Cyber Blue",
    fonts: { display: "Orbitron", heading: "Syne", body: "DM Sans", mono: "JetBrains Mono" },
    colors: {
      "--color-bg-base": "#060B14",
      "--color-bg-surface": "#0D1626",
      "--color-bg-elevated": "#1A2540",
      "--color-bg-overlay": "rgba(6,11,20,0.85)",
      "--color-primary": "#0050FF",
      "--color-primary-hover": "#0040CC",
      "--color-accent": "#00E5FF",
      "--color-accent-secondary": "#7C3AED",
      "--color-accent-warm": "#FF6B2B",
      "--color-text-primary": "#F0F4FF",
      "--color-text-secondary": "#7B8DB0",
      "--color-text-inverse": "#060B14",
      "--color-border": "rgba(255,255,255,0.08)",
      "--color-border-accent": "rgba(0,229,255,0.4)",
      "--color-success": "#00C896",
      "--color-warning": "#FFB800",
      "--color-error": "#FF3B5C",
      "--color-gradient-hero-start": "rgba(0,80,255,0.15)",
      "--color-gradient-hero-end": "rgba(0,0,0,0.85)",
      "--color-glow-primary": "rgba(0,80,255,0.4)",
      "--color-glow-accent": "rgba(0,229,255,0.35)",
      "--color-nav-bg": "rgba(6,11,20,0.7)",
      "--color-nav-text": "#7B8DB0",
      "--color-nav-active": "#F0F4FF",
      "--color-footer-bg": "#040810",
      "--color-card-border-hover": "rgba(0,229,255,0.5)",
    },
  },
  "neon-green": {
    name: "Neon Green",
    fonts: { display: "Orbitron", heading: "Exo 2", body: "Inter", mono: "JetBrains Mono" },
    colors: {
      "--color-bg-base": "#040F08",
      "--color-bg-surface": "#071A0E",
      "--color-bg-elevated": "#0D2B18",
      "--color-bg-overlay": "rgba(4,15,8,0.85)",
      "--color-primary": "#00FF87",
      "--color-primary-hover": "#00CC6E",
      "--color-accent": "#00E5A0",
      "--color-accent-secondary": "#7C3AED",
      "--color-accent-warm": "#FFB800",
      "--color-text-primary": "#EDFFF5",
      "--color-text-secondary": "#5E8C72",
      "--color-text-inverse": "#040F08",
      "--color-border": "rgba(255,255,255,0.07)",
      "--color-border-accent": "rgba(0,255,135,0.4)",
      "--color-success": "#00FF87",
      "--color-warning": "#FFB800",
      "--color-error": "#FF3B5C",
      "--color-gradient-hero-start": "rgba(0,255,135,0.12)",
      "--color-gradient-hero-end": "rgba(0,0,0,0.85)",
      "--color-glow-primary": "rgba(0,255,135,0.4)",
      "--color-glow-accent": "rgba(0,229,160,0.35)",
      "--color-nav-bg": "rgba(4,15,8,0.75)",
      "--color-nav-text": "#5E8C72",
      "--color-nav-active": "#EDFFF5",
      "--color-footer-bg": "#020A05",
      "--color-card-border-hover": "rgba(0,255,135,0.5)",
    },
  },
  "crimson-steel": {
    name: "Crimson Steel",
    fonts: { display: "Rajdhani", heading: "Syne", body: "DM Sans", mono: "JetBrains Mono" },
    colors: {
      "--color-bg-base": "#0F0608",
      "--color-bg-surface": "#1A0A0D",
      "--color-bg-elevated": "#2A1018",
      "--color-bg-overlay": "rgba(15,6,8,0.85)",
      "--color-primary": "#FF1744",
      "--color-primary-hover": "#CC1236",
      "--color-accent": "#FF5252",
      "--color-accent-secondary": "#FF6B2B",
      "--color-accent-warm": "#FFB800",
      "--color-text-primary": "#FFF0F2",
      "--color-text-secondary": "#8C5F68",
      "--color-text-inverse": "#0F0608",
      "--color-border": "rgba(255,255,255,0.07)",
      "--color-border-accent": "rgba(255,23,68,0.4)",
      "--color-success": "#00C896",
      "--color-warning": "#FFB800",
      "--color-error": "#FF1744",
      "--color-gradient-hero-start": "rgba(255,23,68,0.15)",
      "--color-gradient-hero-end": "rgba(0,0,0,0.85)",
      "--color-glow-primary": "rgba(255,23,68,0.4)",
      "--color-glow-accent": "rgba(255,82,82,0.35)",
      "--color-nav-bg": "rgba(15,6,8,0.75)",
      "--color-nav-text": "#8C5F68",
      "--color-nav-active": "#FFF0F2",
      "--color-footer-bg": "#080305",
      "--color-card-border-hover": "rgba(255,82,82,0.5)",
    },
  },
  "gold-academia": {
    name: "Gold Academia",
    fonts: { display: "Syne", heading: "Montserrat", body: "IBM Plex Sans", mono: "IBM Plex Mono" },
    colors: {
      "--color-bg-base": "#0A0805",
      "--color-bg-surface": "#16110A",
      "--color-bg-elevated": "#241C0F",
      "--color-bg-overlay": "rgba(10,8,5,0.85)",
      "--color-primary": "#F59E0B",
      "--color-primary-hover": "#D97706",
      "--color-accent": "#FCD34D",
      "--color-accent-secondary": "#7C3AED",
      "--color-accent-warm": "#FF6B2B",
      "--color-text-primary": "#FFF9ED",
      "--color-text-secondary": "#8C7A50",
      "--color-text-inverse": "#0A0805",
      "--color-border": "rgba(255,255,255,0.07)",
      "--color-border-accent": "rgba(245,158,11,0.4)",
      "--color-success": "#00C896",
      "--color-warning": "#F59E0B",
      "--color-error": "#FF3B5C",
      "--color-gradient-hero-start": "rgba(245,158,11,0.12)",
      "--color-gradient-hero-end": "rgba(0,0,0,0.85)",
      "--color-glow-primary": "rgba(245,158,11,0.4)",
      "--color-glow-accent": "rgba(252,211,77,0.35)",
      "--color-nav-bg": "rgba(10,8,5,0.75)",
      "--color-nav-text": "#8C7A50",
      "--color-nav-active": "#FFF9ED",
      "--color-footer-bg": "#060503",
      "--color-card-border-hover": "rgba(252,211,77,0.5)",
    },
  },
  "arctic-white": {
    name: "Arctic White",
    fonts: { display: "Poppins", heading: "Montserrat", body: "Inter", mono: "Fira Code" },
    colors: {
      "--color-bg-base": "#F8FAFC",
      "--color-bg-surface": "#FFFFFF",
      "--color-bg-elevated": "#F1F5F9",
      "--color-bg-overlay": "rgba(248,250,252,0.92)",
      "--color-primary": "#3B82F6",
      "--color-primary-hover": "#2563EB",
      "--color-accent": "#0EA5E9",
      "--color-accent-secondary": "#7C3AED",
      "--color-accent-warm": "#F97316",
      "--color-text-primary": "#0F172A",
      "--color-text-secondary": "#64748B",
      "--color-text-inverse": "#F8FAFC",
      "--color-border": "rgba(0,0,0,0.08)",
      "--color-border-accent": "rgba(59,130,246,0.4)",
      "--color-success": "#10B981",
      "--color-warning": "#F59E0B",
      "--color-error": "#EF4444",
      "--color-gradient-hero-start": "rgba(59,130,246,0.08)",
      "--color-gradient-hero-end": "rgba(248,250,252,0.8)",
      "--color-glow-primary": "rgba(59,130,246,0.25)",
      "--color-glow-accent": "rgba(14,165,233,0.2)",
      "--color-nav-bg": "rgba(248,250,252,0.85)",
      "--color-nav-text": "#64748B",
      "--color-nav-active": "#0F172A",
      "--color-footer-bg": "#E2E8F0",
      "--color-card-border-hover": "rgba(59,130,246,0.5)",
    },
  },
  "deep-purple": {
    name: "Deep Purple",
    fonts: { display: "Orbitron", heading: "Space Grotesk", body: "DM Sans", mono: "JetBrains Mono" },
    colors: {
      "--color-bg-base": "#080613",
      "--color-bg-surface": "#100D1F",
      "--color-bg-elevated": "#1A1630",
      "--color-bg-overlay": "rgba(8,6,19,0.85)",
      "--color-primary": "#7C3AED",
      "--color-primary-hover": "#6D28D9",
      "--color-accent": "#A78BFA",
      "--color-accent-secondary": "#00E5FF",
      "--color-accent-warm": "#FF6B2B",
      "--color-text-primary": "#F5F0FF",
      "--color-text-secondary": "#7B6A9E",
      "--color-text-inverse": "#080613",
      "--color-border": "rgba(255,255,255,0.07)",
      "--color-border-accent": "rgba(124,58,237,0.4)",
      "--color-success": "#00C896",
      "--color-warning": "#FFB800",
      "--color-error": "#FF3B5C",
      "--color-gradient-hero-start": "rgba(124,58,237,0.15)",
      "--color-gradient-hero-end": "rgba(0,0,0,0.85)",
      "--color-glow-primary": "rgba(124,58,237,0.45)",
      "--color-glow-accent": "rgba(167,139,250,0.35)",
      "--color-nav-bg": "rgba(8,6,19,0.75)",
      "--color-nav-text": "#7B6A9E",
      "--color-nav-active": "#F5F0FF",
      "--color-footer-bg": "#050410",
      "--color-card-border-hover": "rgba(167,139,250,0.5)",
    },
  },
  "solar-orange": {
    name: "Solar Orange",
    fonts: { display: "Rajdhani", heading: "Exo 2", body: "Roboto", mono: "Share Tech Mono" },
    colors: {
      "--color-bg-base": "#0F0906",
      "--color-bg-surface": "#1A100A",
      "--color-bg-elevated": "#2A1A0F",
      "--color-bg-overlay": "rgba(15,9,6,0.85)",
      "--color-primary": "#FF6B2B",
      "--color-primary-hover": "#E55A1F",
      "--color-accent": "#FFB800",
      "--color-accent-secondary": "#7C3AED",
      "--color-accent-warm": "#FF6B2B",
      "--color-text-primary": "#FFF5F0",
      "--color-text-secondary": "#8C6A50",
      "--color-text-inverse": "#0F0906",
      "--color-border": "rgba(255,255,255,0.07)",
      "--color-border-accent": "rgba(255,107,43,0.4)",
      "--color-success": "#00C896",
      "--color-warning": "#FFB800",
      "--color-error": "#FF3B5C",
      "--color-gradient-hero-start": "rgba(255,107,43,0.15)",
      "--color-gradient-hero-end": "rgba(0,0,0,0.85)",
      "--color-glow-primary": "rgba(255,107,43,0.4)",
      "--color-glow-accent": "rgba(255,184,0,0.35)",
      "--color-nav-bg": "rgba(15,9,6,0.75)",
      "--color-nav-text": "#8C6A50",
      "--color-nav-active": "#FFF5F0",
      "--color-footer-bg": "#0A0603",
      "--color-card-border-hover": "rgba(255,184,0,0.5)",
    },
  },
};

export const DEFAULT_COLORS: Record<ColorToken, string> =
  THEME_PRESETS["cyber-blue"].colors;

export interface FontConfig {
  display: string;
  heading: string;
  body: string;
  mono: string;
}

/**
 * Calculates relative luminance of a hex or rgba color string.
 * Used for WCAG contrast ratio validation.
 */
function parseColorToRgb(
  color: string
): { r: number; g: number; b: number } | null {
  // Handle hex
  const hexMatch = color.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    }
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16),
    };
  }

  // Handle rgba(r,g,b,a) or rgb(r,g,b)
  const rgbaMatch = color.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)/
  );
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1], 10),
      g: parseInt(rgbaMatch[2], 10),
      b: parseInt(rgbaMatch[3], 10),
    };
  }

  return null;
}

function getRelativeLuminance(r: number, g: number, b: number): number {
  const toLinear = (c: number): number => {
    const srgb = c / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Calculates WCAG contrast ratio between two color strings.
 * Returns null if either color cannot be parsed.
 */
export function getContrastRatio(color1: string, color2: string): number | null {
  const rgb1 = parseColorToRgb(color1);
  const rgb2 = parseColorToRgb(color2);
  if (!rgb1 || !rgb2) return null;

  const L1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const L2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns WCAG AA compliance check results for the given color config.
 * Checks: text-primary on bg-base, text-secondary on bg-surface, nav-text on nav-bg.
 */
export function validateColorContrast(
  colorConfig: ColorConfig
): Array<{ pair: string; ratio: number | null; passes: boolean }> {
  const pairs: Array<[string, string, string]> = [
    [
      "text-primary / bg-base",
      colorConfig["--color-text-primary"] ?? DEFAULT_COLORS["--color-text-primary"],
      colorConfig["--color-bg-base"] ?? DEFAULT_COLORS["--color-bg-base"],
    ],
    [
      "text-secondary / bg-surface",
      colorConfig["--color-text-secondary"] ??
        DEFAULT_COLORS["--color-text-secondary"],
      colorConfig["--color-bg-surface"] ?? DEFAULT_COLORS["--color-bg-surface"],
    ],
    [
      "nav-active / nav-bg",
      colorConfig["--color-nav-active"] ?? DEFAULT_COLORS["--color-nav-active"],
      colorConfig["--color-nav-bg"] ?? DEFAULT_COLORS["--color-nav-bg"],
    ],
  ];

  return pairs.map(([pair, fg, bg]) => {
    const ratio = getContrastRatio(fg, bg);
    return {
      pair,
      ratio,
      passes: ratio !== null ? ratio >= 4.5 : false,
    };
  });
}

/**
 * Builds the full CSS custom property declaration block for server-side injection
 * into the root layout <style> tag.
 *
 * Skips unrecognized token keys silently.
 * Merges provided colorConfig over DEFAULT_COLORS for any missing tokens.
 */
export function buildCssVariableBlock(
  colorConfig: ColorConfig,
  fonts: FontConfig
): string {
  const allowedTokenSet = new Set<string>(COLOR_TOKEN_LIST);

  // Build the merged color map: start from defaults, override with provided values
  const mergedColors: Record<string, string> = { ...DEFAULT_COLORS };

  for (const [key, value] of Object.entries(colorConfig)) {
    if (allowedTokenSet.has(key) && typeof value === "string" && value.trim() !== "") {
      mergedColors[key] = value.trim();
    }
    // silently skip unrecognized keys
  }

  // Build color variable lines
  const colorLines = COLOR_TOKEN_LIST.map(
    (token) => `  ${token}: ${mergedColors[token] ?? DEFAULT_COLORS[token]};`
  ).join("\n");

  // Build font variable lines — normalize font names with quotes if they contain spaces
  const normalizeFontFamily = (fontName: string, fallback: string): string => {
    const trimmed = fontName.trim();
    if (!trimmed) return fallback;
    const needsQuotes = trimmed.includes(" ") && !trimmed.startsWith("'") && !trimmed.startsWith('"');
    const quoted = needsQuotes ? `'${trimmed}'` : trimmed;
    return `${quoted}, ${fallback}`;
  };

  const fontLines = [
    `  --font-display: ${normalizeFontFamily(fonts.display || "Orbitron", "sans-serif")};`,
    `  --font-heading: ${normalizeFontFamily(fonts.heading || "Syne", "sans-serif")};`,
    `  --font-body: ${normalizeFontFamily(fonts.body || "DM Sans", "sans-serif")};`,
    `  --font-mono: ${normalizeFontFamily(fonts.mono || "JetBrains Mono", "monospace")};`,
  ].join("\n");

  return `:root {\n${colorLines}\n${fontLines}\n}`;
}