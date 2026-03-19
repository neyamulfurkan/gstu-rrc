// src/lib/emailTemplates.ts

import { prisma } from "@/lib/prisma";

/**
 * Fetches an admin-customized email template from ClubConfig.
 * Returns null if the config row is missing, emailTemplates is null/empty,
 * or the requested templateName key does not exist.
 * Falls back gracefully so callers can use hardcoded React Email templates.
 */
export async function getEmailTemplate(
  templateName: string
): Promise<
  { subject: string; body: string } | null
> {
  try {
    const config = await prisma.clubConfig.findUnique({
      where: { id: "main" },
      select: { emailTemplates: true },
    });

    if (!config || config.emailTemplates === null) {
      return null;
    }

    const templates = config.emailTemplates as Record<
      string,
      { subject: string; body: string }
    >;

    const template = templates[templateName];

    if (
      !template ||
      typeof template.subject !== "string" ||
      typeof template.body !== "string"
    ) {
      return null;
    }

    return {
      subject: template.subject,
      body: template.body,
    };
  } catch (error) {
    console.error(
      `[emailTemplates] Failed to fetch template "${templateName}":`,
      error
    );
    return null;
  }
}