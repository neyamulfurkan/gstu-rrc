// src/lib/auditLogger.ts

import { prisma } from "@/lib/prisma";

interface LogActionParams {
  adminId: string;
  actionType: string;
  description: string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
}

export async function logAction(params: LogActionParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        adminId: params.adminId,
        actionType: params.actionType,
        description: params.description,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        ipAddress: params.ipAddress ?? null,
      },
    });
  } catch (error) {
    console.error("[auditLogger] Failed to write audit log entry:", {
      adminId: params.adminId,
      actionType: params.actionType,
      description: params.description,
      error,
    });
  }
}