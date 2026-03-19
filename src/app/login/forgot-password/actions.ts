"use server";

export async function requestPasswordReset(email: string): Promise<{ ok: boolean; error?: string }> {
  const { prisma } = await import("@/lib/prisma");
  const { sendEmail } = await import("@/lib/resend");
  const crypto = await import("crypto");

  try {
    const member = await prisma.member.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
      },
    });

    if (!member || member.status !== "active") {
      return { ok: true };
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.deleteMany({
      where: { memberId: member.id },
    });

    await prisma.passwordResetToken.create({
      data: {
        token,
        memberId: member.id,
        expiresAt,
        used: false,
      },
    });

    const resetLink =
      (process.env.NEXT_PUBLIC_BASE_URL ?? "") +
      "/login/reset-password?token=" +
      token;

    const config = await prisma.clubConfig.findUnique({
      where: { id: "main" },
      select: {
        clubName: true,
        logoUrl: true,
        colorConfig: true,
      },
    });

    const colorConfig = (config?.colorConfig ?? {}) as Record<string, string>;
    const primaryColor = colorConfig["--color-primary"] ?? "#0070f3";

    const clubEmailConfig = {
      clubName: config?.clubName ?? "GSTU Robotics Club",
      logoUrl: config?.logoUrl ?? "",
      primaryColor,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const emailModule = await import("../../../../emails/MemberEmails") as any;
    const { PasswordResetEmail } = emailModule;

    await sendEmail({
      to: member.email,
      subject: `Reset your ${clubEmailConfig.clubName} password`,
      reactComponent: PasswordResetEmail({
        resetLink,
        clubConfig: clubEmailConfig,
      }),
    });

    return { ok: true };
  } catch (err) {
    console.error("[forgot-password] Error processing password reset request:", err);
    return { ok: true };
  }
}