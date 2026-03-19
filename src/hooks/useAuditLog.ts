// src/hooks/useAuditLog.ts
"use client";

import { useCallback } from "react";

interface AuditLogParams {
  actionType: string;
  description: string;
  entityType?: string;
  entityId?: string;
}

interface UseAuditLogReturn {
  log: (
    actionType: string,
    description: string,
    entityType?: string,
    entityId?: string
  ) => Promise<void>;
}

export function useAuditLog(): UseAuditLogReturn {
  const log = useCallback(
    async (
      actionType: string,
      description: string,
      entityType?: string,
      entityId?: string
    ): Promise<void> => {
      const payload: AuditLogParams = {
        actionType,
        description,
        ...(entityType !== undefined && { entityType }),
        ...(entityId !== undefined && { entityId }),
      };

      try {
        const response = await fetch("/api/admin/audit-log", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          console.error(
            `[useAuditLog] Failed to log action "${actionType}": HTTP ${response.status}`
          );
        }
      } catch (error) {
        console.error(
          `[useAuditLog] Network error while logging action "${actionType}":`,
          error instanceof Error ? error.message : String(error)
        );
      }
    },
    []
  );

  return { log };
}