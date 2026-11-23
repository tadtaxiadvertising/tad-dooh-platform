import { BadRequestException } from "@nestjs/common";
import { AnalyticsController } from "./analytics.controller";

describe("Public analytics ingest ACK integrity", () => {
  const ingestEvent = jest.fn();
  const ingestBatchEvents = jest.fn();
  const controller = new AnalyticsController(
    { ingestEvent, ingestBatchEvents } as never,
    {} as never,
    {} as never,
    {} as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    ingestEvent.mockResolvedValue({ id: "synthetic-event" });
    ingestBatchEvents.mockResolvedValue({ count: 1 });
  });

  it.each([
    null,
    undefined,
    {},
    { events: null },
    { events: "not-an-array" },
    { events: { deviceId: "device-1", eventType: "play" } },
    42,
  ])("does not ACK a non-array batch (%p)", async (payload) => {
    await expect(
      controller.ingestBatchEvents(payload as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(ingestBatchEvents).not.toHaveBeenCalled();
  });

  it.each(
    [
      [null],
      [42],
      [{}],
      [{ deviceId: "device-1" }],
      [{ deviceId: " ", eventType: "play" }],
      [{ deviceId: "device-1", eventType: "" }],
      [{ deviceId: "device-1", type: "   " }],
      [{ deviceId: "device-1", type: 42, eventType: "play" }],
      [
        { deviceId: "device-1", eventType: "play" },
        { deviceId: "device-2" },
      ],
    ].map((events) => [events]),
  )("rejects an entire invalid batch before writing any events (%p)", async (payload) => {
    await expect(
      controller.ingestBatchEvents(payload as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(ingestBatchEvents).not.toHaveBeenCalled();
  });

  it("accepts valid raw-array offline batches without changing payloads", async () => {
    const events = [{ deviceId: "device-1", eventType: "play" }];
    await expect(controller.ingestBatchEvents(events)).resolves.toEqual({
      success: true,
    });
    expect(ingestBatchEvents).toHaveBeenCalledTimes(1);
    expect(ingestBatchEvents).toHaveBeenCalledWith(events);
  });

  it("accepts the legacy type alias and wrapped offline batches", async () => {
    const events = [{ deviceId: "device-1", type: "play_confirm" }];
    await expect(
      controller.ingestBatchEvents({ events } as never),
    ).resolves.toEqual({ success: true });
    expect(ingestBatchEvents).toHaveBeenCalledWith(events);
  });

  it("retains explicitly empty arrays as successful no-op batches", async () => {
    await expect(controller.ingestBatchEvents([])).resolves.toEqual({
      success: true,
    });
    await expect(controller.ingestBatchEvents({ events: [] })).resolves.toEqual({
      success: true,
    });
    expect(ingestBatchEvents).toHaveBeenCalledTimes(2);
    expect(ingestBatchEvents).toHaveBeenNthCalledWith(1, []);
    expect(ingestBatchEvents).toHaveBeenNthCalledWith(2, []);
  });

  it.each([null, undefined, {}, { deviceId: "device-1" }])(
    "rejects a malformed single event before DB access (%p)",
    async (payload) => {
      await expect(controller.ingestEvent(payload as never)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(ingestEvent).not.toHaveBeenCalled();
    },
  );

  it("preserves the valid single event request and response", async () => {
    const event = { deviceId: "device-1", eventType: "low_battery" };
    await expect(controller.ingestEvent(event)).resolves.toEqual({
      success: true,
    });
    expect(ingestEvent).toHaveBeenCalledWith(event);
  });
});
