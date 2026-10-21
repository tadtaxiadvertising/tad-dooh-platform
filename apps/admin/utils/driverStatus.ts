import {
  differenceInHours,
  differenceInMinutes,
  differenceInDays,
  isValid,
} from "date-fns";

export type DriverConnectionStatus =
  | "online"
  | "recent_offline"
  | "long_offline";

export interface DriverStatusInfo {
  status: DriverConnectionStatus;
  color: string; // hex color for markers/UI
  label: string; // human-readable status label
  description: string; // descriptive text (e.g. "Desconectado hace 5h")
  cssClass: string; // tailwind color class for text
  bgClass: string; // tailwind bg class for badges
  borderClass: string; // tailwind border class
  shadowColor: string; // for marker glow effects
}

const THRESHOLD_HOURS = 24;

const STATUS_MAP: Record<DriverConnectionStatus, DriverStatusInfo> = {
  online: {
    status: "online",
    color: "#22c55e",
    label: "En línea",
    description: "Activo ahora",
    cssClass: "text-emerald-500",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/30",
    shadowColor: "#10b981",
  },
  recent_offline: {
    status: "recent_offline",
    color: "#eab308",
    label: "Desconectado",
    description: "Desconectado <24h",
    cssClass: "text-yellow-500",
    bgClass: "bg-yellow-500/10",
    borderClass: "border-yellow-500/30",
    shadowColor: "#eab308",
  },
  long_offline: {
    status: "long_offline",
    color: "#dc2626",
    label: "Inactivo",
    description: "Desconectado >24h",
    cssClass: "text-red-600",
    bgClass: "bg-red-600/10",
    borderClass: "border-red-600/30",
    shadowColor: "#dc2626",
  },
};

/**
 * Determines driver connection status based on isOnline flag and lastSeen timestamp.
 * - Online (Green): isOnline === true
 * - Recent Offline (Yellow): !isOnline && lastSeen within 24 hours
 * - Long Offline (Red): !isOnline && lastSeen > 24 hours ago OR no lastSeen
 */
export function getDriverStatusInfo(
  isOnline: boolean,
  lastSeen?: string | null,
): DriverStatusInfo {
  if (isOnline) {
    return { ...STATUS_MAP.online, description: "Activo ahora" };
  }

  if (!lastSeen) {
    return {
      ...STATUS_MAP.long_offline,
      description: "Sin registro de actividad",
    };
  }

  const lastSeenDate = new Date(lastSeen);
  if (!isValid(lastSeenDate)) {
    return { ...STATUS_MAP.long_offline, description: "Fecha inválida" };
  }

  const hoursSince = differenceInHours(Date.now(), lastSeenDate);

  if (hoursSince < THRESHOLD_HOURS) {
    const desc = formatTimeSince(lastSeenDate);
    return {
      ...STATUS_MAP.recent_offline,
      description: `Desconectado ${desc}`,
    };
  }

  const desc = formatTimeSince(lastSeenDate);
  return { ...STATUS_MAP.long_offline, description: `Desconectado ${desc}` };
}

/**
 * Formats the time difference between a past date and now into a human-readable string.
 * Examples: "5m", "3h", "2d"
 */
export function formatTimeSince(date: Date): string {
  const now = Date.now();
  const minutes = differenceInMinutes(now, date);
  const hours = differenceInHours(now, date);
  const days = differenceInDays(now, date);

  if (minutes < 1) return "ahora";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

/**
 * Returns a short status label for compact UI elements.
 */
export function getDriverStatusLabel(
  isOnline: boolean,
  lastSeen?: string | null,
): string {
  const info = getDriverStatusInfo(isOnline, lastSeen);
  if (info.status === "online") return "En línea";
  if (info.status === "recent_offline") {
    const hours = lastSeen
      ? differenceInHours(Date.now(), new Date(lastSeen))
      : 0;
    const mins = lastSeen
      ? differenceInMinutes(Date.now(), new Date(lastSeen))
      : 0;
    if (mins < 60) return `Off ${mins}m`;
    return `Off ${hours}h`;
  }
  const days = lastSeen ? differenceInDays(Date.now(), new Date(lastSeen)) : 0;
  return `Off ${days}d+`;
}
