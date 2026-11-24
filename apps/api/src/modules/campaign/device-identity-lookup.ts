import type { Prisma } from "@prisma/client";

/**
 * devices.id is physically UUID in the deployed PostgreSQL schema, whereas
 * device_id is a hardware identifier such as TAD-1234.
 *
 * Never pass an arbitrary hardware string to a UUID comparison: PostgreSQL
 * raises invalid input syntax for type uuid before the OR branch can match.
 */
export function isCanonicalUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function deviceIdentityWhere(value: string): Prisma.DeviceWhereInput {
  const canonicalUuid = isCanonicalUuid(value);

  return canonicalUuid
    ? { OR: [{ id: value }, { deviceId: value }] }
    : { deviceId: value };
}

/**
 * Resolve a batch of hardware identifiers and database UUIDs without passing
 * a hardware string through PostgreSQL's UUID-typed devices.id predicate.
 * The full input still matches hardware IDs, including UUID-looking ones.
 */
export function deviceIdentityWhereMany(
  values: readonly string[],
): Prisma.DeviceWhereInput {
  const databaseIds = values.filter(isCanonicalUuid);
  const hardwareIds = [...values];
  return databaseIds.length
    ? {
        OR: [{ id: { in: databaseIds } }, { deviceId: { in: hardwareIds } }],
      }
    : { deviceId: { in: hardwareIds } };
}
