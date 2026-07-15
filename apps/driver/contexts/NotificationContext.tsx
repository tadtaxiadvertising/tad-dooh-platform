'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';

type NotificationType =
  | 'PAYMENT_LIQUIDATED'
  | 'CAMPAIGN_ASSIGNED'
  | 'SUBS_WARNING'
  | 'SUBS_CRITICAL'
  | 'DRIVER_STATUS';

type NotificationEnvelope = {
  type: NotificationType;
  receivedAt: number;
  payload: Record<string, unknown>;
};

type NotificationState = {
  lastEvent: NotificationEnvelope | null;
  push: (envelope: NotificationEnvelope) => void;
  subscribe: (listener: (envelope: NotificationEnvelope) => void) => () => void;
};

const NotificationContext = React.createContext<NotificationState | null>(null);

const STORAGE_KEY = 'tad_driver_notifications_v1';
const DEDUP_TTL_MS = 5 * 60 * 1000;

function getDriverId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('tad_driver_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.driverId === 'string' ? parsed.driverId : null;
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
    return `${type}:${Object.keys(payload).join(',')}`;
  }
}

function loadHistory(): Array<{ key: string; env: NotificationEnvelope }> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Array<{ key: string; env: NotificationEnvelope }>;
  } catch {
    return [];
  }
}

function saveHistory(
  history: Array<{ key: string; env: NotificationEnvelope }>
) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // quota exceeded — ignore
  }
}

function pruneHistory(
  history: Array<{ key: string; env: NotificationEnvelope }>,
  now: number
) {
  return history.filter((item) => now - item.env.receivedAt < DEDUP_TTL_MS);
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [lastEvent, setLastEvent] = useState<NotificationEnvelope | null>(null);
  const listenersRef = useRef<Set<(envelope: NotificationEnvelope) => void>>(
    new Set()
  );
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const driverId = getDriverId();
    if (!driverId) return;

    import('@tad/services').then(({ supabase }) => {
      if (channelRef.current) return;

      const channelName = buildChannelName(driverId);
      const ch = supabase.channel(channelName);

      ch.on('broadcast', { event: '*' }, ({ payload }) => {
        const raw = payload as NotificationEnvelope | undefined;
        if (!raw || !raw.type) return;

        const now = Date.now();
        let history = pruneHistory(loadHistory(), now);
        const key = stableKey(raw.type as NotificationType, raw.payload ?? {});

        if (
          history.some(
            (h) => h.key === key && now - h.env.receivedAt < DEDUP_TTL_MS
          )
        ) {
          return;
        }

        history = pruneHistory([...history, { key, env: raw }], now);
        saveHistory(history);
        setLastEvent(raw);
        listenersRef.current.forEach((fn) => fn(raw));
      });

      ch.subscribe();
      channelRef.current = ch;
    });

    return () => {
      if (channelRef.current) {
        import('@tad/services').then(({ supabase }) => {
          void supabase.removeChannel(channelRef.current!);
          channelRef.current = null;
        });
      }
    };
  }, []);

  const push = useCallback((envelope: NotificationEnvelope) => {
    const now = Date.now();
    let history = pruneHistory(loadHistory(), now);
    const key = stableKey(envelope.type, envelope.payload ?? {});
    history = pruneHistory([...history, { key, env: envelope }], now);
    saveHistory(history);
    setLastEvent(envelope);
    listenersRef.current.forEach((fn) => fn(envelope));
  }, []);

  const subscribe = useCallback(
    (listener: (envelope: NotificationEnvelope) => void) => {
      listenersRef.current.add(listener);
      return () => {
        listenersRef.current.delete(listener);
      };
    },
    []
  );

  const value = React.useMemo<NotificationState>(
    () => ({ lastEvent, push, subscribe }),
    [lastEvent, push, subscribe]
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
      'useNotifications must be used inside NotificationProvider'
    );
  }
  return ctx;
}