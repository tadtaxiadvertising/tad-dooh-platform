import type { Prisma } from "@prisma/client";

// Administrative mutation responses retain operational scalar fields, not
// authentication credentials. Token issuance follows its own contract.
export const deviceAdminSelect = {
  id: true,
  deviceId: true,
  name: true,
  taxiNumber: true,
  city: true,
  status: true,
  lastSync: true,
  lastHeartbeat: true,
  batteryLevel: true,
  lastLat: true,
  lastLng: true,
  isOnline: true,
  storageUsed: true,
  storageTotal: true,
  appVersion: true,
  createdAt: true,
  updatedAt: true,
  fleet: true,
  lastSeen: true,
  storageFree: true,
  lastPlayback: true,
  playerStatus: true,
  lastSyncHash: true,
  lastSyncAt: true,
  lastOnline: true,
  lastSyncSuccess: true,
  driverId: true,
  isSimulated: true,
  connectivityStatus: true,
} as const satisfies Prisma.DeviceSelect;

export const deviceAdminDriverSelect = {
  id: true,
  fullName: true,
  phone: true,
  cedula: true,
  licensePlate: true,
  taxiPlate: true,
  subscriptionPaid: true,
  status: true,
} as const satisfies Prisma.DriverSelect;
