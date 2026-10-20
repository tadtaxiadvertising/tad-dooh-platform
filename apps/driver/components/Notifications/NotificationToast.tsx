"use client";

import React from "react";
import { useNotifications } from "../../contexts/NotificationContext";
import { toast } from "sonner";
import type { NotificationPriority } from "../../lib/notificationEngine";

const OFFLINE_STORAGE_KEY = "tad_driver_network_mode_v1";

function isOnline(): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  try {
    const cached = window.sessionStorage.getItem(OFFLINE_STORAGE_KEY);
    if (cached === "offline") return false;
  } catch {
    /* ignore */
  }
  return true;
}

function markOffline() {
  try {
    window.sessionStorage.setItem(OFFLINE_STORAGE_KEY, "offline");
  } catch {
    /* */
  }
}

function markOnline() {
  try {
    window.sessionStorage.removeItem(OFFLINE_STORAGE_KEY);
  } catch {
    /* */
  }
}

// ─── Priority → Toast config ──────────────────────────────────────────────────

const PRIORITY_TOAST_CONFIG: Record<
  NotificationPriority,
  {
    duration: number;
    style: "success" | "error" | "warning" | "info";
  }
> = {
  CRITICAL: { duration: 0, style: "error" }, // No auto-dismiss — manual ack
  OPERATIONAL: { duration: 5000, style: "warning" },
  INFO: { duration: 3000, style: "info" },
};

export function NotificationToast() {
  const { lastEvent } = useNotifications();
  const [online, setOnline] = React.useState(() => isOnline());

  // ─── Network Status Toasts ────────────────────────────────────────────────
  React.useEffect(() => {
    const sync = () => {
      const next = isOnline();
      setOnline((prev) => {
        if (prev !== next) {
          if (next) {
            markOnline();
            toast.success("Conexión restaurada", {
              description: "Sincronizando datos pendientes...",
              duration: 3500,
            });
          } else {
            markOffline();
            toast.error("Sin conexión", {
              description:
                "Estás en modo local. Los datos se guardan temporalmente.",
              duration: 5000,
            });
          }
        }
        return next;
      });
    };

    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  // ─── Business Notification Toasts (priority-based) ────────────────────────
  React.useEffect(() => {
    if (!lastEvent) return;

    const type = lastEvent.type;
    const config = PRIORITY_TOAST_CONFIG[resolvePriorityFromType(type)];

    switch (type) {
      case "PAYMENT_LIQUIDATED": {
        const amount = Number(lastEvent.payload.amount ?? 0);
        const formatted = Number.isFinite(amount)
          ? `RD$${amount.toLocaleString("es-DO")}`
          : "un monto";
        toast.success("Pago liquidado", {
          description: `¡Recibiste ${formatted}!`,
          duration: config.duration || 6000,
        });
        break;
      }
      case "CAMPAIGN_ASSIGNED": {
        toast.info("Nueva campaña asignada", {
          description: "Sincronizando en progreso...",
          duration: config.duration,
        });
        break;
      }
      case "SUBS_CRITICAL": {
        toast.error("Suscripción vencida", {
          description:
            (lastEvent.payload.message as string) ??
            "Regulariza tu pago para evitar el bloqueo.",
          duration: config.duration || 7000, // CRITICAL = 0 → use 7s minimum
        });
        break;
      }
      case "SUBS_WARNING": {
        toast.warning("Suscripción próxima a vencer", {
          description:
            (lastEvent.payload.message as string) ??
            "Quedan pocos días para tu renovación.",
          duration: config.duration,
        });
        break;
      }
      case "DRIVER_STATUS": {
        const status = String(lastEvent.payload.status ?? "").toLowerCase();
        if (status === "offline" || status === "locked") {
          toast.error("Sesión bloqueada", {
            description:
              (lastEvent.payload.message as string) ?? "Contacta a soporte.",
            duration: 7000,
          });
        }
        break;
      }
      case "GPS_TRACKING_STARTED": {
        toast.info("Tracking GPS activado", {
          description: "Captura de ubicación en curso (debounce 5 min).",
          duration: config.duration,
        });
        break;
      }
      case "GPS_TRACKING_STOPPED": {
        toast.info("Tracking GPS detenido", {
          duration: config.duration,
        });
        break;
      }
      case "OFFLINE_MODE": {
        toast.warning("Modo offline", {
          description: `${lastEvent.payload.pointsBuffered ?? 0} puntos guardados localmente.`,
          duration: config.duration,
        });
        break;
      }
      case "SYNC_COMPLETED": {
        toast.success("Sincronización completada", {
          description: `${lastEvent.payload.processed ?? 0} puntos procesados.`,
          duration: config.duration,
        });
        break;
      }
      case "SYNC_FAILED": {
        toast.error("Error de sincronización", {
          description: "Los datos se retendrán localmente hasta la reconexión.",
          duration: config.duration,
        });
        break;
      }
      default:
        break;
    }
  }, [lastEvent]);

  return null;
}

// ─── Helper ──────────────────────────────────────────────────────────────────

const TYPE_PRIORITY_MAP: Record<string, NotificationPriority> = {
  PAYMENT_LIQUIDATED: "OPERATIONAL",
  CAMPAIGN_ASSIGNED: "INFO",
  SUBS_WARNING: "OPERATIONAL",
  SUBS_CRITICAL: "CRITICAL",
  DRIVER_STATUS: "OPERATIONAL",
  GPS_TRACKING_STARTED: "INFO",
  GPS_TRACKING_STOPPED: "INFO",
  OFFLINE_MODE: "OPERATIONAL",
  SYNC_COMPLETED: "INFO",
  SYNC_FAILED: "OPERATIONAL",
};

function resolvePriorityFromType(type: string): NotificationPriority {
  return TYPE_PRIORITY_MAP[type] ?? "INFO";
}
