import "reflect-metadata";
import { NotFoundException } from "@nestjs/common";
import { CampaignController } from "./campaign.controller";

describe("Public QR advertiser profile privacy", () => {
  const advertiserFindUnique = jest.fn();
  const campaignFindFirst = jest.fn();
  const prisma = {
    advertiser: { findUnique: advertiserFindUnique },
    campaign: { findFirst: campaignFindFirst },
  };
  const controller = new CampaignController(
    {} as never,
    prisma as never,
    {} as never,
    {} as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    advertiserFindUnique.mockResolvedValue({
      id: "adv-1",
      companyName: "Published Shop",
      status: "ACTIVE",
      productsData: "[]",
      whatsapp: "published-contact",
      instagram: "published-social",
      facebook: null,
      websiteUrl: "https://example.test",
      pedidosYaUrl: null,
      uberEatsUrl: null,
    });
    campaignFindFirst.mockResolvedValue(null);
  });

  it("returns only public brand and commerce fields without internal contact", async () => {
    const result = await controller.getAdvertiserProfile("adv-1");
    expect(result).toEqual({
      id: "adv-1",
      companyName: "Published Shop",
      productsData: "[]",
      whatsapp: "published-contact",
      instagram: "published-social",
      facebook: null,
      websiteUrl: "https://example.test",
      pedidosYaUrl: null,
      uberEatsUrl: null,
    });
    expect(advertiserFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "adv-1" },
        select: expect.objectContaining({ status: true }),
      }),
    );
    expect(advertiserFindUnique.mock.calls[0][0].select).not.toHaveProperty(
      "contactName",
    );
    expect(JSON.stringify(result)).not.toContain("contactName");
  });

  it.each(["SUSPENDED", "PENDING", "INACTIVE"])(
    "returns 404 for unpublished advertiser status %s before campaign lookup",
    async (status) => {
      advertiserFindUnique.mockResolvedValue({
        id: "adv-1",
        companyName: "Unpublished Shop",
        status,
      });
      await expect(controller.getAdvertiserProfile("adv-1")).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(campaignFindFirst).not.toHaveBeenCalled();
    },
  );

  it("returns 404 for unknown advertiser and never queries campaigns", async () => {
    advertiserFindUnique.mockResolvedValue(null);
    await expect(controller.getAdvertiserProfile("missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(campaignFindFirst).not.toHaveBeenCalled();
  });

  it("preserves an active campaign's published commerce links", async () => {
    campaignFindFirst.mockResolvedValue({
      whatsapp: "promotion-contact",
      websiteUrl: "https://example.test/promotion",
    });
    const profile = await controller.getAdvertiserProfile("adv-1");
    expect(profile.whatsapp).toBe("promotion-contact");
    expect(profile.websiteUrl).toBe("https://example.test/promotion");
    expect(campaignFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          active: true,
        }),
      }),
    );
  });
});
