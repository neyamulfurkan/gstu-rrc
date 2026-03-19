// src/lib/colorInject.ts

import { prisma } from "@/lib/prisma";
import {
  buildCssVariableBlock,
  DEFAULT_COLORS,
  type FontConfig,
} from "@/lib/colorSystem";

let cachedBlock: string | null = null;
let cachedAt: number = 0;

const FALLBACK_FONTS: FontConfig = {
  display: "Orbitron",
  heading: "Syne",
  body: "DM Sans",
  mono: "JetBrains Mono",
};

export async function getColorStyleBlock(): Promise<string> {
  if (cachedBlock !== null && Date.now() - cachedAt < 60_000) {
    return cachedBlock;
  }

  try {
    const config = await prisma.clubConfig.findUnique({
      where: { id: "main" },
      select: {
        colorConfig: true,
        displayFont: true,
        bodyFont: true,
        headingFont: true,
        monoFont: true,
      },
    });

    if (!config) {
      const fallback = buildCssVariableBlock(
        DEFAULT_COLORS as Record<string, string>,
        FALLBACK_FONTS
      );
      cachedBlock = fallback;
      cachedAt = Date.now();
      return fallback;
    }

    const fonts: FontConfig = {
      display: config.displayFont || FALLBACK_FONTS.display,
      heading: config.headingFont || FALLBACK_FONTS.heading,
      body: config.bodyFont || FALLBACK_FONTS.body,
      mono: config.monoFont || FALLBACK_FONTS.mono,
    };

    const colorConfig =
      config.colorConfig &&
      typeof config.colorConfig === "object" &&
      !Array.isArray(config.colorConfig)
        ? (config.colorConfig as Record<string, string>)
        : (DEFAULT_COLORS as Record<string, string>);

    const block = buildCssVariableBlock(colorConfig, fonts);

    cachedBlock = block;
    cachedAt = Date.now();

    return block;
  } catch (error) {
    console.error(
      "[colorInject] Failed to fetch ClubConfig for color injection:",
      error
    );

    const fallback = buildCssVariableBlock(
      DEFAULT_COLORS as Record<string, string>,
      FALLBACK_FONTS
    );

    // Do not cache fallback results — retry on next request
    return fallback;
  }
}