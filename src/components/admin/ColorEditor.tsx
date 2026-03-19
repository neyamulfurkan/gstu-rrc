// src/components/admin/ColorEditor.tsx
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Eye, Monitor, Palette, RefreshCw } from "lucide-react";

import {
  DEFAULT_COLORS,
  getContrastRatio,
  THEME_PRESETS,
  validateColorContrast,
} from "@/lib/colorSystem";
import { Input } from "@/components/ui/Forms";
import { Alert, Badge } from "@/components/ui/Feedback";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ColorEditorProps {
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}

interface TokenGroup {
  label: string;
  tokens: Array<{
    key: string;
    label: string;
    description?: string;
  }>;
}

// ─── Token Groups ─────────────────────────────────────────────────────────────

const TOKEN_GROUPS: TokenGroup[] = [
  {
    label: "Background",
    tokens: [
      { key: "--color-bg-base", label: "Base Background", description: "Page background" },
      { key: "--color-bg-surface", label: "Surface Background", description: "Cards, panels" },
      { key: "--color-bg-elevated", label: "Elevated Background", description: "Dropdowns, inputs" },
      { key: "--color-bg-overlay", label: "Overlay Background", description: "Modal backdrops" },
    ],
  },
  {
    label: "Text",
    tokens: [
      { key: "--color-text-primary", label: "Primary Text", description: "Headings, body" },
      { key: "--color-text-secondary", label: "Secondary Text", description: "Labels, hints" },
      { key: "--color-text-inverse", label: "Inverse Text", description: "On bright backgrounds" },
    ],
  },
  {
    label: "Brand",
    tokens: [
      { key: "--color-primary", label: "Primary", description: "Buttons, links" },
      { key: "--color-primary-hover", label: "Primary Hover", description: "Hovered primary" },
      { key: "--color-accent", label: "Accent", description: "Highlights, focus rings" },
      { key: "--color-accent-secondary", label: "Accent Secondary", description: "Purple accent" },
      { key: "--color-accent-warm", label: "Accent Warm", description: "Warm highlights" },
    ],
  },
  {
    label: "Interactive",
    tokens: [
      { key: "--color-border", label: "Border Default", description: "Default borders" },
      { key: "--color-border-accent", label: "Border Accent", description: "Focused borders" },
      { key: "--color-card-border-hover", label: "Card Border Hover", description: "Hovered cards" },
      { key: "--color-nav-bg", label: "Nav Background", description: "Navigation bar" },
      { key: "--color-nav-text", label: "Nav Text", description: "Nav link color" },
      { key: "--color-nav-active", label: "Nav Active", description: "Active nav link" },
      { key: "--color-footer-bg", label: "Footer Background", description: "Footer area" },
    ],
  },
  {
    label: "Status",
    tokens: [
      { key: "--color-success", label: "Success", description: "Positive states" },
      { key: "--color-warning", label: "Warning", description: "Caution states" },
      { key: "--color-error", label: "Error", description: "Negative states" },
    ],
  },
  {
    label: "Effects",
    tokens: [
      { key: "--color-gradient-hero-start", label: "Hero Gradient Start", description: "Hero overlay start" },
      { key: "--color-gradient-hero-end", label: "Hero Gradient End", description: "Hero overlay end" },
      { key: "--color-glow-primary", label: "Primary Glow", description: "Primary element glow" },
      { key: "--color-glow-accent", label: "Accent Glow", description: "Accent element glow" },
    ],
  },
];

// ─── Contrast Check Pairs ─────────────────────────────────────────────────────

