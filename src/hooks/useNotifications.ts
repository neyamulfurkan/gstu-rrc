// src/hooks/useNotifications.ts
"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";

import type { NotificationItem } from "@/types/index";

interface NotificationsApiResponse {
  data: NotificationItem[];
  unreadCount: number;
  nextCursor?: string;
  total: number;
}

interface UseNotificationsReturn {
  unreadCount: number;
  notifications: NotificationItem[];
  markAllRead: () => void;
  isLoading: boolean;
}

const fetcher = async (url: string): Promise<NotificationsApiResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch notifications: ${res.status}`);
  }
  return res.json() as Promise<NotificationsApiResponse>;
};

export function useNotifications(): UseNotificationsReturn {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  const { data, isLoading, mutate } = useSWR<NotificationsApiResponse>(
    isAuthenticated ? "/api/notifications?unreadOnly=true&take=20" : null,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 10000,
    }
  );

  const markAllRead = useCallback((): void => {
    if (!isAuthenticated) return;

    void (async () => {
      try {
        const res = await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markAllRead: true }),
        });

        if (!res.ok) {
          console.error("Failed to mark all notifications as read:", res.status);
          return;
        }

        await mutate(
          (current) => {
            if (!current) return current;
            return {
              ...current,
              unreadCount: 0,
              data: current.data.map((n) => ({ ...n, isRead: true })),
            };
          },
          { revalidate: false }
        );
      } catch (err) {
        console.error("Error marking all notifications as read:", err);
      }
    })();
  }, [isAuthenticated, mutate]);

  if (!isAuthenticated || !data) {
    return {
      unreadCount: 0,
      notifications: [],
      markAllRead,
      isLoading: isAuthenticated && isLoading,
    };
  }

  return {
    unreadCount: data.unreadCount ?? 0,
    notifications: data.data ?? [],
    markAllRead,
    isLoading,
  };
}