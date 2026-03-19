// tailwind.config.ts
import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";
import forms from "@tailwindcss/forms";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "Orbitron", "ui-sans-serif", "system-ui", "sans-serif"],
        heading: ["var(--font-heading)", "Syne", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        primary: "var(--color-primary)",
        accent: "var(--color-accent)",
        "bg-base": "var(--color-bg-base)",
        "bg-surface": "var(--color-bg-surface)",
        "bg-elevated": "var(--color-bg-elevated)",
        "text-primary": "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
        border: "var(--color-border)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        error: "var(--color-error)",
      },
      boxShadow: {
        "glow-primary": "0 0 20px var(--color-glow-primary), 0 0 40px var(--color-glow-primary)",
        "glow-accent": "0 0 20px var(--color-glow-accent), 0 0 40px var(--color-glow-accent)",
        "glow-sm-primary": "0 0 10px var(--color-glow-primary)",
        "glow-sm-accent": "0 0 10px var(--color-glow-accent)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      animation: {
        "spin-slow": "spin 3s linear infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "bounce-slow": "bounce 2s infinite",
        shimmer: "shimmer 2s linear infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        ticker: "ticker 40s linear infinite",
        "draw-stroke": "draw-stroke 1.5s ease-in-out forwards",
        "fade-in": "fade-in 0.3s ease-in-out forwards",
        "slide-up": "slide-up 0.4s ease-out forwards",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "draw-stroke": {
          "0%": { strokeDashoffset: "1000" },
          "100%": { strokeDashoffset: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
        "128": "32rem",
      },
      zIndex: {
        "60": "60",
        "70": "70",
        "80": "80",
        "90": "90",
        "100": "100",
      },
      transitionTimingFunction: {
        "spring": "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        "smooth": "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      typography: {
        DEFAULT: {
          css: {
            color: "var(--color-text-primary)",
            a: {
              color: "var(--color-accent)",
              "&:hover": {
                color: "var(--color-primary)",
              },
            },
            h1: { color: "var(--color-text-primary)", fontFamily: "var(--font-heading)" },
            h2: { color: "var(--color-text-primary)", fontFamily: "var(--font-heading)" },
            h3: { color: "var(--color-text-primary)", fontFamily: "var(--font-heading)" },
            h4: { color: "var(--color-text-primary)" },
            strong: { color: "var(--color-text-primary)" },
            code: {
              color: "var(--color-accent)",
              backgroundColor: "var(--color-bg-elevated)",
              fontFamily: "var(--font-mono)",
            },
            blockquote: {
              color: "var(--color-text-secondary)",
              borderLeftColor: "var(--color-accent)",
            },
            hr: { borderColor: "var(--color-border)" },
          },
        },
      },
    },
  },
  plugins: [
    typography,
    forms({
      strategy: "class",
    }),
    function ({ addComponents, addUtilities }: { addComponents: Function; addUtilities: Function }) {
      addComponents({
        ".glass": {
          "backdrop-filter": "blur(24px) saturate(180%)",
          background: "rgba(13, 22, 38, 0.7)",
          border: "1px solid var(--color-border)",
        },
        ".glass-elevated": {
          "backdrop-filter": "blur(32px) saturate(200%)",
          background: "rgba(26, 37, 64, 0.8)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
        },
        ".glass-card": {
          "backdrop-filter": "blur(16px) saturate(160%)",
          background: "rgba(13, 22, 38, 0.6)",
          border: "1px solid var(--color-border)",
          "border-radius": "0.75rem",
        },
        ".cyber-border": {
          border: "1px solid var(--color-primary)",
          "box-shadow": "0 0 8px var(--color-glow-primary), inset 0 0 8px rgba(0, 229, 255, 0.05)",
        },
        ".accent-border": {
          border: "1px solid var(--color-accent)",
          "box-shadow": "0 0 8px var(--color-glow-accent), inset 0 0 8px rgba(0, 229, 255, 0.05)",
        },
        ".scrollbar-thin": {
          "scrollbar-width": "thin",
          "scrollbar-color": "var(--color-border) transparent",
          "&::-webkit-scrollbar": {
            width: "4px",
            height: "4px",
          },
          "&::-webkit-scrollbar-track": {
            background: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "var(--color-border)",
            "border-radius": "2px",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            background: "var(--color-text-secondary)",
          },
        },
        ".scrollbar-none": {
          "scrollbar-width": "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        },
        ".text-gradient-primary": {
          background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
          "-webkit-background-clip": "text",
          "-webkit-text-fill-color": "transparent",
          "background-clip": "text",
        },
        ".text-gradient-accent": {
          background: "linear-gradient(135deg, var(--color-accent), var(--color-primary))",
          "-webkit-background-clip": "text",
          "-webkit-text-fill-color": "transparent",
          "background-clip": "text",
        },
        ".focus-ring": {
          "&:focus": {
            outline: "none",
            "box-shadow": "0 0 0 2px var(--color-accent)",
          },
          "&:focus-visible": {
            outline: "none",
            "box-shadow": "0 0 0 2px var(--color-accent)",
          },
        },
      });

      addUtilities({
        ".will-change-transform": {
          "will-change": "transform",
        },
        ".will-change-opacity": {
          "will-change": "opacity",
        },
        ".backface-hidden": {
          "backface-visibility": "hidden",
        },
        ".transform-gpu": {
          transform: "translateZ(0)",
        },
        ".mask-bottom": {
          "-webkit-mask-image": "linear-gradient(to bottom, black 70%, transparent 100%)",
          "mask-image": "linear-gradient(to bottom, black 70%, transparent 100%)",
        },
        ".break-inside-avoid": {
          "break-inside": "avoid",
        },
        ".writing-mode-vertical": {
          "writing-mode": "vertical-rl",
        },
        ".text-balance": {
          "text-wrap": "balance",
        },
      });
    },
  ],
};

export default config;