const CONTRAST_PAIRS: Array<{ label: string; fg: string; bg: string }> = [
  { label: "Primary text / Base BG", fg: "--color-text-primary", bg: "--color-bg-base" },
  { label: "Primary text / Surface BG", fg: "--color-text-primary", bg: "--color-bg-surface" },
  { label: "Secondary text / Surface BG", fg: "--color-text-secondary", bg: "--color-bg-surface" },
  { label: "Secondary text / Elevated BG", fg: "--color-text-secondary", bg: "--color-bg-elevated" },
  { label: "Nav active / Nav BG", fg: "--color-nav-active", bg: "--color-nav-bg" },
  { label: "Nav text / Nav BG", fg: "--color-nav-text", bg: "--color-nav-bg" },
  { label: "Inverse text / Primary", fg: "--color-text-inverse", bg: "--color-primary" },
  { label: "Inverse text / Accent", fg: "--color-text-inverse", bg: "--color-accent" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extracts a plain hex value for use in native color picker input.
 * If the color is rgba/rgb, approximates via hex fallback.
 * If the string is already a 3/6-digit hex, returns it as-is.
 * Otherwise returns a safe fallback (#000000).
 */
function toHexForPicker(colorValue: string | undefined): string {
  if (!colorValue) return "#000000";

  const hexMatch = colorValue.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      return "#" + hex.split("").map((c) => c + c).join("");
    }
    return "#" + hex.toLowerCase();
  }

  // Try to extract RGB components from rgba/rgb
  const rgbaMatch = colorValue.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/
  );
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1], 10);
    const g = parseInt(rgbaMatch[2], 10);
    const b = parseInt(rgbaMatch[3], 10);
    return (
      "#" +
      [r, g, b]
        .map((v) => Math.min(255, Math.max(0, v)).toString(16).padStart(2, "0"))
        .join("")
    );
  }

  return "#000000";
}

/** Validates that a string is a valid 3 or 6-digit hex color */
function isValidHex(value: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value.trim());
}

/** Returns the resolved color value for a token key (from value, fallback to DEFAULT_COLORS) */
function resolveColor(
  tokenKey: string,
  value: Record<string, string>
): string {
  return (
    value[tokenKey] ||
    (DEFAULT_COLORS as Record<string, string>)[tokenKey] ||
    "#000000"
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface PresetCardProps {
  presetKey: string;
  isActive: boolean;
  onClick: () => void;
}

function PresetCard({ presetKey, isActive, onClick }: PresetCardProps): JSX.Element {
  const preset = THEME_PRESETS[presetKey];
  const bgBase = preset.colors["--color-bg-base"];
  const primary = preset.colors["--color-primary"];
  const accent = preset.colors["--color-accent"];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-start gap-2 rounded-lg border p-3 text-left",
        "transition-all duration-150 hover:border-[var(--color-accent)]/60",
        "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
        isActive
          ? "border-[var(--color-accent)] bg-[var(--color-bg-elevated)] shadow-[0_0_0_1px_var(--color-accent)]"
          : "border-[var(--color-border)] bg-[var(--color-bg-surface)]"
      )}
    >
      {isActive && (
        <span
          className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-accent)]"
          aria-hidden="true"
        >
          <Check size={10} className="text-[var(--color-text-inverse)]" />
        </span>
      )}
      {/* Color dots */}
      <div
        className="flex items-center gap-1.5 rounded-md p-2 w-full"
        style={{ backgroundColor: bgBase }}
        aria-hidden="true"
      >
        <span
          className="h-4 w-4 rounded-full border border-white/10"
          style={{ backgroundColor: bgBase }}
        />
        <span
          className="h-4 w-4 rounded-full border border-white/10"
          style={{ backgroundColor: primary }}
        />
        <span
          className="h-4 w-4 rounded-full border border-white/10"
          style={{ backgroundColor: accent }}
        />
      </div>
      <span className="text-xs font-medium text-[var(--color-text-primary)]">
        {preset.name}
      </span>
    </button>
  );
}

interface TokenRowProps {
  tokenKey: string;
  label: string;
  description?: string;
  currentValue: string;
  hasContrastWarning: boolean;
  contrastRatio?: number | null;
  onChange: (key: string, val: string) => void;
}

