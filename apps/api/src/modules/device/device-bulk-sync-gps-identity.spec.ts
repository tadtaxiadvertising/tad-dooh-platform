import { DeviceService } from "./device.service";
import { BUSINESS_RULES } from "../../common/constants/business-rules";
import type { BulkSyncDto } from "./dto/bulk-sync.dto";

describe("DeviceService.processBulkSync GPS queue integrity", () => {
  const deviceUuid = "9c783afa-605f-4688-932a-46883711ba04";
  const dto: BulkSyncDto = {
    device_id: "TAD-1111",
    playbacks: [],
    locations: [
      {
        lat: 19.45,
        lng: -70.69,
        timestamp: "2026-11-20T18:00:00Z",
      },
    ],
  };
  const findUnique = jest.fn();
  const deviceUpdate = jest.fn();
  const locationsCreateMany = jest.fn();
  const heartbeatCreate = jest.fn();
  const playbackCreateMany = jest.fn();
  const prisma = {
    device: { findUnique, update: deviceUpdate },
    driverLocation: { createMany: locationsCreateMany },
    deviceHeartbeat: { create: heartbeatCreate },
    playbackEvent: { createMany: playbackCreateMany },
  };
  let service: DeviceService;

  beforeEach(() => {
    process.env.JWT_SECRET = "bulk-sync-test-secret-not-for-production";
    jest.resetAllMocks();
    findUnique.mockResolvedValue({
      id: deviceUuid,
      deviceId: "TAD-1111",
      driverId: "driver-bound",
      status: BUSINESS_RULES.STATUS.DEVICE.ACTIVE,
      batteryLevel: 90,
      storageFree: "100 GB",
    });
    deviceUpdate.mockResolvedValue({});
    locationsCreateMany.mockResolvedValue({ count: 1 });
    heartbeatCreate.mockResolvedValue({});
    service = new DeviceService(prisma as never, {} as never, {} as never);
  });

  it("persists GPS points using canonical device UUID and preserves timestamps", async () => {
    await expect(service.processBulkSync(dto)).resolves.toEqual({
      success: true,
      processedPlaybacks: 0,
      processedLocations: 1,
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { deviceId: "TAD-1111" },
    });
    expect(locationsCreateMany).toHaveBeenCalledWith({
      data: [
        {
          deviceId: deviceUuid,
          driverId: "driver-bound",
          latitude: 19.45,
          longitude: -70.69,
          timestamp: new Date("2026-11-20T18:00:00Z"),
          isSimulated: false,
        },
      ],
      skipDuplicates: true,
    });
  });

  it("does not ACK unassigned offline GPS or mutate device state", async () => {
    findUnique.mockResolvedValueOnce({
      id: deviceUuid,
      deviceId: "TAD-1111",
      driverId: null,
      status: BUSINESS_RULES.STATUS.DEVICE.ACTIVE,
    });
    await expect(service.processBulkSync(dto)).resolves.toEqual({
      success: false,
      reason: "device_unassigned",
    });
    expect(deviceUpdate).not.toHaveBeenCalled();
    expect(locationsCreateMany).not.toHaveBeenCalled();
    expect(heartbeatCreate).not.toHaveBeenCalled();
  });

  it("does not report success when GPS persistence rejects", async () => {
    const error = new Error("GPS_INSERT_FAILURE");
    locationsCreateMany.mockRejectedValueOnce(error);
    await expect(service.processBulkSync(dto)).rejects.toBe(error);
    expect(heartbeatCreate).not.toHaveBeenCalled();
  });

  it("preserves heartbeat-only sync when a device has no driver", async () => {
    findUnique.mockResolvedValueOnce({
      id: deviceUuid,
      deviceId: "TAD-1111",
      driverId: null,
      status: BUSINESS_RULES.STATUS.DEVICE.ACTIVE,
    });
    await expect(
      service.processBulkSync({ ...dto, locations: [] }),
    ).resolves.toEqual({
      success: true,
      processedPlaybacks: 0,
      processedLocations: 0,
    });
    expect(heartbeatCreate).toHaveBeenCalled();
    expect(locationsCreateMany).not.toHaveBeenCalled();
  });
});
