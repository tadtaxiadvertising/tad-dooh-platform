import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onNotificationEngineStateChange,
  emitNotification,
  dismissNotification,
  acknowledgeNotification,
  dismissAllNotifications,
  requestPushPermission,
  type NotificationEngineState,
  type NotificationItem,
  type NotificationType,
} from '../lib/notificationEngine';

interface NotificationContextValue {
  unreadCount: number;
  items: NotificationItem[];
  emit: (type: NotificationType, payload?: Record<string, unknown>) => Promise<NotificationItem>;
  dismiss: (id: string) => Promise<void>;
  acknowledge: (id: string) => Promise<void>;
  dismissAll: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<NotificationEngineState>({ unreadCount: 0, items: [] });

  useEffect(() => {
    const unsubscribe = onNotificationEngineStateChange(setState);
    return unsubscribe;
  }, []);

  const value: NotificationContextValue = {
    unreadCount: state.unreadCount,
    items: state.items,
    emit: (type, payload = {}) => emitNotification(type, payload),
    dismiss: (id) => dismissNotification(id),
    acknowledge: (id) => acknowledgeNotification(id),
    dismissAll: () => dismissAllNotifications(),
    requestPermission: () => requestPushPermission(),
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
