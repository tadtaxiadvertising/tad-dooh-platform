import { DeviceService } from "./device.service";
import { ConflictException } from "@nestjs/common";
import { BUSINESS_RULES } from "../../common/constants/business-rules";

// The constructor requires JWT_SECRET even though registration neither signs
// nor verifies tokens. No real environment secrets are needed for this test.
jest.mock("../../utils/env.util", () => ({
  requireEnv: jest.fn(() => "synthetic-unit-test-only"),
}));

describe("DeviceService public registration ownership isolation", () => {
  const findUnique = jest.fn();
  const update = jest.fn();
  const create = jest.fn();
  const service = new DeviceService(
    { device: { findUnique, update, create } } as never,
    {} as never,
    {} as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("refreshes an existing tablet without replacing its authenticated admin-assigned driver", async () => {
    const stored = {
      id: "device-1",
      deviceId: "TAD-HARDWARE-1",
      driverId: "legitimate-driver",
      status: BUSINESS_RULES.STATUS.DEVICE.ACTIVE,
    };
    findUnique.mockResolvedValue(stored);
    update.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...stored,
        ...data,
      }),
    );

    const result = await service.registerDevice({
      device_id: "TAD-HARDWARE-1",
      app_version: "1.2.0",
      driver_id: "attacker-chosen-driver",
    });

    expect(findUnique).toHaveBeenCalledWith({
      where: { deviceId: "TAD-HARDWARE-1" },
    });
    expect(update).toHaveBeenCalledWith({
      where: { deviceId: "TAD-HARDWARE-1" },
      data: {
        isOnline: true,
        appVersion: "1.2.0",
        lastSeen: expect.any(Date),
      },
    });
    expect(update.mock.calls[0][0].data).not.toHaveProperty("driverId");
    expect(result.driverId).toBe("legitimate-driver");
    expect(result.status).toBe(BUSINESS_RULES.STATUS.DEVICE.ACTIVE);
    expect(create).not.toHaveBeenCalled();
  });

  it("cannot claim an unassigned existing tablet using driver_id", async () => {
    const stored = {
      id: "device-2",
      deviceId: "TAD-UNASSIGNED",
      driverId: null,
    };
    findUnique.mockResolvedValue(stored);
    update.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...stored,
        ...data,
      }),
    );

    const result = await service.registerDevice({
      device_id: "TAD-UNASSIGNED",
      driver_id: "attacker-chosen-driver",
    });
    expect(result.driverId).toBeNull();
    expect(update.mock.calls[0][0].data).not.toHaveProperty("driverId");
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects public UUID-form hardware that aliases another device PK", async () => {
    const hardwareId = "e8e7cf0a-3cc0-4c78-a7bd-d899d54ad11d";
    findUnique.mockResolvedValue({
      id: hardwareId,
      deviceId: "TAD-OTHER",
    });

    await expect(
      service.registerDevice({ device_id: hardwareId }),
    ).rejects.toThrow(ConflictException);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: hardwareId },
      select: { id: true, deviceId: true },
    });
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects approval of an already-pending hardware UUID alias", async () => {
    const hardwareId = "e8e7cf0a-3cc0-4c78-a7bd-d899d54ad11d";
    findUnique.mockResolvedValue({
      id: hardwareId,
      deviceId: "TAD-OTHER",
    });
    await expect(service.approveDevice(hardwareId)).rejects.toThrow(
      ConflictException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it("does not auto-enroll a conflicting alias via unknown heartbeat", async () => {
    const hardwareId = "e8e7cf0a-3cc0-4c78-a7bd-d899d54ad11d";
    findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: hardwareId, deviceId: "TAD-OTHER" });
    await expect(
      service.deviceHeartbeat({ device_id: hardwareId }),
    ).rejects.toThrow(ConflictException);
    expect(create).not.toHaveBeenCalled();
  });

  it("creates new hardware as pending without assigning an untrusted driver", async () => {
    findUnique.mockResolvedValue(null);
    create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: "device-new",
        driverId: null,
        ...data,
      }),
    );

    const result = await service.registerDevice({
      device_id: "TAD-NEW",
      app_version: "2.0.0",
      driver_id: "attacker-chosen-driver",
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        deviceId: "TAD-NEW",
        appVersion: "2.0.0",
        status: BUSINESS_RULES.STATUS.DEVICE.INITIAL,
        lastSeen: expect.any(Date),
      },
    });
    expect(create.mock.calls[0][0].data).not.toHaveProperty("driverId");
    expect(result.driverId).toBeNull();
    expect(result.status).toBe(BUSINESS_RULES.STATUS.DEVICE.INITIAL);
    expect(update).not.toHaveBeenCalled();
  });
});
