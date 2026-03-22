import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (
    process.env.NEXT_PUBLIC_BASE_URL ?? "https://localhost:3000"
  ).replace(/\/$/, "");

  const [events, projects, members, configRow] = await Promise.all([
    prisma.event.findMany({
      where: { isPublished: true },
      select: { slug: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      where: { isPublished: true },
      select: { slug: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.member.findMany({
      where: { status: "active" },
      select: { username: true, createdAt: true, memberType: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.clubConfig.findUnique({
      where: { id: "main" },
      select: { updatedAt: true },
    }),
  ]);

  const configLastMod = configRow?.updatedAt ?? new Date();
  const latestEventDate = events[0]?.createdAt ?? configLastMod;
  const latestProjectDate = projects[0]?.createdAt ?? configLastMod;

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: configLastMod,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: configLastMod,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/members`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/events`,
      lastModified: latestEventDate,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/projects`,
      lastModified: latestProjectDate,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/gallery`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/alumni`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/instruments`,
      lastModified: configLastMod,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/membership`,
      lastModified: configLastMod,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  const eventPages: MetadataRoute.Sitemap = events.map((event) => ({
    url: `${baseUrl}/events/${event.slug}`,
    lastModified: event.createdAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const projectPages: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${baseUrl}/projects/${project.slug}`,
    lastModified: project.createdAt,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const regularMembers = members.filter((m) => m.memberType !== "alumni");
  const alumniMembers = members.filter((m) => m.memberType === "alumni");

  const memberPages: MetadataRoute.Sitemap = regularMembers.map((member) => ({
    url: `${baseUrl}/members/${member.username}`,
    lastModified: member.createdAt,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const alumniPages: MetadataRoute.Sitemap = alumniMembers.map((member) => ({
    url: `${baseUrl}/alumni/${member.username}`,
    lastModified: member.createdAt,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [
    ...staticPages,
    ...eventPages,
    ...projectPages,
    ...memberPages,
    ...alumniPages,
  ];
}