/**
 * GPS wire contract shared by the QR check-in mobile gateway.
 * Auth tokens are supplied by a separate verified pairing flow (#233).
 * Neither a QR hardware ID nor an offline-playback license is a credential.
 */
export interface GatewayGpsPoint {
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: string;
}

export interface GatewayDeviceCredential {
  deviceId: string;
  driverId: string;
  deviceToken: string;
}

export const GATEWAY_GPS_BATCH_LIMIT = 500;

export function buildGatewayGpsBatch(
  deviceId: string,
  credential: GatewayDeviceCredential,
  points: readonly GatewayGpsPoint[],
) {
  if (
    !deviceId ||
    credential.deviceId !== deviceId ||
    !credential.driverId?.trim() ||
    !credential.deviceToken?.trim() ||
    points.length < 1 ||
    points.length > GATEWAY_GPS_BATCH_LIMIT
  ) {
    throw new Error("GPS_DEVICE_NOT_PAIRED_OR_BATCH_INVALID");
  }

  return {
    deviceId,
    driverId: credential.driverId,
    points: points.map((point) => {
      const timestamp = Date.parse(point.timestamp);
      if (
        !Number.isFinite(timestamp) ||
        !Number.isFinite(point.latitude) ||
        Math.abs(point.latitude) > 90 ||
        !Number.isFinite(point.longitude) ||
        Math.abs(point.longitude) > 180 ||
        !Number.isFinite(point.speed)
      ) {
        throw new Error("GPS_POINT_INVALID");
      }

      return {
        lat: point.latitude,
        lng: point.longitude,
        speed: point.speed,
        timestamp,
      };
    }),
  };
}

/**
 * The API returns { input, count } after createMany commits.
 * count=0 is a valid idempotent replay if input matches the whole request.
 */
export function isCompleteGatewayGpsReceipt(
  receipt: unknown,
  expectedInput: number,
): boolean {
  if (!Number.isSafeInteger(expectedInput) || expectedInput < 1) {
    return false;
  }
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) {
    return false;
  }
  const { input, count } = receipt as Record<string, unknown>;
  return (
    typeof input === "number" &&
    Number.isSafeInteger(input) &&
    input === expectedInput &&
    typeof count === "number" &&
    Number.isSafeInteger(count) &&
    count >= 0 &&
    count <= input
  );
}

/**
 * Remove only the object instances present in the acknowledged snapshot.
 * A concurrently captured point, even with an identical timestamp, survives.
 */
export function unacknowledgedGatewayGpsPoints(
  queued: readonly GatewayGpsPoint[],
  acknowledgedSnapshot: readonly GatewayGpsPoint[],
): GatewayGpsPoint[] {
  const confirmed = new Set(acknowledgedSnapshot);
  return queued.filter((point) => !confirmed.has(point));
}
