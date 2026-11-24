import { Prisma } from "@prisma/client";
import { ConflictException } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { BUSINESS_RULES } from "../../common/constants/business-rules";

describe("AnalyticsService public event device enrollment", () => {
  const deviceRead = jest.fn();
  const deviceCreate = jest.fn();
  const eventCreate = jest.fn();
  const alertCreate = jest.fn();
  let service: AnalyticsService;

  beforeEach(() => {
    jest.resetAllMocks();
    deviceRead.mockResolvedValue(null);
    deviceCreate.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: "pending-device",
        ...data,
      }),
    );
    eventCreate.mockResolvedValue({ id: "event-1" });
    service = new AnalyticsService(
      {
        device: { findUnique: deviceRead, create: deviceCreate },
        analyticsEvent: { create: eventCreate },
      } as never,
      { createAlert: alertCreate } as never,
    );
  });

  it("rejects unknown hardware matching another device UUID", async () => {
    const alias = "e8e7cf0a-3cc0-4c78-a7bd-d899d54ad11d";
    deviceRead.mockImplementation(async ({ where }: { where: Record<string, string> }) =>
      "id" in where ? { id: alias, deviceId: "TAD-OTHER" } : null,
    );

    await expect(
      service.ingestEvent({ deviceId: alias, eventType: "playback" }),
    ).rejects.toThrow(ConflictException);
    expect(deviceCreate).not.toHaveBeenCalled();
    expect(eventCreate).not.toHaveBeenCalled();
  });

  it("records the event but does not approve an unknown device", async () => {
    await expect(
      service.ingestEvent({ deviceId: "UNKNOWN-HW", eventType: "playback" }),
    ).resolves.toEqual({ id: "event-1" });

    expect(deviceRead).toHaveBeenCalledWith({
      where: { deviceId: "UNKNOWN-HW" },
    });
    expect(deviceCreate).toHaveBeenCalledWith({
      data: {
        deviceId: "UNKNOWN-HW",
        status: BUSINESS_RULES.STATUS.DEVICE.INITIAL,
        lastSeen: expect.any(Date),
      },
    });
    expect(eventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        deviceId: "UNKNOWN-HW",
        eventType: "playback",
        processed: false,
      }),
    });
    expect(deviceCreate.mock.calls[0][0].data.status).not.toBe(
      BUSINESS_RULES.STATUS.DEVICE.ACTIVE,
    );
  });

  it("does not alter the status or ownership of a known approved device", async () => {
    deviceRead.mockResolvedValueOnce({
      id: "device-1",
      deviceId: "KNOWN-HW",
      status: BUSINESS_RULES.STATUS.DEVICE.ACTIVE,
      driverId: "driver-legitimate",
    });

    await service.ingestEvent({ deviceId: "KNOWN-HW", eventType: "playback" });
    expect(deviceCreate).not.toHaveBeenCalled();
    expect(eventCreate).toHaveBeenCalledTimes(1);
  });

  it("does not register an unknown device a second time for repeated events", async () => {
    await service.ingestEvent({
      deviceId: "UNKNOWN-HW",
      eventType: "playback",
    });
    await service.ingestEvent({
      deviceId: "UNKNOWN-HW",
      eventType: "playback",
    });

    expect(deviceRead).toHaveBeenCalledTimes(1);
    expect(deviceCreate).toHaveBeenCalledTimes(1);
    expect(eventCreate).toHaveBeenCalledTimes(2);
  });

  it("preserves both concurrent first events when unique enrollment races", async () => {
    const deviceId = "CONCURRENT-HW";
    const reconciledDevice = {
      id: "existing-device",
      deviceId,
      status: BUSINESS_RULES.STATUS.DEVICE.INITIAL,
      driverId: null,
    };
    const duplicate = new Prisma.PrismaClientKnownRequestError(
      "Synthetic deviceId unique conflict",
      { code: "P2002", clientVersion: "7.10.1" },
    );
    deviceRead
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(reconciledDevice);
    deviceCreate
      .mockResolvedValueOnce(reconciledDevice)
      .mockRejectedValueOnce(duplicate);

    const results = await Promise.all([
      service.ingestEvent({ deviceId, eventType: "playback" }),
      service.ingestEvent({ deviceId, eventType: "playback" }),
    ]);

    expect(results).toEqual([{ id: "event-1" }, { id: "event-1" }]);
    expect(deviceRead).toHaveBeenCalledTimes(3);
    expect(deviceCreate).toHaveBeenCalledTimes(2);
    expect(deviceCreate).toHaveBeenCalledWith({
      data: {
        deviceId,
        status: BUSINESS_RULES.STATUS.DEVICE.INITIAL,
        lastSeen: expect.any(Date),
      },
    });
    expect(eventCreate).toHaveBeenCalledTimes(2);
    expect(eventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ deviceId, processed: false }),
    });
  });

  it("fails closed on a duplicate if no existing device can be confirmed", async () => {
    const duplicate = new Prisma.PrismaClientKnownRequestError(
      "Synthetic unresolved unique conflict",
      { code: "P2002", clientVersion: "7.10.1" },
    );
    deviceCreate.mockRejectedValueOnce(duplicate);
    await expect(
      service.ingestEvent({ deviceId: "MISSING-HW", eventType: "playback" }),
    ).rejects.toBe(duplicate);
    expect(deviceRead).toHaveBeenCalledTimes(2);
    expect(eventCreate).not.toHaveBeenCalled();

    await expect(
      service.ingestEvent({ deviceId: "MISSING-HW", eventType: "playback" }),
    ).resolves.toEqual({ id: "event-1" });
    expect(deviceRead).toHaveBeenCalledTimes(3);
    expect(deviceCreate).toHaveBeenCalledTimes(2);
    expect(eventCreate).toHaveBeenCalledTimes(1);
  });

  it("does not swallow unrelated device creation failures", async () => {
    const failure = new Error("Synthetic database timeout");
    deviceCreate.mockRejectedValueOnce(failure);

    await expect(
      service.ingestEvent({ deviceId: "RETRY-HW", eventType: "playback" }),
    ).rejects.toBe(failure);
    expect(deviceRead).toHaveBeenCalledTimes(1);
    expect(eventCreate).not.toHaveBeenCalled();
    await expect(
      service.ingestEvent({ deviceId: "RETRY-HW", eventType: "playback" }),
    ).resolves.toEqual({ id: "event-1" });
    expect(deviceCreate).toHaveBeenCalledTimes(2);
  });
});
