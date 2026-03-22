// src/app/manifest.ts
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const config = await prisma.clubConfig
    .findUnique({
      where: { id: "main" },
      select: {
        clubName: true,
        clubShortName: true,
        clubMotto: true,
        logoUrl: true,
        faviconUrl: true,
      },
    })
    .catch(() => null);

  const name = config?.clubName ?? "GSTU Robotics & Research Club";
  const shortName = config?.clubShortName ?? "GSTU RRC";
  const description = config?.clubMotto ?? "Innovate. Build. Inspire.";
  const icon = config?.faviconUrl || config?.logoUrl || "/favicon.ico";

  return {
    name,
    short_name: shortName,
    description,
    start_url: "/",
    display: "standalone",
    background_color: "#060B14",
    theme_color: "#060B14",
    orientation: "portrait-primary",
    scope: "/",
    lang: "en",
    categories: ["education", "science", "technology"],
    icons: [
      {
        src: icon,
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: icon,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Events",
        short_name: "Events",
        description: "View upcoming events",
        url: "/events",
      },
      {
        name: "Projects",
        short_name: "Projects",
        description: "Browse our projects",
        url: "/projects",
      },
      {
        name: "Join Us",
        short_name: "Join",
        description: "Apply for membership",
        url: "/membership",
      },
    ],
  };
}