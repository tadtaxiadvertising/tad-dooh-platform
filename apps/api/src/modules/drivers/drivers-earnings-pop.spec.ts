import { DriversService } from "./drivers.service";
import { BUSINESS_RULES } from "../../common/constants/business-rules";

describe("Driver earnings require verified completed Proof-of-Play", () => {
  const sampleEvents = [
    { videoId: "VIDEO-START-ONLY", eventType: "START", verified: true },
    { videoId: "VIDEO-ERROR-ONLY", eventType: "ERROR", verified: true },
    {
      videoId: "VIDEO-UNVERIFIED-END",
      eventType: "play_confirm",
      verified: false,
    },
    { videoId: "VIDEO-COMPLETED", eventType: "play_confirm", verified: true },
    { videoId: "VIDEO-COMPLETED", eventType: "play_confirm", verified: true },
  ];

  function setup() {
    const findMany = jest.fn(
      async ({
        where,
      }: {
        where: { verified?: boolean; eventType?: string };
      }) => {
        const filtered = sampleEvents.filter(
          (item) =>
            item.verified === where.verified &&
            item.eventType === where.eventType,
        );
        return Array.from(
          new Set(filtered.map((item) => item.videoId)),
          (videoId) => ({ videoId }),
        );
      },
    );
    const count = jest.fn().mockResolvedValue(1); // One approved referral CPA.
    const applyPenaltyLogic = jest.fn(
      async (_driverId: string, gross: number) => ({
        amount: gross,
        penaltyApplied: false,
        penaltyAmount: 0,
      }),
    );
    const service = new DriversService(
      { playbackEvent: { findMany }, commission: { count } } as never,
      {} as never,
      { applyPenaltyLogic } as never,
      {} as never,
    );
    return { service, findMany, count, applyPenaltyLogic };
  }

  it("excludes authenticated START, ERROR, and unverified END from driver payout", async () => {
    const { service, findMany, applyPenaltyLogic } = setup();
    const payout = await service.calculateMonthlyEarnings("driver-1");
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          verified: true,
          eventType: "play_confirm",
          device: { driverId: "driver-1" },
        }),
        distinct: ["videoId"],
      }),
    );
    expect(payout.playedCampaigns).toBe(1);
    expect(payout.baseEarningsRD).toBe(
      BUSINESS_RULES.DRIVER_RATE_PER_CAMPAIGN_RD,
    );
    expect(payout.confirmedSales).toBe(1);
    expect(payout.cpaEarningsRD).toBe(
      BUSINESS_RULES.DRIVER_RATE_PER_CAMPAIGN_RD,
    );
    expect(applyPenaltyLogic).toHaveBeenCalledWith(
      "driver-1",
      2 * BUSINESS_RULES.DRIVER_RATE_PER_CAMPAIGN_RD,
    );
  });

  it("preserves cap and never credits start-only plays", async () => {
    const { service, findMany, count } = setup();
    findMany.mockImplementationOnce(
      async ({
        where,
      }: {
        where: { verified?: boolean; eventType?: string };
      }) => {
        if (where.verified !== true || where.eventType !== "play_confirm") {
          return [];
        }
        return Array.from(
          { length: BUSINESS_RULES.MAX_CAMPAIGNS_PER_DRIVER + 7 },
          (_, i) => ({ videoId: `v-${i}` }),
        );
      },
    );
    count.mockResolvedValueOnce(0);
    const payout = await service.calculateMonthlyEarnings("driver-1");
    expect(payout.cappedAds).toBe(BUSINESS_RULES.MAX_CAMPAIGNS_PER_DRIVER);
    expect(payout.baseEarningsRD).toBe(
      BUSINESS_RULES.MAX_CAMPAIGNS_PER_DRIVER *
        BUSINESS_RULES.DRIVER_RATE_PER_CAMPAIGN_RD,
    );
  });
});
