import { AnalyticsService } from "./analytics.service";

describe("AnalyticsService impression verification breakdown", () => {
  const groupBy = jest.fn();
  const count = jest.fn();
  const scansCount = jest.fn();
  const videoRead = jest.fn();
  const mediaRead = jest.fn();

  const makeService = () =>
    new AnalyticsService(
      {
        playbackEvent: { groupBy, count },
        analyticsEvent: { count: scansCount },
        video: { findMany: videoRead },
        mediaAsset: { findMany: mediaRead },
      } as never,
      {} as never,
    );

  beforeEach(() => {
    jest.resetAllMocks();
    videoRead.mockResolvedValue([]);
    mediaRead.mockResolvedValue([]);
    scansCount.mockResolvedValue(3);
    count.mockResolvedValue(6);
    groupBy.mockImplementation(async ({ by }: { by: string[] }) =>
      by[0] === "verified"
        ? [
            { verified: false, _count: { _all: 5 } },
            { verified: true, _count: { _all: 7 } },
          ]
        : [{ deviceId: "device-1" }, { deviceId: "device-2" }],
    );
  });

  it("separates unverified public events without changing legacy totals and CTR", async () => {
    const result = await makeService().getAnalyticsSummary();
    expect(result).toMatchObject({
      totalImpressions: 12,
      verifiedImpressions: 7,
      unverifiedImpressions: 5,
      impressionMetricBasis: "raw",
      activeNodes: 2,
      totalScans: 3,
      ctr: 25,
      hourlyAverage: 0,
    });
    expect(groupBy).toHaveBeenCalledWith({
      by: ["verified"],
      where: { eventType: "play_confirm" },
      _count: { _all: true },
    });
    // Four existing queries remain; aggregation replaces only the total count.
    expect(groupBy).toHaveBeenCalledTimes(2);
    expect(count).toHaveBeenCalledTimes(1);
    expect(scansCount).toHaveBeenCalledTimes(1);
  });

  it("scopes both verification buckets to the authenticated advertiser's media", async () => {
    videoRead.mockResolvedValueOnce([{ id: "video-owned" }]);
    mediaRead.mockResolvedValueOnce([{ id: "asset-owned" }]);

    const result = await makeService().getAnalyticsSummary("advertiser-1");
    expect(result.verifiedImpressions).toBe(7);
    expect(result.unverifiedImpressions).toBe(5);
    expect(groupBy).toHaveBeenCalledWith({
      by: ["verified"],
      where: {
        eventType: "play_confirm",
        videoId: { in: ["video-owned", "asset-owned"] },
      },
      _count: { _all: true },
    });
    expect(videoRead).toHaveBeenCalledWith({
      where: { campaign: { advertiserId: "advertiser-1" } },
      select: { id: true },
    });
    expect(mediaRead).toHaveBeenCalledWith({
      where: { campaign: { advertiserId: "advertiser-1" } },
      select: { id: true },
    });
  });

  it("keeps 0 as the empty verified or unverified bucket, without negative counts", async () => {
    groupBy.mockImplementation(async ({ by }: { by: string[] }) =>
      by[0] === "verified" ? [{ verified: false, _count: { _all: 3 } }] : [],
    );
    const result = await makeService().getAnalyticsSummary();
    expect(result).toMatchObject({
      totalImpressions: 3,
      verifiedImpressions: 0,
      unverifiedImpressions: 3,
      activeNodes: 0,
    });
  });

  it("retains the existing 30-second summary cache for repeat reads", async () => {
    const service = makeService();
    await service.getAnalyticsSummary();
    await service.getAnalyticsSummary();
    expect(groupBy).toHaveBeenCalledTimes(2);
    expect(count).toHaveBeenCalledTimes(1);
  });
});
