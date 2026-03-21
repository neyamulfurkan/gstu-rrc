// src/components/home/HeroSection.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { useColorSystem } from "@/hooks/useColorSystem";
import type { ClubConfigPublic } from "@/types/index";

// ─── Framer Motion (dynamic import avoidance — inline lazy) ──────────────────
// We import framer-motion types only; the actual motion component usage below
// is guarded to avoid SSR issues and bundled separately via next/dynamic at
// the consumer level.  For this file we import directly since "use client"
// ensures this runs only in the browser bundle.
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";

// ─── Animation Variants ───────────────────────────────────────────────────────

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease: "easeOut" } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 80, damping: 18 },
  },
};

const reducedMotionFallback = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.1 } },
};

// ─── Particle Type ────────────────────────────────────────────────────────────

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

// ─── Slideshow Background ─────────────────────────────────────────────────────

interface SlideshowBgProps {
  images: Array<{ url: string; order: number }>;
  overlayOpacity: number;
}

function SlideshowBg({ images, overlayOpacity }: SlideshowBgProps): JSX.Element {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <>
      {images.map((img, idx) => (
        <div
          key={img.url + idx}
          className={cn(
            "absolute inset-0 transition-opacity duration-1000",
            idx === currentSlide ? "opacity-100" : "opacity-0"
          )}
        >
          <Image
            src={img.url}
            alt={`Hero background ${idx + 1}`}
            fill
            priority={idx === 0}
            className="object-cover object-center"
            sizes="100vw"
          />
        </div>
      ))}
      <div
        className="absolute inset-0 bg-gradient-to-b from-[var(--color-gradient-hero-start)] to-[var(--color-gradient-hero-end)]"
        style={{ opacity: overlayOpacity / 100 }}
      />
    </>
  );
}

// ─── Video Background ─────────────────────────────────────────────────────────

interface VideoBgProps {
  videoUrl: string;
  fallbackImg: string;
  overlayOpacity: number;
}

