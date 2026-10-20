"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createClient, RealtimeChannel } from "@supabase/supabase-js";
import {
  emitNotification,
  initNotificationEngine,
  type NotificationItem,
  type NotificationPriority,
  type NotificationType,
  onNotificationEngineStateChange,
  dismissNotification,
  acknowledgeNotification,
  dismissAllNotifications,
  requestPushPermission,
} from "../lib/notificationEngine";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type NotificationEnvelope = {
  type: NotificationType;
  receivedAt: number;
  payload: Record<string, unknown>;
};

type NotificationState = {
  lastEvent: NotificationEnvelope | null;
  items: NotificationItem[];
  unreadCount: number;
  pushPermissionGranted: boolean;
  requestPush: () => Promise<boolean>;
  emit: (
    type: NotificationType,
    payload?: Record<string, unknown>,
    overrides?: {
      priority?: NotificationPriority;
      title?: string;
      description?: string;
    },
  ) => Promise<NotificationItem>;
  dismiss: (id: string) => Promise<void>;
  acknowledge: (id: string) => Promise<void>;
  dismissAll: () => Promise<void>;
  subscribe: (listener: (envelope: NotificationEnvelope) => void) => () => void;
};

const NotificationContext = React.createContext<NotificationState | null>(null);

const STORAGE_KEY = "tad_driver_notifications_v1";
const DEDUP_TTL_MS = 5 * 60 * 1000;

function getDriverId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("tad_driver_user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.driverId === "string" ? parsed.driverId : null;
  } catch {
    return null;
  }
}

function buildChannelName(driverId: string) {
  return `driver_notifications_${driverId}`;
}

function stableKey(type: NotificationType, payload: Record<string, unknown>) {
  try {
    return `${type}:${JSON.stringify(payload)}`;
  } catch {
    return `${type}:${Object.keys(payload).join(",")}`;
  }
}

function loadHistory(): Array<{ key: string; env: NotificationEnvelope }> {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Array<{ key: string; env: NotificationEnvelope }>;
  } catch {
    return [];
  }
}

function saveHistory(
  history: Array<{ key: string; env: NotificationEnvelope }>,
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    /* quota exceeded */
  }
}

function pruneHistory(
  history: Array<{ key: string; env: NotificationEnvelope }>,
  now: number,
) {
  return history.filter((item) => now - item.env.receivedAt < DEDUP_TTL_MS);
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [lastEvent, setLastEvent] = useState<NotificationEnvelope | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [pushPermissionGranted, setPushPermissionGranted] = useState(false);
  const listenersRef = useRef<Set<(envelope: NotificationEnvelope) => void>>(
    new Set(),
  );
  const channelRef = useRef<RealtimeChannel | null>(null);

  // ─── Inicializar NotificationEngine ──────────────────────────────────────
  useEffect(() => {
    void initNotificationEngine();

    // Escuchar cambios del engine
    const unsubscribe = onNotificationEngineStateChange((state) => {
      setItems(state.items);
      setUnreadCount(state.unreadCount);
    });

    // Check push permission status
    if ("Notification" in window) {
      setPushPermissionGranted(Notification.permission === "granted");
    }

    return unsubscribe;
  }, []);

  // ─── Supabase Realtime Channel ──────────────────────────────────────────
  useEffect(() => {
    const driverId = getDriverId();
    if (!driverId) return;

    import("@tad/services").then(({ supabase }) => {
      if (channelRef.current) return;

      const channelName = buildChannelName(driverId);
      const ch = supabase.channel(channelName);

      ch.on("broadcast", { event: "*" }, ({ payload }: { payload: any }) => {
        const raw = payload as NotificationEnvelope | undefined;
        if (!raw || !raw.type) return;

        const now = Date.now();
        let history = pruneHistory(loadHistory(), now);
        const key = stableKey(raw.type as NotificationType, raw.payload ?? {});

        // Dedup: evitar procesar la misma notificación duplicada
        if (
          history.some(
            (h) => h.key === key && now - h.env.receivedAt < DEDUP_TTL_MS,
          )
        ) {
          return;
        }

        history = pruneHistory([...history, { key, env: raw }], now);
        saveHistory(history);
        setLastEvent(raw);
        listenersRef.current.forEach((fn) => fn(raw));

        // Emitir al NotificationEngine (non-blocking, con prioridad)
        void emitNotification(raw.type as NotificationType, raw.payload ?? {});
      });

      ch.subscribe();
      channelRef.current = ch;
    });

    return () => {
      if (channelRef.current) {
        import("@tad/services").then(({ supabase }) => {
          void supabase.removeChannel(channelRef.current!);
          channelRef.current = null;
        });
      }
    };
  }, []);

  // ─── API del Context ────────────────────────────────────────────────────

  const emit = useCallback(
    async (
      type: NotificationType,
      payload: Record<string, unknown> = {},
      overrides?: {
        priority?: NotificationPriority;
        title?: string;
        description?: string;
      },
    ): Promise<NotificationItem> => {
      const item = await emitNotification(type, payload, overrides);
      const envelope: NotificationEnvelope = {
        type,
        receivedAt: item.receivedAt,
        payload,
      };
      setLastEvent(envelope);
      listenersRef.current.forEach((fn) => fn(envelope));
      return item;
    },
    [],
  );

  const dismiss = useCallback(async (id: string) => {
    await dismissNotification(id);
  }, []);

  const acknowledge = useCallback(async (id: string) => {
    await acknowledgeNotification(id);
  }, []);

  const dismissAll = useCallback(async () => {
    await dismissAllNotifications();
  }, []);

  const requestPush = useCallback(async (): Promise<boolean> => {
    const granted = await requestPushPermission();
    setPushPermissionGranted(granted);
    return granted;
  }, []);

  const subscribe = useCallback(
    (listener: (envelope: NotificationEnvelope) => void) => {
      listenersRef.current.add(listener);
      return () => {
        listenersRef.current.delete(listener);
      };
    },
    [],
  );

  const value = React.useMemo<NotificationState>(
    () => ({
      lastEvent,
      items,
      unreadCount,
      pushPermissionGranted,
      requestPush,
      emit,
      dismiss,
      acknowledge,
      dismissAll,
      subscribe,
    }),
    [
      lastEvent,
      items,
      unreadCount,
      pushPermissionGranted,
      emit,
      dismiss,
      acknowledge,
      dismissAll,
      requestPush,
      subscribe,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotifications(): NotificationState {
  const ctx = React.useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      "useNotifications must be used inside NotificationProvider",
    );
  }
  return ctx;
}
