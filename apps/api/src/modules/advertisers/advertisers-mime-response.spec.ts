import { AdvertisersService } from "./advertisers.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { ConfigService } from "@nestjs/config";

describe("advertiser detail MIME compatibility", () => {
  it.each(["image/png", null])(
    "keeps nested aliases for %s without mutating query results",
    async (mimeType) => {
      const media = { id: "media-1", mimeType };
      const advertiser = {
        id: "advertiser-1",
        campaigns: [{ id: "campaign-1", media: [media] }],
      };
      const findUnique = jest.fn().mockResolvedValue(advertiser);
      const service = new AdvertisersService(
        { advertiser: { findUnique } } as unknown as PrismaService,
        {} as ConfigService,
      );
      const response = await service.findOne("advertiser-1");
      expect(findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "advertiser-1" } }),
      );
      expect(response?.campaigns[0].media[0]).toEqual({
        ...media,
        mime_type: mimeType,
      });
      expect(media).not.toHaveProperty("mime_type");
      expect(response?.id).toBe(advertiser.id);
    },
  );

  it("keeps the missing advertiser result null", async () => {
    const service = new AdvertisersService(
      {
        advertiser: { findUnique: jest.fn().mockResolvedValue(null) },
      } as unknown as PrismaService,
      {} as ConfigService,
    );
    await expect(service.findOne("missing")).resolves.toBeNull();
  });
});
