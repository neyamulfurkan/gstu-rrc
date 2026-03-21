// src/components/layout/Footer.tsx

import Image from "next/image";
import Link from "next/link";
import {
  Facebook,
  Youtube,
  Instagram,
  Linkedin,
  Github,
  Twitter,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Building2,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

import type { ClubConfigPublic, AnnouncementCard } from "@/types/index";
import { formatDate, truncateText } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FooterProps {
  config: ClubConfigPublic;
  announcements: AnnouncementCard[];
}

// ─── Circuit Board SVG Pattern ────────────────────────────────────────────────

const SOCIAL_ICON_STYLE = `
  .footer-social-icon {
    background-color: var(--color-bg-elevated);
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border);
  }
  .footer-social-icon:hover {
    background-color: var(--color-accent);
    color: var(--color-bg-base);
    border-color: var(--color-accent);
  }
`;

const CIRCUIT_PATTERN_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'><path d='M10 10h5v5h-5zM45 10h5v5h-5zM10 45h5v5h-5zM45 45h5v5h-5zM15 12h15M30 12h15M12 15v15M12 30v15M15 47h15M30 47h15M47 15v15M47 30v15M25 25h10v10h-10zM20 12v8M40 12v8M20 40v8M40 40v8M12 20h8M12 40h8M40 20h8M40 40h8' stroke='rgba(255,255,255,0.03)' fill='none' stroke-width='1'/></svg>`;

const CIRCUIT_PATTERN_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(CIRCUIT_PATTERN_SVG)}`;

// ─── Social Link Data ─────────────────────────────────────────────────────────

interface SocialLink {
  label: string;
  url: string;
  icon: React.ReactNode;
}

function buildSocialLinks(config: ClubConfigPublic): SocialLink[] {
  const links: SocialLink[] = [];

  if (config.fbUrl) {
    links.push({
      label: "Facebook",
      url: config.fbUrl,
      icon: <Facebook className="w-4 h-4" />,
    });
  }
  if (config.ytUrl) {
    links.push({
      label: "YouTube",
      url: config.ytUrl,
      icon: <Youtube className="w-4 h-4" />,
    });
  }
  if (config.igUrl) {
    links.push({
      label: "Instagram",
      url: config.igUrl,
      icon: <Instagram className="w-4 h-4" />,
    });
  }
  if (config.liUrl) {
    links.push({
      label: "LinkedIn",
      url: config.liUrl,
      icon: <Linkedin className="w-4 h-4" />,
    });
  }
  if (config.ghUrl) {
    links.push({
      label: "GitHub",
      url: config.ghUrl,
      icon: <Github className="w-4 h-4" />,
    });
  }
  if (config.twitterUrl) {
    links.push({
      label: "Twitter / X",
      url: config.twitterUrl,
      icon: <Twitter className="w-4 h-4" />,
    });
  }

  // Extra social links from config
  if (Array.isArray(config.extraSocialLinks)) {
    config.extraSocialLinks.forEach((extra) => {
      if (extra.url && extra.label) {
        links.push({
          label: extra.label,
          url: extra.url,
          icon: <ExternalLink className="w-4 h-4" />,
        });
      }
    });
  }

  return links;
}

// ─── Quick Navigation ─────────────────────────────────────────────────────────

const QUICK_NAV = [
  { label: "Home", href: "/" },
  { label: "Members", href: "/members" },
  { label: "Events", href: "/events" },
  { label: "Projects", href: "/projects" },
  { label: "Gallery", href: "/gallery" },
  { label: "Feed", href: "/feed" },
  { label: "Alumni", href: "/alumni" },
  { label: "Instruments", href: "/instruments" },
  { label: "About", href: "/about" },
  { label: "Membership", href: "/membership" },
  { label: "Certificates", href: "/certificates" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function Footer({ config, announcements }: FooterProps): JSX.Element {
  const currentYear = new Date().getFullYear();
  const socialLinks = buildSocialLinks(config);

  const copyrightText = config.footerCopyright
    ? config.footerCopyright.replace("{year}", String(currentYear))
    : `© ${currentYear} ${config.clubName}. All rights reserved.`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: SOCIAL_ICON_STYLE }} />
      {/* Top Wave Transition */}
      <div
        className="w-full overflow-hidden leading-none"
        aria-hidden="true"
        style={{ marginBottom: "-1px" }}
      >
        <svg
          viewBox="0 0 1440 80"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="block w-full h-16 md:h-20"
          style={{ fill: "var(--color-footer-bg, #060B14)" }}
        >
          <path d="M0,40 C240,80 480,0 720,40 C960,80 1200,0 1440,40 L1440,80 L0,80 Z" />
        </svg>
      </div>

      {/* Footer Body */}
      <footer
        className="relative w-full pb-24 md:pb-10"
        style={{
          backgroundColor: "var(--color-footer-bg, #060B14)",
          backgroundImage: `url("${CIRCUIT_PATTERN_DATA_URI}")`,
          backgroundRepeat: "repeat",
        }}
      >
        {/* Gradient overlay for depth */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 100%)",
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
          {/* ── 4-Column Grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            {/* ── Column 1: Branding + Socials ── */}
            <div className="flex flex-col gap-5">
              {/* Logo + Name */}
              <div className="flex items-center gap-3">
                {config.logoUrl ? (
                  <div className="relative w-10 h-10 flex-shrink-0">
                    <Image
                      src={config.logoUrl}
                      alt={`${config.clubName} logo`}
                      fill
                      sizes="40px"
                      className="object-contain"
                    />
                  </div>
                ) : null}
                <div>
                  <span
                    className="block font-bold text-base leading-tight"
                    style={{
                      color: "var(--color-text-primary)",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    {config.clubShortName || config.clubName}
                  </span>
                  {config.clubShortName && (
                    <span
                      className="block text-xs leading-tight"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {config.clubName}
                    </span>
                  )}
                </div>
              </div>

              {/* University Logo (below club branding) */}
              {(config.universityLogoUrl || config.universityName) && (
                <div className="flex items-center gap-2 pt-1 border-t border-[var(--color-border)] mt-1">
                  {config.universityLogoUrl ? (
                    <div className="relative w-8 h-8 flex-shrink-0">
                      <Image
                        src={config.universityLogoUrl}
                        alt={config.universityName || "University logo"}
                        fill
                        sizes="32px"
                        className="object-contain"
                      />
                    </div>
                  ) : null}
                  {config.universityName && (
                    config.universityWebUrl ? (
                      <a
                        href={config.universityWebUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs leading-tight transition-colors duration-150 hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {config.universityName}
                      </a>
                    ) : (
                      <span
                        className="text-xs leading-tight"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {config.universityName}
                      </span>
                    )
                  )}
                </div>
              )}

              {/* Motto */}
              {config.clubMotto && (
                <p
                  className="text-sm italic leading-relaxed"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  &ldquo;{config.clubMotto}&rdquo;
                </p>
              )}

              {/* Social Icons */}
              {socialLinks.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {socialLinks.map((social) => (
                    <a
                      key={social.label}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1 focus:ring-offset-transparent footer-social-icon"
                    >
                      {social.icon}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* ── Column 2: Quick Navigation ── */}
            <div>
              <h3
                className="text-sm font-semibold uppercase tracking-widest mb-4"
                style={{ color: "var(--color-accent)" }}
              >
                Quick Links
              </h3>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
                {QUICK_NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="group inline-flex items-center gap-1 text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      <ChevronRight
                        className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                        style={{ color: "var(--color-accent)" }}
                        aria-hidden="true"
                      />
                      <span
                        className="group-hover:text-[var(--color-text-primary)] transition-colors duration-150"
                      >
                        {item.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Column 3: Contact Info ── */}
            <div>
              <h3
                className="text-sm font-semibold uppercase tracking-widest mb-4"
                style={{ color: "var(--color-accent)" }}
              >
                Contact
              </h3>
              <ul className="flex flex-col gap-3">
                {config.email && (
                  <li className="flex items-start gap-2">
                    <Mail
                      className="w-4 h-4 flex-shrink-0 mt-0.5"
                      style={{ color: "var(--color-accent)" }}
                      aria-hidden="true"
                    />
                    <a
                      href={`mailto:${config.email}`}
                      className="text-sm break-all transition-colors duration-150 hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {config.email}
                    </a>
                  </li>
                )}

                {config.phone && (
                  <li className="flex items-start gap-2">
                    <Phone
                      className="w-4 h-4 flex-shrink-0 mt-0.5"
                      style={{ color: "var(--color-accent)" }}
                      aria-hidden="true"
                    />
                    <a
                      href={`tel:${config.phone}`}
                      className="text-sm transition-colors duration-150 hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {config.phone}
                    </a>
                  </li>
                )}

                {config.address && (
                  <li className="flex items-start gap-2">
                    <MapPin
                      className="w-4 h-4 flex-shrink-0 mt-0.5"
                      style={{ color: "var(--color-accent)" }}
                      aria-hidden="true"
                    />
                    <span
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {config.address}
                    </span>
                  </li>
                )}

                {config.departmentName && (
                  <li className="flex items-start gap-2">
                    <GraduationCap
                      className="w-4 h-4 flex-shrink-0 mt-0.5"
                      style={{ color: "var(--color-accent)" }}
                      aria-hidden="true"
                    />
                    <span
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {config.departmentName}
                    </span>
                  </li>
                )}

                {config.universityName && (
                  <li className="flex items-start gap-2">
                    {config.universityLogoUrl ? (
                      <div className="relative w-5 h-5 flex-shrink-0 mt-0.5 overflow-hidden rounded-sm">
                        <Image
                          src={config.universityLogoUrl}
                          alt={config.universityName}
                          fill
                          sizes="20px"
                          className="object-contain"
                        />
                      </div>
                    ) : (
                      <Building2
                        className="w-4 h-4 flex-shrink-0 mt-0.5"
                        style={{ color: "var(--color-accent)" }}
                        aria-hidden="true"
                      />
                    )}
                    {config.universityWebUrl ? (
                      <a
                        href={config.universityWebUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm leading-relaxed transition-colors duration-150 hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {config.universityName}
                      </a>
                    ) : (
                      <span
                        className="text-sm leading-relaxed"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {config.universityName}
                      </span>
                    )}
                  </li>
                )}
              </ul>
            </div>

            {/* ── Column 4: Latest Announcements ── */}
            <div>
              <h3
                className="text-sm font-semibold uppercase tracking-widest mb-4"
                style={{ color: "var(--color-accent)" }}
              >
                Latest News
              </h3>

              {announcements.length === 0 ? (
                <p
                  className="text-sm"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  No recent announcements.
                </p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {announcements.slice(0, 3).map((announcement) => (
                    <li key={announcement.id}>
                      <article>
                        {/* Category badge */}
                        {announcement.category?.name && (
                          <span
                            className="inline-block text-xs font-medium px-1.5 py-0.5 rounded mb-1"
                            style={{
                              backgroundColor:
                                announcement.category.color
                                  ? `${announcement.category.color}22`
                                  : "var(--color-bg-elevated)",
                              color:
                                announcement.category.color ||
                                "var(--color-accent)",
                              border: `1px solid ${announcement.category.color || "var(--color-accent)"}44`,
                            }}
                          >
                            {announcement.category.name}
                          </span>
                        )}

                        <p
                          className="text-sm font-medium leading-snug mb-1 line-clamp-2"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {truncateText(announcement.title, 70)}
                        </p>

                        <time
                          dateTime={
                            typeof announcement.createdAt === "string"
                              ? announcement.createdAt
                              : announcement.createdAt.toISOString()
                          }
                          className="text-xs"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          {formatDate(announcement.createdAt, "short")}
                        </time>
                      </article>
                    </li>
                  ))}
                </ul>
              )}

              <Link
                href="/events"
                className="inline-flex items-center gap-1 text-xs font-medium mt-4 transition-colors duration-150 hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
                style={{ color: "var(--color-accent)" }}
              >
                View all
                <ChevronRight className="w-3 h-3" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* ── Divider ── */}
          <div
            className="w-full h-px mb-6"
            style={{ backgroundColor: "var(--color-border)" }}
            aria-hidden="true"
          />

          {/* ── Bottom Bar ── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <p
              className="text-xs text-center sm:text-left"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {copyrightText}
            </p>

            {/* Legal Links */}
            <nav aria-label="Legal links">
              <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                {config.privacyPolicy && (
                  <li>
                    <a
                      href={config.privacyPolicy}
                      target={
                        config.privacyPolicy.startsWith("http")
                          ? "_blank"
                          : undefined
                      }
                      rel={
                        config.privacyPolicy.startsWith("http")
                          ? "noopener noreferrer"
                          : undefined
                      }
                      className="text-xs transition-colors duration-150 hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      Privacy Policy
                    </a>
                  </li>
                )}

                {config.termsOfUse && (
                  <li>
                    <a
                      href={config.termsOfUse}
                      target={
                        config.termsOfUse.startsWith("http")
                          ? "_blank"
                          : undefined
                      }
                      rel={
                        config.termsOfUse.startsWith("http")
                          ? "noopener noreferrer"
                          : undefined
                      }
                      className="text-xs transition-colors duration-150 hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      Terms of Use
                    </a>
                  </li>
                )}

                {config.constitutionUrl && (
                  <li>
                    <a
                      href={config.constitutionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs transition-colors duration-150 hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      Constitution
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  </li>
                )}

                {config.foundedYear && (
                  <li>
                    <span
                      className="text-xs"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      Est. {config.foundedYear}
                    </span>
                  </li>
                )}
              </ul>
            </nav>
          </div>
        </div>
      </footer>
    </>
  );
}