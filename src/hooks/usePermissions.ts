// src/hooks/usePermissions.ts
"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";

import {
  hasPermission as _hasPermission,
  hasAnyPermission as _hasAnyPermission,
  isAdmin as _isAdmin,
  isSuperAdmin as _isSuperAdmin,
  canAccess as _canAccess,
} from "@/lib/permissions";

import type { AdminSection } from "@/types/ui";
import type { Session } from "next-auth";

// ─── Return Shape ─────────────────────────────────────────────────────────────

export interface UsePermissionsReturn {
  hasPermission: (p: string) => boolean;
  hasAnyPermission: (permissionList: string[]) => boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  canAccess: (section: AdminSection) => boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePermissions(): UsePermissionsReturn {
  const { data: session, status } = useSession();

  const result = useMemo<UsePermissionsReturn>(() => {
    // While loading or unauthenticated, return all-false defaults
    if (status === "loading" || status === "unauthenticated" || !session) {
      return {
        hasPermission: () => false,
        hasAnyPermission: () => false,
        isAdmin: false,
        isSuperAdmin: false,
        canAccess: () => false,
      };
    }

    // Cast to Session for the permission utilities
    const typedSession = session as Session;

    return {
      hasPermission: (p: string): boolean => {
        const user = typedSession.user as {
          permissions?: Record<string, boolean>;
        };
        return _hasPermission(user?.permissions ?? null, p);
      },

      hasAnyPermission: (permissionList: string[]): boolean => {
        const user = typedSession.user as {
          permissions?: Record<string, boolean>;
        };
        return _hasAnyPermission(user?.permissions ?? null, permissionList);
      },

      isAdmin: _isAdmin(typedSession),

      isSuperAdmin: _isSuperAdmin(typedSession),

      canAccess: (section: AdminSection): boolean => {
        return _canAccess(section, typedSession);
      },
    };
  }, [session, status]);

  return result;
}