function TokenRow({
  tokenKey,
  label,
  description,
  currentValue,
  hasContrastWarning,
  contrastRatio,
  onChange,
}: TokenRowProps): JSX.Element {
  const [hexInput, setHexInput] = useState(currentValue);
  const [hexError, setHexError] = useState<string | undefined>(undefined);
  const skipSync = useRef(false);

  // Sync hex input when currentValue changes externally (e.g., preset apply)
  useEffect(() => {
    if (!skipSync.current) {
      setHexInput(currentValue);
      setHexError(undefined);
    }
    skipSync.current = false;
  }, [currentValue]);

  const handlePickerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const hex = e.target.value;
      skipSync.current = true;
      setHexInput(hex);
      setHexError(undefined);
      onChange(tokenKey, hex);
    },
    [tokenKey, onChange]
  );

  const handleHexChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setHexInput(raw);

      const trimmed = raw.trim();
      // Normalize: add # if missing
      const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;

      if (isValidHex(withHash)) {
        setHexError(undefined);
        skipSync.current = true;
        onChange(tokenKey, withHash);
      } else if (trimmed.length > 0) {
        setHexError("Invalid hex");
      }
    },
    [tokenKey, onChange]
  );

  const handleHexBlur = useCallback(() => {
    const trimmed = hexInput.trim();
    const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    if (!isValidHex(withHash)) {
      // Reset to current valid value
      setHexInput(currentValue);
      setHexError(undefined);
    }
  }, [hexInput, currentValue]);

  const pickerHex = toHexForPicker(currentValue);
  const isRgba = currentValue.startsWith("rgba") || currentValue.startsWith("rgb");

  return (
    <div className="flex items-center gap-3 py-2 border-b border-[var(--color-border)] last:border-b-0">
      {/* Color preview / picker */}
      <div className="relative flex-shrink-0">
        <div
          className="h-8 w-8 rounded-md border border-[var(--color-border)] overflow-hidden cursor-pointer"
          style={{ backgroundColor: currentValue }}
          aria-hidden="true"
        >
          <input
            type="color"
            value={pickerHex}
            onChange={handlePickerChange}
            title={`Pick color for ${label}`}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={`Color picker for ${label}`}
          />
        </div>
      </div>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">
            {label}
          </p>
          {hasContrastWarning && (
            <span
              className="flex items-center gap-1 flex-shrink-0"
              title={
                contrastRatio != null
                  ? `Contrast ratio: ${contrastRatio.toFixed(2)}:1 (fails WCAG AA 4.5:1)`
                  : "Contrast ratio could not be computed"
              }
              aria-label="Low contrast warning"
            >
              <AlertTriangle
                size={12}
                className="text-[var(--color-warning)]"
                aria-hidden="true"
              />
              {contrastRatio != null && (
                <span className="text-[10px] text-[var(--color-warning)]">
                  {contrastRatio.toFixed(1)}:1
                </span>
              )}
            </span>
          )}
        </div>
        {description && (
          <p className="text-[10px] text-[var(--color-text-secondary)] mt-0.5 truncate">
            {description}
          </p>
        )}
      </div>

      {/* Hex input */}
      <div className="flex-shrink-0 w-28">
        {isRgba ? (
          <div className="relative">
            <input
              type="text"
              value={hexInput}
              onChange={handleHexChange}
              onBlur={handleHexBlur}
              placeholder="rgba(...)"
              aria-label={`Hex or rgba value for ${label}`}
              className={cn(
                "block w-full rounded px-2 py-1 text-xs font-mono",
                "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
                "border border-[var(--color-border)]",
                "focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]",
                hexError ? "border-[var(--color-error)]" : ""
              )}
            />
          </div>
        ) : (
          <input
            type="text"
            value={hexInput}
            onChange={handleHexChange}
            onBlur={handleHexBlur}
            placeholder="#000000"
            maxLength={7}
            aria-label={`Hex value for ${label}`}
            className={cn(
              "block w-full rounded px-2 py-1 text-xs font-mono",
              "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
              "border border-[var(--color-border)]",
              "focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]",
              hexError ? "border-[var(--color-error)]" : ""
            )}
          />
        )}
      </div>
    </div>
  );
}

// ─── ContrastReport ───────────────────────────────────────────────────────────

interface ContrastReportProps {
  value: Record<string, string>;
}

