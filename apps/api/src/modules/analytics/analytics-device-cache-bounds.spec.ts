import { AnalyticsService } from "./analytics.service";

describe("AnalyticsService bounded public device-existence cache", () => {
  const findUnique = jest.fn();
  const createDevice = jest.fn();
  const createEvent = jest.fn();
  let service: AnalyticsService;

  beforeEach(() => {
    jest.clearAllMocks();
    findUnique.mockImplementation(
      async ({ where }: { where: { deviceId: string } }) => ({
        deviceId: where.deviceId,
      }),
    );
    createDevice.mockResolvedValue({ id: "unexpected-create" });
    createEvent.mockResolvedValue({ id: "event-1" });
    service = new AnalyticsService(
      {
        device: { findUnique, create: createDevice },
        analyticsEvent: { create: createEvent },
      } as never,
      {} as never,
    );
  });

  const report = (deviceId: string) =>
    service.ingestEvent({ deviceId, eventType: "playback" });

  it("bounds unique IDs, retains active tablets and reloads an evicted ID", async () => {
    // Populate precisely the maximum fleet cache size using valid events.
    for (let index = 0; index < 10_000; index++) {
      await report(`HW-${index}`);
    }
    expect(findUnique).toHaveBeenCalledTimes(10_000);

    // Refreshing HW-0 makes HW-1 the least recently used entry.
    await report("HW-0");
    expect(findUnique).toHaveBeenCalledTimes(10_000);
    await report("HW-10000");
    expect(findUnique).toHaveBeenCalledTimes(10_001);

    await report("HW-0");
    expect(findUnique).toHaveBeenCalledTimes(10_001);
    await report("HW-1");
    expect(findUnique).toHaveBeenCalledTimes(10_002);
    expect(createDevice).not.toHaveBeenCalled();
    expect(createEvent).toHaveBeenCalledTimes(10_004);

    const cache = Reflect.get(service, "deviceExistsCache") as Set<string>;
    expect(cache.size).toBe(10_000);
    expect(cache.has("HW-0")).toBe(true);
  });

  it("does not cache oversized untrusted identifiers, but preserves telemetry", async () => {
    const longId = "X".repeat(129);
    await report(longId);
    await report(longId);

    expect(findUnique).toHaveBeenCalledTimes(2);
    expect(createEvent).toHaveBeenCalledTimes(2);
    expect(createDevice).not.toHaveBeenCalled();
    const cache = Reflect.get(service, "deviceExistsCache") as Set<string>;
    expect(cache.size).toBe(0);
  });

  it("does not cache failed device lookups", async () => {
    findUnique.mockRejectedValueOnce(new Error("synthetic database failure"));
    await expect(report("HW-retry")).rejects.toThrow(
      "synthetic database failure",
    );
    expect(createEvent).not.toHaveBeenCalled();

    await expect(report("HW-retry")).resolves.toEqual({ id: "event-1" });
    expect(findUnique).toHaveBeenCalledTimes(2);
    expect(createEvent).toHaveBeenCalledTimes(1);
    expect(createDevice).not.toHaveBeenCalled();
  });

  it("clears cached IDs using the existing service invalidation path", async () => {
    await report("HW-clear");
    service.clearCache();
    await report("HW-clear");

    expect(findUnique).toHaveBeenCalledTimes(2);
    expect(createEvent).toHaveBeenCalledTimes(2);
  });
});
