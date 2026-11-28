import { createHash } from "node:crypto";
import { CampaignService } from "./campaign.service";

describe("Player advertiser projection compatibility", () => {
  it.each([false, true])(
    "preserves the manifest on the primary and fallback query (fallback=%s)",
    async (fallback) => {
      const updatedAt = new Date("2026-11-27T12:00:00Z");
      const campaign = {
        id: "campaign-fixture",
        name: "Fixture campaign",
        advertiser: "Legacy label",
        advertiserId: "advertiser-fixture",
        advertiserRef: {
          id: "advertiser-fixture",
          companyName: "Fixture company",
        },
        active: true,
        targetAll: true,
        startDate: new Date("2026-11-01T00:00:00Z"),
        endDate: new Date("2026-12-31T00:00:00Z"),
        updatedAt,
        mediaAssets: [
          {
            id: "media-fixture",
            filename: "fixture.mp4",
            url: "https://media.example.invalid/fixture.mp4",
            checksum: "fixture-checksum",
            duration: 30,
          },
        ],
        media: [],
        videos: [],
      };
      const findMany = jest.fn().mockResolvedValue([campaign]);
      const queryRaw = jest.fn();
      if (fallback) queryRaw.mockRejectedValue(new Error("fixture view down"));
      else queryRaw.mockResolvedValue([{ campaign_id: campaign.id }]);
      const service = new CampaignService(
        {
          device: {
            findFirst: jest.fn().mockResolvedValue({
              id: "device-fixture",
              deviceId: "HW-FIXTURE",
              city: "Santiago",
              driverId: null,
            }),
          },
          campaign: { findMany },
          $queryRaw: queryRaw,
        } as never,
        {} as never,
        {} as never,
        {} as never,
      );
      const result = await service.getActiveSyncVideos("HW-FIXTURE");
      expect(findMany).toHaveBeenCalledTimes(1);
      expect(findMany.mock.calls[0][0].include.advertiserRef).toEqual({
        select: { id: true, companyName: true },
      });
      if (fallback) {
        expect(findMany.mock.calls[0][0].where).toMatchObject({
          status: "ACTIVE",
          active: true,
        });
      } else {
        expect(findMany.mock.calls[0][0].where).toEqual({
          id: { in: [campaign.id] },
        });
      }
      expect(result).toEqual({
        version: updatedAt.getTime(),
        sync_hash: createHash("md5")
          .update("media-fixture:fixture-checksum")
          .digest("hex"),
        media_assets: [
          {
            id: "media-fixture",
            campaignId: campaign.id,
            filename: "fixture.mp4",
            url: "https://media.example.invalid/fixture.mp4",
            checksum: "fixture-checksum",
            hashMd5: "fixture-checksum",
            duration: 30,
            qrUrl: null,
            advertiserId: "advertiser-fixture",
            advertiserName: "Fixture company",
            weight: null,
          },
        ],
      });
    },
  );
});
