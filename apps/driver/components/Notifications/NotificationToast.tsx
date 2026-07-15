'use client';

import React from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { toast } from 'sonner';

const OFFLINE_STORAGE_KEY = 'tad_driver_network_mode_v1';

function isOnline(): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  if (typeof window !== 'undefined') {
    try {
      const cached = window.sessionStorage.getItem(OFFLINE_STORAGE_KEY);
      if (cached === 'offline') return false;
    } catch {
      // ignore
    }
  }
  return true;
}

function markOffline() {
  try {
    window?.sessionStorage.setItem(OFFLINE_STORAGE_KEY, 'offline');
  } catch {
    // ignore
  }
}

function markOnline() {
  try {
    window?.sessionStorage.removeItem(OFFLINE_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function NotificationToast() {
  const { lastEvent } = useNotifications();
  const [online, setOnline] = React.useState(() => isOnline());

  // Sincronizar estado de red con toasts descriptivos
  React.useEffect(() => {
    const sync = () => {
      const next = isOnline();
      setOnline((prev) => {
        if (prev !== next) {
          if (next) {
            markOnline();
            toast.success('Conexión restaurada', {
              description: 'Sincronizando datos pendientes...',
              duration: 3500,
            });
          } else {
            markOffline();
            toast.error('Sin conexión', {
              description: 'Estás en modo local. Los datos se guardan temporalmente.',
              duration: 5000,
            });
          }
        }
        return next;
      });
    };

    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  // Notificaciones de negocio vía realtime
  React.useEffect(() => {
    if (!lastEvent) return;

    switch (lastEvent.type) {
      case 'PAYMENT_LIQUIDATED': {
        const amount = Number(lastEvent.payload.amount ?? 0);
        const formatted = Number.isFinite(amount)
          ? `RD$${amount.toLocaleString('es-DO')}`
          : 'un monto';
        toast.success('Pago liquidado', {
          description: `¡Recibiste ${formatted}!`,
          duration: 6000,
        });
        break;
      }
      case 'CAMPAIGN_ASSIGNED': {
        toast.info('Nueva campaña asignada', {
          description: 'Sincronizando en progreso...',
          duration: 4000,
        });
        break;
      }
      case 'SUBS_CRITICAL': {
        toast.error('Suscripción vencida', {
          description:
            (lastEvent.payload.message as string) ??
            'Regulariza tu pago para evitar el bloqueo.',
          duration: 7000,
        });
        break;
      }
      case 'SUBS_WARNING': {
        toast.warning('Suscripción próxima a vencer', {
          description:
            (lastEvent.payload.message as string) ??
            'Quedan pocos días para tu renovación.',
          duration: 5000,
        });
        break;
      }
      case 'DRIVER_STATUS': {
        const status = String(lastEvent.payload.status ?? '').toLowerCase();
        if (status === 'offline' || status === 'locked') {
          toast.error('Sesión bloqueada', {
            description: (lastEvent.payload.message as string) ?? 'Contacta a soporte.',
            duration: 7000,
          });
        }
        break;
      }
      default:
        break;
    }
  }, [lastEvent]);

  return null;
}