function ContrastReport({ value }: ContrastReportProps): JSX.Element {
  const results = validateColorContrast(value);
  const failCount = results.filter((r) => !r.passes).length;

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3">
      <div className="flex items-center gap-2 mb-2">
        <Eye size={14} className="text-[var(--color-text-secondary)]" aria-hidden="true" />
        <span className="text-xs font-semibold text-[var(--color-text-primary)]">
          WCAG Contrast Report
        </span>
        {failCount > 0 ? (
          <Badge variant="warning" size="sm">
            {failCount} fail{failCount !== 1 ? "s" : ""}
          </Badge>
        ) : (
          <Badge variant="success" size="sm">
            All pass
          </Badge>
        )}
      </div>
      <div className="space-y-1">
        {results.map((result) => (
          <div key={result.pair} className="flex items-center justify-between text-[10px]">
            <span className="text-[var(--color-text-secondary)] truncate max-w-[60%]">
              {result.pair}
            </span>
            <div className="flex items-center gap-1.5">
              {result.ratio != null ? (
                <span
                  className={
                    result.passes
                      ? "text-[var(--color-success)]"
                      : "text-[var(--color-warning)]"
                  }
                >
                  {result.ratio.toFixed(2)}:1
                </span>
              ) : (
                <span className="text-[var(--color-text-secondary)]">N/A</span>
              )}
              {result.passes ? (
                <Check size={10} className="text-[var(--color-success)]" aria-hidden="true" />
              ) : (
                <AlertTriangle
                  size={10}
                  className="text-[var(--color-warning)]"
                  aria-hidden="true"
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── LivePreview ──────────────────────────────────────────────────────────────

interface LivePreviewProps {
  colorValue: Record<string, string>;
}

function LivePreview({ colorValue }: LivePreviewProps): JSX.Element {
  const [iframeKey, setIframeKey] = useState(0);
  const [previewError, setPreviewError] = useState(false);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const encodedColors = (() => {
    try {
      return btoa(JSON.stringify(colorValue));
    } catch {
      return "";
    }
  })();

  const previewSrc = encodedColors
    ? `${baseUrl}?previewColors=${encodedColors}`
    : baseUrl;

  // Debounce iframe reload when colors change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setIframeKey((k) => k + 1);
      setPreviewError(false);
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [encodedColors]);

  const handleRefresh = () => {
    setIframeKey((k) => k + 1);
    setPreviewError(false);
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor size={14} className="text-[var(--color-text-secondary)]" aria-hidden="true" />
          <span className="text-xs font-semibold text-[var(--color-text-primary)]">
            Live Preview
          </span>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className={cn(
            "flex items-center gap-1 rounded px-2 py-1 text-xs",
            "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
            "border border-[var(--color-border)] hover:border-[var(--color-accent)]/50",
            "transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          )}
          title="Refresh preview"
          aria-label="Refresh live preview"
        >
          <RefreshCw size={12} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {!baseUrl && (
        <Alert
          variant="warning"
          message="NEXT_PUBLIC_BASE_URL is not set. Preview unavailable."
        />
      )}

      {baseUrl && previewError && (
        <Alert
          variant="error"
          message="Preview failed to load. The site may be unreachable."
          dismissible
        />
      )}

      {baseUrl && (
        <div
          className="relative overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-base)]"
          style={{ height: 600, width: "100%" }}
          aria-label="Live site preview"
        >
          {/* Scale wrapper: iframe is 800px wide scaled to fit */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 800,
              height: 1200,
              transformOrigin: "top left",
              transform: "scale(0.5)",
              pointerEvents: "none",
            }}
            aria-hidden="true"
          >
            <iframe
              key={iframeKey}
              ref={iframeRef}
              src={previewSrc}
              title="Live color preview"
              width={800}
              height={1200}
              className="border-0"
              onError={() => setPreviewError(true)}
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
          <div className="absolute inset-0 pointer-events-none" />
        </div>
      )}

      <p className="text-[10px] text-[var(--color-text-secondary)]">
        Preview updates ~1s after changes. Scaled to 50%.
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ColorEditor({ value, onChange }: ColorEditorProps): JSX.Element {
  const [activePreset, setActivePreset] = useState<string | null>(() => {
    // Detect if current value matches a preset
    for (const [key, preset] of Object.entries(THEME_PRESETS)) {
      const allMatch = Object.entries(preset.colors).every(
        ([token, color]) => value[token] === color
      );
      if (allMatch) return key;
    }
    return null;
  });

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(TOKEN_GROUPS.map((g) => [g.label, true]))
  );

  // Build a per-token contrast warning map
  const contrastWarnings = React.useMemo<Record<string, { fails: boolean; ratio: number | null }>>(() => {
    const map: Record<string, { fails: boolean; ratio: number | null }> = {};
    for (const pair of CONTRAST_PAIRS) {
      const fg = resolveColor(pair.fg, value);
      const bg = resolveColor(pair.bg, value);
      const ratio = getContrastRatio(fg, bg);
      const fails = ratio != null ? ratio < 4.5 : false;
      // Mark both tokens
      if (fails) {
        map[pair.fg] = { fails: true, ratio };
        map[pair.bg] = { fails: true, ratio };
      } else {
        if (!map[pair.fg]) map[pair.fg] = { fails: false, ratio };
        if (!map[pair.bg]) map[pair.bg] = { fails: false, ratio };
      }
    }
    return map;
  }, [value]);

  const handlePresetClick = useCallback(
    (presetKey: string) => {
      const preset = THEME_PRESETS[presetKey];
      if (!preset) return;
      setActivePreset(presetKey);
      onChange({ ...preset.colors });
    },
    [onChange]
  );

  const handleTokenChange = useCallback(
    (tokenKey: string, tokenValue: string) => {
      setActivePreset(null); // Custom — clear preset highlight
      onChange({ ...value, [tokenKey]: tokenValue });
    },
    [value, onChange]
  );

  const handleResetToDefault = useCallback(() => {
    setActivePreset("cyber-blue");
    onChange({ ...THEME_PRESETS["cyber-blue"].colors });
  }, [onChange]);

  const toggleGroup = useCallback((groupLabel: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupLabel]: !prev[groupLabel] }));
  }, []);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
      {/* ── Left Column: Controls ── */}
      <div className="flex flex-col gap-6 lg:w-1/2 xl:w-3/5">
        {/* Preset Cards */}
        <section aria-labelledby="color-presets-heading">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Palette size={15} className="text-[var(--color-accent)]" aria-hidden="true" />
              <h3
                id="color-presets-heading"
                className="text-sm font-semibold text-[var(--color-text-primary)]"
              >
                Theme Presets
              </h3>
            </div>
            <button
              type="button"
              onClick={handleResetToDefault}
              className={cn(
                "text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
                "flex items-center gap-1 rounded px-2 py-1 border border-[var(--color-border)]",
                "hover:border-[var(--color-accent)]/50 transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              )}
              aria-label="Reset to Cyber Blue default preset"
            >
              <RefreshCw size={11} aria-hidden="true" />
              Reset
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
            {Object.keys(THEME_PRESETS).map((key) => (
              <PresetCard
                key={key}
                presetKey={key}
                isActive={activePreset === key}
                onClick={() => handlePresetClick(key)}
              />
            ))}
          </div>
        </section>

        {/* Token Groups */}
        <section aria-labelledby="color-tokens-heading">
          <h3
            id="color-tokens-heading"
            className="text-sm font-semibold text-[var(--color-text-primary)] mb-3"
          >
            Color Tokens
          </h3>
          <div className="flex flex-col gap-3">
            {TOKEN_GROUPS.map((group) => {
              const isExpanded = expandedGroups[group.label] ?? true;
              const groupHasWarning = group.tokens.some(
                (t) => contrastWarnings[t.key]?.fails
              );

              return (
                <div
                  key={group.label}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-2.5",
                      "text-left hover:bg-[var(--color-bg-elevated)] transition-colors",
                      "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-accent)]"
                    )}
                    aria-expanded={isExpanded}
                    aria-controls={`token-group-${group.label}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                        {group.label}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-secondary)]">
                        ({group.tokens.length})
                      </span>
                      {groupHasWarning && (
                        <AlertTriangle
                          size={11}
                          className="text-[var(--color-warning)]"
                          aria-label="Group has contrast issues"
                        />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[var(--color-text-secondary)] transition-transform duration-150",
                        isExpanded ? "rotate-180" : "rotate-0"
                      )}
                      aria-hidden="true"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M2 4L6 8L10 4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </button>

                  {isExpanded && (
                    <div
                      id={`token-group-${group.label}`}
                      className="px-4 pb-2"
                    >
                      {group.tokens.map((token) => {
                        const warningInfo = contrastWarnings[token.key];
                        return (
                          <TokenRow
                            key={token.key}
                            tokenKey={token.key}
                            label={token.label}
                            description={token.description}
                            currentValue={resolveColor(token.key, value)}
                            hasContrastWarning={warningInfo?.fails ?? false}
                            contrastRatio={warningInfo?.ratio ?? null}
                            onChange={handleTokenChange}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Contrast Report */}
        <ContrastReport value={value} />
      </div>

      {/* ── Right Column: Live Preview ── */}
      <div className="lg:w-1/2 xl:w-2/5">
        <div className="sticky top-4">
          <LivePreview colorValue={value} />
        </div>
      </div>
    </div>
  );
}