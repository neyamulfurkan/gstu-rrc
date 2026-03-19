// src/lib/seo.ts
import type { Metadata } from "next";
import type {
  ClubConfigPublic,
  EventDetail,
  MemberPublic,
  ProjectDetail,
} from "@/types/index";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";

export function generateBaseMetadata(config: ClubConfigPublic): Metadata {
  return {
    title: {
      default: config.clubName,
      template: `%s | ${config.clubName}`,
    },
    description: config.metaDescription,
    keywords: config.seoKeywords,
    metadataBase: BASE_URL ? new URL(BASE_URL) : undefined,
    openGraph: {
      siteName: config.clubName,
      locale: "en_BD",
      type: "website",
      images: config.ogImageUrl
        ? [
            {
              url: config.ogImageUrl,
              width: 1200,
              height: 630,
              alt: config.clubName,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      images: config.ogImageUrl ? [config.ogImageUrl] : [],
    },
    verification: config.gscVerifyTag
      ? { google: config.gscVerifyTag }
      : undefined,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export function generateEventMetadata(
  event: EventDetail,
  config: ClubConfigPublic
): Metadata {
  const url = `${BASE_URL}/events/${event.slug}`;
  const description =
    event.metaDescription ??
    (typeof event.description === "string"
      ? event.description.slice(0, 160)
      : config.metaDescription);

  const startDateStr =
    event.startDate instanceof Date
      ? event.startDate.toISOString()
      : new Date(event.startDate).toISOString();

  const endDateStr = event.endDate
    ? event.endDate instanceof Date
      ? event.endDate.toISOString()
      : new Date(event.endDate).toISOString()
    : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: startDateStr,
    ...(endDateStr ? { endDate: endDateStr } : {}),
    location: {
      "@type": "Place",
      name: event.venue,
      ...(event.mapLink ? { url: event.mapLink } : {}),
    },
    description: description,
    image: event.coverUrl,
    organizer: {
      "@type": "Organization",
      name: event.organizerName,
    },
    url,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  };

  return {
    title: event.title,
    description,
    openGraph: {
      title: event.title,
      description: description ?? undefined,
      type: "website",
      url,
      siteName: config.clubName,
      locale: "en_BD",
      images: event.coverUrl
        ? [{ url: event.coverUrl, alt: event.title }]
        : config.ogImageUrl
        ? [{ url: config.ogImageUrl, alt: config.clubName }]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description: description ?? undefined,
      images: event.coverUrl
        ? [event.coverUrl]
        : config.ogImageUrl
        ? [config.ogImageUrl]
        : [],
    },
    alternates: {
      canonical: url,
    },
    other: {
      "application/ld+json": JSON.stringify(jsonLd),
    },
  };
}

export function generateMemberMetadata(
  member: MemberPublic,
  config: ClubConfigPublic
): Metadata {
  const url = `${BASE_URL}/members/${member.username}`;
  const description =
    member.bio
      ? member.bio.slice(0, 160)
      : `${member.fullName} — ${member.role.name} at ${config.clubName}, ${config.universityName}.`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: member.fullName,
    url,
    image: member.avatarUrl,
    jobTitle: member.role.name,
    affiliation: {
      "@type": "Organization",
      name: config.clubName,
      url: BASE_URL,
    },
    description,
    ...(member.socialLinks?.linkedin
      ? { sameAs: [member.socialLinks.linkedin] }
      : {}),
    ...(member.workplace ? { worksFor: { "@type": "Organization", name: member.workplace } } : {}),
  };

  return {
    title: member.fullName,
    description,
    openGraph: {
      title: `${member.fullName} | ${config.clubName}`,
      description,
      type: "profile",
      url,
      siteName: config.clubName,
      locale: "en_BD",
      images: member.avatarUrl
        ? [{ url: member.avatarUrl, alt: member.fullName }]
        : config.ogImageUrl
        ? [{ url: config.ogImageUrl, alt: config.clubName }]
        : [],
    },
    twitter: {
      card: "summary",
      title: `${member.fullName} | ${config.clubName}`,
      description,
      images: member.avatarUrl ? [member.avatarUrl] : [],
    },
    alternates: {
      canonical: url,
    },
    other: {
      "application/ld+json": JSON.stringify(jsonLd),
    },
  };
}

export function generateProjectMetadata(
  project: ProjectDetail,
  config: ClubConfigPublic
): Metadata {
  const url = `${BASE_URL}/projects/${project.slug}`;
  const description =
    typeof project.description === "string"
      ? project.description.slice(0, 160)
      : `${project.title} — a ${project.status} project by ${config.clubName}.`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    url,
    image: project.coverUrl,
    description,
    dateCreated: String(project.year),
    creator: project.teamMembers.map((m) => ({
      "@type": "Person",
      name: m.fullName,
      url: `${BASE_URL}/members/${m.username}`,
    })),
    keywords: project.technologies.join(", "),
    ...(project.githubUrl ? { codeRepository: project.githubUrl } : {}),
    ...(project.demoUrl ? { url: project.demoUrl } : {}),
    publisher: {
      "@type": "Organization",
      name: config.clubName,
      url: BASE_URL,
    },
    creativeWorkStatus:
      project.status === "completed" ? "Published" : "Draft",
  };

  return {
    title: project.title,
    description,
    openGraph: {
      title: `${project.title} | ${config.clubName}`,
      description,
      type: "website",
      url,
      siteName: config.clubName,
      locale: "en_BD",
      images: project.coverUrl
        ? [{ url: project.coverUrl, alt: project.title }]
        : config.ogImageUrl
        ? [{ url: config.ogImageUrl, alt: config.clubName }]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: `${project.title} | ${config.clubName}`,
      description,
      images: project.coverUrl
        ? [project.coverUrl]
        : config.ogImageUrl
        ? [config.ogImageUrl]
        : [],
    },
    alternates: {
      canonical: url,
    },
    other: {
      "application/ld+json": JSON.stringify(jsonLd),
    },
  };
}

export function generateOrganizationJsonLd(config: ClubConfigPublic): string {
  const sameAs: string[] = [];
  if (config.fbUrl) sameAs.push(config.fbUrl);
  if (config.ytUrl) sameAs.push(config.ytUrl);
  if (config.igUrl) sameAs.push(config.igUrl);
  if (config.liUrl) sameAs.push(config.liUrl);
  if (config.ghUrl) sameAs.push(config.ghUrl);
  if (config.twitterUrl) sameAs.push(config.twitterUrl);
  if (Array.isArray(config.extraSocialLinks)) {
    for (const link of config.extraSocialLinks) {
      if (link.url) sameAs.push(link.url);
    }
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: config.clubName,
    alternateName: config.clubShortName,
    url: BASE_URL,
    logo: config.logoUrl,
    description: config.metaDescription,
    foundingDate: String(config.foundedYear),
    address: {
      "@type": "PostalAddress",
      addressLocality: config.address,
      addressCountry: "BD",
    },
    contactPoint: {
      "@type": "ContactPoint",
      email: config.email,
      telephone: config.phone,
      contactType: "customer support",
    },
    parentOrganization: {
      "@type": "CollegeOrUniversity",
      name: config.universityName,
    },
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };

  return JSON.stringify(jsonLd);
}

export function generateBreadcrumbJsonLd(
  items: { name: string; url: string }[]
): string {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${BASE_URL}${item.url}`,
    })),
  };

  return JSON.stringify(jsonLd);
}