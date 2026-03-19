"use server";

import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function validateToken(
  token: string
): Promise<{ valid: boolean; memberId?: string }> {
  try {
    const record = await prisma.passwordResetToken.findFirst({
      where: {
        token,
        used: false,
        expiresAt: { gt: new Date() },
      },
      select: { memberId: true },
    });
    if (!record) return { valid: false };
    return { valid: true, memberId: record.memberId };
  } catch {
    return { valid: false };
  }
}

export async function resetPassword(
  token: string,
  password: string,
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const passwordHash = await bcryptjs.hash(password, 12);
    await prisma.$transaction([
      prisma.member.update({
        where: { id: memberId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { token },
        data: { used: true },
      }),
    ]);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to reset password. Please try again." };
  }
}