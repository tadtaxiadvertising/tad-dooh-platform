/**
 * A verified device JWT is authorization for one device only.
 *
 * Apply the same identity to all user-controlled sources accepted by
 * tablet-facing routes, even when one is later preferred over another.
 * The command ACK route has a command-id path param (not a device id).
 */
export function matchesAuthenticatedDevice(
  authenticatedDeviceId: string,
  requestedDeviceIds: readonly unknown[],
): boolean {
  return requestedDeviceIds.every(
    (value) =>
      value === undefined ||
      (typeof value === "string" && value === authenticatedDeviceId),
  );
}
