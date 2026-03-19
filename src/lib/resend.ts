// src/lib/resend.ts

import { Resend } from "resend";
import type { ReactElement } from "react";
import { prisma } from "@/lib/prisma";

if (!process.env.RESEND_API_KEY) {
  console.warn(
    "[resend] WARNING: RESEND_API_KEY environment variable is not set. " +
      "All email operations will be silently skipped."
  );
}

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  reactComponent: ReactElement;
  replyTo?: string;
}

export async function sendEmail({
  to,
  subject,
  reactComponent,
  replyTo,
}: SendEmailParams): Promise<void> {
  if (!resend) {
    console.warn(
      `[resend] Skipping email to ${Array.isArray(to) ? to.join(", ") : to} — RESEND_API_KEY not configured.`
    );
    return;
  }

  let fromEmail = "noreply@example.com";
  let fromName = "GSTU Robotics Club";

  try {
    const config = await prisma.clubConfig.findUnique({
      where: { id: "main" },
      select: {
        resendFromEmail: true,
        resendFromName: true,
      },
    });

    if (config?.resendFromEmail) {
      fromEmail = config.resendFromEmail;
    }
    if (config?.resendFromName) {
      fromName = config.resendFromName;
    }
  } catch (configError) {
    console.error(
      "[resend] Failed to fetch sender config from database, using fallback values:",
      configError
    );
  }

  const fromField = `${fromName} <${fromEmail}>`;

  try {
    const payload: Parameters<typeof resend.emails.send>[0] = {
      from: fromField,
      to: Array.isArray(to) ? to : [to],
      subject,
      react: reactComponent,
    };

    if (replyTo) {
      payload.reply_to = replyTo;
    }

    const { error } = await resend.emails.send(payload);

    if (error) {
      console.error(
        `[resend] Email send failed for subject "${subject}" to ${Array.isArray(to) ? to.join(", ") : to}:`,
        error
      );
    }
  } catch (sendError) {
    console.error(
      `[resend] Unexpected error sending email for subject "${subject}" to ${Array.isArray(to) ? to.join(", ") : to}:`,
      sendError
    );
  }
}