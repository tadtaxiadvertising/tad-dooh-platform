import { ConflictException } from "@nestjs/common";
import { assertNoDeviceHardwareUuidAlias } from "./device-identity-collision.guard";

describe("hardware UUID alias registration guard", () => {
  const uuid = "e8e7cf0a-3cc0-4c78-a7bd-d899d54ad11d";
  const findUnique = jest.fn();
  const prisma = { device: { findUnique } } as never;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("does not add a DB read for regular hardware IDs", async () => {
    await expect(
      assertNoDeviceHardwareUuidAlias(prisma, "TAD-0001"),
    ).resolves.toBeUndefined();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("checks UUID-form hardware against the UUID primary-key column", async () => {
    findUnique.mockResolvedValue(null);
    await expect(assertNoDeviceHardwareUuidAlias(prisma, uuid))
      .resolves.toBeUndefined();
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: uuid },
      select: { id: true, deviceId: true },
    });
  });

  it("rejects a hardware ID aliasing the physical UUID of another device", async () => {
    findUnique.mockResolvedValue({ id: uuid, deviceId: "TAD-ORIGINAL" });
    await expect(assertNoDeviceHardwareUuidAlias(prisma, uuid))
      .rejects.toThrow(ConflictException);
    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  it("keeps the same device identifier valid if the UUID and hardware ID match", async () => {
    findUnique.mockResolvedValue({ id: uuid, deviceId: uuid });
    await expect(assertNoDeviceHardwareUuidAlias(prisma, uuid))
      .resolves.toBeUndefined();
  });

  it("propagates DB errors rather than allowing enrollment on lookup failure", async () => {
    const unavailable = new Error("synthetic DB unavailable");
    findUnique.mockRejectedValue(unavailable);
    await expect(assertNoDeviceHardwareUuidAlias(prisma, uuid))
      .rejects.toBe(unavailable);
  });
});
