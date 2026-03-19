// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://localhost:3000";

  const [events, projects, members] = await Promise.all([
    prisma.event.findMany({
      where: { isPublished: true },
      select: { slug: true, createdAt: true },
    }),
    prisma.project.findMany({
      where: { isPublished: true },
      select: { slug: true, createdAt: true },
    }),
    prisma.member.findMany({
      where: { status: "active" },
      select: { username: true, createdAt: true, memberType: true },
    }),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/members`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/events`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/projects`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/gallery`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/feed`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/alumni`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/instruments`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/membership`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/certificates`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  const eventPages: MetadataRoute.Sitemap = events.map((event) => ({
    url: `${baseUrl}/events/${event.slug}`,
    lastModified: event.createdAt,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  const projectPages: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${baseUrl}/projects/${project.slug}`,
    lastModified: project.createdAt,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  const regularMembers = members.filter((m) => m.memberType !== "alumni");
  const alumniMembers = members.filter((m) => m.memberType === "alumni");

  const memberPages: MetadataRoute.Sitemap = regularMembers.map((member) => ({
    url: `${baseUrl}/members/${member.username}`,
    lastModified: member.createdAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const alumniPages: MetadataRoute.Sitemap = alumniMembers.map((member) => ({
    url: `${baseUrl}/alumni/${member.username}`,
    lastModified: member.createdAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...eventPages, ...projectPages, ...memberPages, ...alumniPages];
}