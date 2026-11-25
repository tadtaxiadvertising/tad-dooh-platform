import { CampaignController } from "../campaign.controller";
import type { CampaignService } from "../campaign.service";
import type { PrismaService } from "../../prisma/prisma.service";
import type { MediaService } from "../../media/media.service";
import type { VideoGeneratorService } from "../video-generator.service";
import type { AuthenticatedRequest } from "../../auth/auth.types";

describe("campaign MIME response compatibility", () => {
  it.each(["video/mp4", null])(
    "preserves advertiser scope and MIME aliases for %s",
    async (mimeType) => {
      const media = { id: "media-1", mimeType };
      const campaigns = [{ id: "campaign-1", media: [media] }];
      const findMany = jest.fn().mockResolvedValue(campaigns);
      const getAllCampaigns = jest.fn();
      const controller = new CampaignController(
        { getAllCampaigns } as unknown as CampaignService,
        { campaign: { findMany } } as unknown as PrismaService,
        {} as MediaService,
        {} as VideoGeneratorService,
      );
      const response = await controller.getAllCampaigns({
        user: {
          id: "user-1",
          email: "synthetic@example.invalid",
          role: "ADVERTISER",
          entityId: "advertiser-1",
        },
      } as AuthenticatedRequest);
      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { advertiserId: "advertiser-1" } }),
      );
      const query = findMany.mock.calls[0][0];
      expect(query.include.media.select.mimeType).toBe(true);
      expect(query.include.media.select).not.toHaveProperty("mime_type");
      expect(response[0].media[0]).toEqual({ ...media, mime_type: mimeType });
      expect(media).not.toHaveProperty("mime_type");
      expect(getAllCampaigns).not.toHaveBeenCalled();
    },
  );

  it("delegates the admin listing to the service", async () => {
    const expected = [{ id: "campaign-1", media: [] }];
    const getAllCampaigns = jest.fn().mockResolvedValue(expected);
    const findMany = jest.fn();
    const controller = new CampaignController(
      { getAllCampaigns } as unknown as CampaignService,
      { campaign: { findMany } } as unknown as PrismaService,
      {} as MediaService,
      {} as VideoGeneratorService,
    );
    const response = await controller.getAllCampaigns({
      user: {
        id: "admin-1",
        email: "synthetic@example.invalid",
        role: "ADMIN",
      },
    } as AuthenticatedRequest);
    expect(response).toBe(expected);
    expect(findMany).not.toHaveBeenCalled();
  });
});
