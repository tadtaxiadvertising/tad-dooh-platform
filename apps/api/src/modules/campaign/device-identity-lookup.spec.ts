import {
  deviceIdentityWhere,
  deviceIdentityWhereMany,
} from "./device-identity-lookup";

describe("deviceIdentityWhere", () => {
  it("uses only device_id for a TAD hardware identifier", () => {
    expect(deviceIdentityWhere("TAD-0001")).toEqual({
      deviceId: "TAD-0001",
    });
    expect(deviceIdentityWhere("tablet:loc-01")).toEqual({
      deviceId: "tablet:loc-01",
    });
  });

  it("supports database UUID and UUID-looking hardware IDs", () => {
    const id = "9c783afa-605f-4688-932a-46883711ba04";
    expect(deviceIdentityWhere(id)).toEqual({
      OR: [{ id }, { deviceId: id }],
    });
  });

  it("rejects malformed UUID-form strings from the UUID predicate", () => {
    const value = "9c783afa-605f-BAD-932a-46883711ba04";
    expect(deviceIdentityWhere(value)).toEqual({ deviceId: value });
  });
});

describe("deviceIdentityWhereMany", () => {
  const dbUuid = "9c783afa-605f-4688-932a-46883711ba04";

  it("never casts hardware-only identifiers through the UUID column", () => {
    expect(deviceIdentityWhereMany(["TAD-0001", "tablet:loc-01"])).toEqual({
      deviceId: { in: ["TAD-0001", "tablet:loc-01"] },
    });
  });

  it("allows valid UUID IDs and preserves hardware matches", () => {
    const ids = ["TAD-0001", dbUuid, "TAD-0002"];
    expect(deviceIdentityWhereMany(ids)).toEqual({
      OR: [{ id: { in: [dbUuid] } }, { deviceId: { in: ids } }],
    });
  });

  it("handles no devices and malformed UUID-like IDs safely", () => {
    expect(deviceIdentityWhereMany([])).toEqual({
      deviceId: { in: [] },
    });
    const invalidUuid = "9c783afa-GAD0-4688-932a-46883711ba04";
    expect(deviceIdentityWhereMany([invalidUuid])).toEqual({
      deviceId: { in: [invalidUuid] },
    });
  });
});
