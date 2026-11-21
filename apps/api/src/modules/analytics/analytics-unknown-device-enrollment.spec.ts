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
});
