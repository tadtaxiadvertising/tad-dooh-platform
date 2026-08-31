/**
 * @tad/types — Shared domain interfaces for the TAD DOOH platform.
 *
 * These interfaces are derived from the Prisma schema and duplicated
 * across admin/driver/advertiser apps. Import from '@tad/types' instead
 * of redefining locally.
 *
 * @see apps/api/prisma/schema.prisma
 */

// ── Advertiser ──────────────────────────────────────────────────────────────
export interface Advertiser {
  id: string;
  companyName: string;
  category: string;
  whatsapp?: string;
  instagram?: string;
  websiteUrl?: string;
  pedidosYaUrl?: string;
  uberEatsUrl?: string;
}

// ── Device ──────────────────────────────────────────────────────────────────
/** Shared identity fields present on every device representation. */
export interface DeviceBase {
  deviceId: string;
  taxiNumber: string;
  status?: string;
  city?: string;
  fleet?: string;
  driverName?: string;
}

/** Admin real-time dashboard — enriched with telemetry & location. */
export interface DeviceRealtime extends DeviceBase {
  isOnline: boolean;
  lastSeen: string;
  lastLat: number | null;
  lastLng: number | null;
  plate?: string;
  batteryLevel?: number | null;
  subscriptionStatus?: string;
  speed?: number;
  assignedAdvertiser?: string;
  assignedCampaign?: string;
  assignedCampaignId?: string;
  _lastPingAt?: string;
}

/** Driver app device selector — slot occupancy view. */
export interface DeviceSlot {
  device_id: string;
  name?: string;
  taxi_number?: string;
  taxiNumber?: string;
  status: string;
  occupied_slots: number;
  max_slots: number;
}

// ── Campaign ────────────────────────────────────────────────────────────────
export interface Campaign {
  id: string;
  name: string;
  advertiser: string;
  targetImpressions: number;
  metrics: Array<{ totalImpressions: number; deliveredImpressions: number }>;
  devices?: string[];
}

// ── Driver (minimal — full model lives in driver-flutter) ────────────────────
export interface Driver {
  id: string;
  driverName: string;
  phone?: string;
  status?: string;
  subscriptionPaid?: boolean;
  subscriptionEnd?: string;
}

// ── Auth ────────────────────────────────────────────────────────────────────
export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  user: {
    id: string;
    email: string;
    role: string;
    entityId: string | null;
  };
}

export interface Session {
  access_token: string;
  user?: {
    id: string;
    email: string;
    user_metadata?: Record<string, unknown>;
  };
}
