import type { Prisma } from "@prisma/client";

/**
 * devices.id is physically UUID in the deployed PostgreSQL schema, whereas
 * device_id is a hardware identifier such as TAD-1234.
 *
 * Never pass an arbitrary hardware string to a UUID comparison: PostgreSQL
 * raises invalid input syntax for type uuid before the OR branch can match.
 */
export function deviceIdentityWhere(value: string): Prisma.DeviceWhereInput {
  const canonicalUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    );

  return canonicalUuid
    ? { OR: [{ id: value }, { deviceId: value }] }
    : { deviceId: value };
}
