import { HttpStatus } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { FleetService } from "./fleet.service";
import { GPS_TRACK_BATCH_LIMIT, TrackBatchDto } from "./dto/track-batch.dto";
import { BUSINESS_RULES } from "../../common/constants/business-rules";

describe("Fleet public GPS ingestion — admin device-driver binding", () => {
  const deviceFindUnique = jest.fn();
  const driverFindUnique = jest.fn();
  const createMany = jest.fn();
  const deviceUpdate = jest.fn();
  const prisma = {
    device: { findUnique: deviceFindUnique, update: deviceUpdate },
    driver: { findUnique: driverFindUnique },
    driverLocation: { createMany },
  };
  const service = new FleetService(prisma as never, {} as never, {} as never);
  const point = {
    lat: 19.45,
    lng: -70.7,
    speed: 20,
    timestamp: Date.UTC(2026, 10, 19, 18, 0, 0),
  };
  const deviceUuid = "9c783afa-605f-4688-932a-46883711ba04";
  const request = {
    driverId: "driver-legitimate",
    deviceId: "TAD-TABLET-1",
    points: [point],
  };

  beforeEach(() => {
    jest.resetAllMocks();
    deviceFindUnique.mockResolvedValue({
      id: deviceUuid,
      deviceId: "TAD-TABLET-1",
      status: BUSINESS_RULES.STATUS.DEVICE.ACTIVE,
      driverId: "driver-legitimate",
    });
    driverFindUnique.mockResolvedValue({
      id: "driver-legitimate",
      status: BUSINESS_RULES.STATUS.DRIVER.ACTIVE,
      subscriptionPaid: true,
      fullName: "Synthetic Driver",
    });
    createMany.mockResolvedValue({ count: 1 });
    deviceUpdate.mockResolvedValue({});
  });

  it("rejects a forged driverId for an already-assigned tablet before GPS writes", async () => {
    await expect(
      service.ingestTelemetryBatch({
        ...request,
        driverId: "driver-other",
      }),
    ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
    expect(driverFindUnique).not.toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
    expect(deviceUpdate).not.toHaveBeenCalled();
  });

  it("rejects unassigned hardware rather than trusting a caller-chosen driver", async () => {
    deviceFindUnique.mockResolvedValueOnce({
      id: "unassigned",
      deviceId: "TAD-TABLET-1",
      status: BUSINESS_RULES.STATUS.DEVICE.ACTIVE,
      driverId: null,
    });
    await expect(service.ingestTelemetryBatch(request)).rejects.toMatchObject({
      status: HttpStatus.FORBIDDEN,
    });
    expect(driverFindUnique).not.toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
  });

  it("uses the database-linked driver for valid GPS points and preserves the ACK", async () => {
    await expect(service.ingestTelemetryBatch(request)).resolves.toEqual({
      count: 1,
      input: 1,
    });
    expect(driverFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "driver-legitimate" } }),
    );
    expect(createMany).toHaveBeenCalledWith({
      data: [
        {
          driverId: "driver-legitimate",
          deviceId: deviceUuid,
          latitude: 19.45,
          longitude: -70.7,
          speed: 20,
          timestamp: new Date(point.timestamp),
        },
      ],
      skipDuplicates: true,
    });
  });

  it("does not acknowledge GPS events if persistence fails, so offline retries remain possible", async () => {
    const persistenceError = new Error("GPS_INSERT_REJECTED");
    createMany.mockRejectedValueOnce(persistenceError);

    await expect(service.ingestTelemetryBatch(request)).rejects.toBe(
      persistenceError,
    );
    expect(createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
    expect(deviceUpdate).not.toHaveBeenCalled();
  });

  it("acknowledges duplicate GPS points without rewriting their timestamps", async () => {
    createMany.mockResolvedValueOnce({ count: 0 });

    await expect(service.ingestTelemetryBatch(request)).resolves.toEqual({
      count: 0,
      input: 1,
    });
    expect(createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            deviceId: deviceUuid,
            timestamp: new Date(point.timestamp),
          }),
        ],
        skipDuplicates: true,
      }),
    );
  });

  it("retains the existing subscription 402 kill-switch", async () => {
    driverFindUnique.mockResolvedValueOnce({
      id: "driver-legitimate",
      status: BUSINESS_RULES.STATUS.DRIVER.ACTIVE,
      subscriptionPaid: false,
      fullName: "Synthetic Driver",
    });
    await expect(service.ingestTelemetryBatch(request)).rejects.toMatchObject({
      status: HttpStatus.PAYMENT_REQUIRED,
    });
    expect(createMany).not.toHaveBeenCalled();
  });

  it("rejects oversized uploads even when invoked outside DTO validation", async () => {
    await expect(
      service.ingestTelemetryBatch({
        ...request,
        points: Array.from({ length: GPS_TRACK_BATCH_LIMIT + 1 }, () => point),
      }),
    ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    expect(deviceFindUnique).not.toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
  });

  it("rejects out-of-range coordinate values with nested DTO validation", async () => {
    const dto = plainToInstance(TrackBatchDto, {
      ...request,
      points: [{ ...point, lat: 95, lng: -190 }],
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === "points")).toBe(true);
  });

  it("validates the maximum batch size at the DTO boundary", async () => {
    const dto = plainToInstance(TrackBatchDto, {
      ...request,
      points: Array.from({ length: GPS_TRACK_BATCH_LIMIT + 1 }, () => point),
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === "points")).toBe(true);
  });
});
