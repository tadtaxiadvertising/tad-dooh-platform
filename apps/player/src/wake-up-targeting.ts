/**
 * Supabase Realtime broadcasts wrap application data as {type,event,payload}.
 * Accept legacy flat data for compatibility, but never interpret malformed or
 * empty explicit target lists as a global wake-up.
 * This filter reduces needless sync; it is NOT an authorization control.
 */
export function isWakeUpForDevice(message: unknown, deviceId: string): boolean {
  if (
    !deviceId.trim() ||
    !message ||
    typeof message !== "object" ||
    Array.isArray(message)
  ) {
    return false;
  }

  const envelope = message as Record<string, unknown>;
  if (envelope.type !== undefined && envelope.type !== "broadcast")
    return false;
  if (envelope.event !== undefined && envelope.event !== "WAKE_UP_CALL")
    return false;

  const data = Object.hasOwn(envelope, "payload") ? envelope.payload : envelope;
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const targets = (data as Record<string, unknown>).targets;

  if (targets === undefined) {
    // Known global events from the API include a meaningful reason or command.
    // An empty/malformed message must never cause a fleet-wide sync storm.
    const reason = (data as Record<string, unknown>).reason;
    const command = (data as Record<string, unknown>).command;
    return (
      (typeof reason === "string" && reason.trim().length > 0) ||
      (typeof command === "string" && command.trim().length > 0)
    );
  }
  return (
    Array.isArray(targets) &&
    targets.length > 0 &&
    targets.every(
      (target) => typeof target === "string" && target.trim().length > 0,
    ) &&
    targets.includes(deviceId)
  );
}