function VideoBg({ videoUrl, fallbackImg, overlayOpacity }: VideoBgProps): JSX.Element {
  const isYouTube =
    videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be");

  const getYouTubeEmbedUrl = (url: string): string => {
    let videoId = "";
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes("youtu.be")) {
        videoId = urlObj.pathname.slice(1);
      } else {
        videoId = urlObj.searchParams.get("v") ?? "";
      }
    } catch {
      // fallback: try to extract from path
      const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      videoId = match?.[1] ?? "";
    }
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1`;
  };

  return (
    <>
      {isYouTube ? (
        <iframe
          src={getYouTubeEmbedUrl(videoUrl)}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ transform: "scale(1.1)" }}
          allow="autoplay; encrypted-media"
          sandbox="allow-scripts allow-same-origin"
          title="Hero background video"
          aria-hidden="true"
        />
      ) : (
        <video
          src={videoUrl}
          autoPlay
          muted
          loop
          playsInline
          poster={fallbackImg || undefined}
          className="absolute inset-0 w-full h-full object-cover object-center"
          aria-hidden="true"
        />
      )}
      <div
        className="absolute inset-0 bg-gradient-to-b from-[var(--color-gradient-hero-start)] to-[var(--color-gradient-hero-end)]"
        style={{ opacity: overlayOpacity / 100 }}
      />
    </>
  );
}

// ─── Particle Canvas ──────────────────────────────────────────────────────────

interface ParticleCanvasProps {
  count: number;
  speed: number;
  color: string;
  enabled: boolean;
}

function ParticleCanvas({ count, speed, enabled }: ParticleCanvasProps): JSX.Element | null {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number>(0);
  const { getColor } = useColorSystem();

  const initParticles = useCallback(
    (width: number, height: number) => {
      particlesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * speed * 0.5,
        vy: (Math.random() - 0.5) * speed * 0.5,
        size: 1.5 + Math.random() * 1.5,
      }));
    },
    [count, speed]
  );

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isMobile = window.innerWidth < 768;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles(canvas.width, canvas.height);
    };

    resize();

    const handleMouseMove = (e: MouseEvent) => {
      if (isMobile) return;
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseLeave = () => {
      mouseRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("resize", resize, { passive: true });

    const CONNECT_DISTANCE = 120;
    const REPULSION_DISTANCE = 200;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const accentColor = getColor("accent");
      const particleColor = accentColor || "#00E5FF";

      ctx.clearRect(0, 0, w, h);

      const particles = particlesRef.current;

      // Update positions
      for (const p of particles) {
        // Mouse repulsion
        if (mouseRef.current) {
          const dx = p.x - mouseRef.current.x;
          const dy = p.y - mouseRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < REPULSION_DISTANCE && dist > 0) {
            const force = (REPULSION_DISTANCE - dist) / REPULSION_DISTANCE;
            p.vx += (dx / dist) * force * 0.5;
            p.vy += (dy / dist) * force * 0.5;
          }
        }

        // Velocity damping
        p.vx *= 0.98;
        p.vy *= 0.98;

        // Speed clamp
        const maxSpeed = speed * 0.8;
        const currentSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (currentSpeed > maxSpeed) {
          p.vx = (p.vx / currentSpeed) * maxSpeed;
          p.vy = (p.vy / currentSpeed) * maxSpeed;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Bounce on edges
        if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx); }
        if (p.x > w) { p.x = w; p.vx = -Math.abs(p.vx); }
        if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy); }
        if (p.y > h) { p.y = h; p.vy = -Math.abs(p.vy); }
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DISTANCE) {
            const alpha = (1 - dist / CONNECT_DISTANCE) * 0.4;
            ctx.beginPath();
            ctx.strokeStyle = particleColor;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = 0.8;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw dots
      ctx.globalAlpha = 1;
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = particleColor;
        ctx.globalAlpha = 0.7;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", resize);
    };
  }, [enabled, count, speed, initParticles, getColor]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
}

// ─── Typing Animation ─────────────────────────────────────────────────────────

interface TypingTextProps {
  text: string;
  className?: string;
}

function TypingText({ text, className }: TypingTextProps): JSX.Element {
  const [displayedCount, setDisplayedCount] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (displayedCount >= text.length) return;
    const timeout = setTimeout(
      () => setDisplayedCount((prev) => prev + 1),
      60
    );
    return () => clearTimeout(timeout);
  }, [displayedCount, text.length]);

  useEffect(() => {
    const interval = setInterval(() => setShowCursor((prev) => !prev), 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className={className}>
      {text.slice(0, displayedCount)}
      <span
        className={cn(
          "inline-block w-0.5 h-[0.9em] align-middle ml-0.5 bg-[var(--color-accent)] transition-opacity duration-100",
          showCursor ? "opacity-100" : "opacity-0"
        )}
        aria-hidden="true"
      />
    </span>
  );
}

// ─── Scroll Chevron ───────────────────────────────────────────────────────────

function ScrollIndicator(): JSX.Element {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY <= 100);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="scroll-indicator"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1"
          aria-hidden="true"
        >
          <span className="text-xs text-[var(--color-text-secondary)] tracking-widest uppercase font-mono">
            Scroll
          </span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
          >
            <ChevronDown
              size={24}
              className="text-[var(--color-accent)]"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Bottom Wave ──────────────────────────────────────────────────────────────

function BottomWave(): JSX.Element {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1440 80"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="w-full h-16 md:h-20"
      >
        <path
          d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z"
          fill="var(--color-bg-base)"
        />
      </svg>
    </div>
  );
}

// ─── Main HeroSection ─────────────────────────────────────────────────────────

export interface HeroSectionProps {
  config: ClubConfigPublic;
}

export function HeroSection({ config }: HeroSectionProps): JSX.Element {
  const shouldReduceMotion = useReducedMotion();

  // Determine effective hero type — fall back to particles if slideshow has no images
  const effectiveHeroType =
    config.heroType === "slideshow" &&
    (!config.heroImages || config.heroImages.length === 0)
      ? "particles"
      : config.heroType;

  // Sort images by order
  const sortedImages = [...(config.heroImages ?? [])].sort(
    (a, b) => a.order - b.order
  );

  const motionVariants = shouldReduceMotion
    ? reducedMotionFallback
    : fadeUp;

  const fadeVariants = shouldReduceMotion ? reducedMotionFallback : fadeIn;

  return (
    <section
      className="relative h-screen w-full overflow-hidden bg-[var(--color-bg-base)]"
      aria-label={`${config.clubName} hero section`}
    >
      {/* ── Background Layer ── */}
      <div className="absolute inset-0">
        {effectiveHeroType === "slideshow" && sortedImages.length > 0 && (
          <SlideshowBg
            images={sortedImages}
            overlayOpacity={config.overlayOpacity ?? 60}
          />
        )}

        {effectiveHeroType === "video" && config.heroVideoUrl && (
          <VideoBg
            videoUrl={config.heroVideoUrl}
            fallbackImg={config.heroFallbackImg}
            overlayOpacity={config.overlayOpacity ?? 60}
          />
        )}

        {/* Particles overlay always rendered when enabled, on top of any bg */}
        {effectiveHeroType === "particles" && (
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-gradient-hero-start)] to-[var(--color-gradient-hero-end)]" />
        )}
      </div>

      {/* ── Particle Canvas ── */}
      <ParticleCanvas
        count={config.particleCount ?? 80}
        speed={config.particleSpeed ?? 1}
        color={config.particleColor ?? "#00E5FF"}
        enabled={config.particleEnabled ?? true}
      />

      {/* ── Foreground Content ── */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-4">
        {/* Logo */}
        {config.logoUrl && (
          <motion.div
            variants={fadeVariants}
            initial="hidden"
            animate="visible"
            className="mb-6 md:mb-8"
          >
            <div
              className="relative w-20 h-20 md:w-28 md:h-28 mx-auto"
              style={{
                filter: "drop-shadow(0 0 20px var(--color-glow-primary))",
              }}
            >
              <Image
                src={config.logoUrl}
                alt={`${config.clubName} logo`}
                fill
                priority
                className="object-contain"
                sizes="(max-width: 768px) 80px, 112px"
              />
            </div>
          </motion.div>
        )}



        {/* Club Name with Typing Effect */}
        <h1
          className={cn(
            "font-display font-black leading-none tracking-tight mb-4 md:mb-5",
            "text-3xl sm:text-5xl md:text-7xl lg:text-8xl",
            "text-[var(--color-text-primary)]"
          )}
          style={{ textShadow: "0 0 40px var(--color-glow-primary)" }}
        >
          <TypingText text={config.clubName} />
        </h1>

        {/* Motto */}
        <motion.p
          variants={motionVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 1.5 }}
          className={cn(
            "font-heading text-base md:text-xl font-medium italic max-w-xl mx-auto",
            "text-[var(--color-text-secondary)] mb-8 md:mb-10"
          )}
        >
          &ldquo;{config.clubMotto}&rdquo;
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={motionVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 2 }}
          className="flex flex-wrap items-center justify-center gap-3 md:gap-4"
        >
          {config.heroCtaLabel1 && config.heroCtaUrl1 && (
            <Link
              href={config.heroCtaUrl1}
              className={cn(
                "inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm md:text-base",
                "bg-[var(--color-primary)] text-[var(--color-text-inverse)]",
                "hover:bg-[var(--color-primary-hover)] transition-colors duration-200",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-transparent",
                "shadow-[0_0_20px_var(--color-glow-primary)]"
              )}
            >
              {config.heroCtaLabel1}
            </Link>
          )}

          {config.heroCtaLabel2 && config.heroCtaUrl2 && (
            <Link
              href={config.heroCtaUrl2}
              className={cn(
                "inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm md:text-base",
                "border border-[var(--color-border-accent)] text-[var(--color-accent)]",
                "bg-[var(--color-bg-overlay)] backdrop-blur-sm",
                "hover:bg-[var(--color-accent)]/10 transition-colors duration-200",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-transparent"
              )}
            >
              {config.heroCtaLabel2}
            </Link>
          )}
        </motion.div>

        {/* Stats tease – founded year */}
        {config.foundedYear && (
          <motion.p
            variants={fadeVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 2.4 }}
            className="mt-8 md:mt-10 font-mono text-xs tracking-widest text-[var(--color-text-secondary)] uppercase"
          >
            Est. {config.foundedYear}
          </motion.p>
        )}
      </div>

      {/* ── Scroll Indicator ── */}
      <ScrollIndicator />

      {/* ── Bottom Wave ── */}
      <BottomWave />

      {/* ── Announcement Ticker Anchor ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20" id="announcement-anchor" />
    </section>
  );
}