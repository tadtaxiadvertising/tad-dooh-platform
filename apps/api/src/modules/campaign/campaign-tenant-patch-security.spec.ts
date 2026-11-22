import "reflect-metadata";
import { ForbiddenException } from "@nestjs/common";
import { UserRole } from "../auth/decorators/roles.decorator";
import { CampaignController } from "./campaign.controller";

describe("Campaign tenant patch and list authorization", () => {
  const getCampaignById = jest.fn();
  const updateCampaign = jest.fn();
  const getAllCampaigns = jest.fn();
  const findMany = jest.fn();
  const campaignService = {
    getCampaignById,
    updateCampaign,
    getAllCampaigns,
  };
  const prisma = { campaign: { findMany } };
  const controller = new CampaignController(
    campaignService as never,
    prisma as never,
    {} as never,
    {} as never,
  );
  const req = (role: UserRole, entityId?: string) =>
    ({ user: { role, entityId } }) as never;

  beforeEach(() => {
    jest.resetAllMocks();
    getCampaignById.mockResolvedValue({
      id: "campaign-1",
      advertiserId: "advertiser-A",
      status: "ACTIVE",
      active: true,
    });
    updateCampaign.mockResolvedValue({ id: "campaign-1" });
    // Prisma include returns both relation arrays, even when empty.
    findMany.mockResolvedValue([
      { id: "campaign-1", mediaAssets: [], media: [] },
    ]);
    getAllCampaigns.mockResolvedValue([{ id: "admin-result" }]);
  });

  it.each([
    ["advertiser_id", "advertiser-B"],
    ["advertiser", "other company"],
    ["active", false],
    ["budget", 999999],
    ["target_devices", ["device-1"]],
    ["target_all", true],
    ["target_city", "Global"],
    ["target_cities", ["Other"]],
    ["target_fleets", ["Other"]],
    ["start_date", "2026-11-18"],
    ["end_date", "2026-12-18"],
    ["target_impressions", 999999],
    ["status", "ACTIVE"],
    ["isGlobal", true],
    ["name", "unauthorized edit"],
  ])(
    "rejects privileged advertiser PATCH %s BEFORE service mutation",
    async (field, value) => {
      await expect(
        controller.updateCampaign(
          "campaign-1",
          { [field]: value } as never,
          req(UserRole.ADVERTISER, "advertiser-A"),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(updateCampaign).not.toHaveBeenCalled();
    },
  );

  it("rejects mixing safe links with unsafe fields", async () => {
    await expect(
      controller.updateCampaign(
        "campaign-1",
        { whatsapp: "8091234567", advertiser_id: "advertiser-B" },
        req(UserRole.ADVERTISER, "advertiser-A"),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(updateCampaign).not.toHaveBeenCalled();
  });

  it("rejects a cross-tenant patch even when it contains only safe fields", async () => {
    await expect(
      controller.updateCampaign(
        "campaign-1",
        { instagram: "brand" },
        req(UserRole.ADVERTISER, "advertiser-B"),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(updateCampaign).not.toHaveBeenCalled();
  });

  it.each([
    {},
    null,
    [],
    { whatsapp: 42 },
    { whatsapp: { nested: "bad" } },
    { whatsapp: "x".repeat(2049) },
  ])(
    "rejects malformed or empty advertiser patch payloads",
    async (payload) => {
      await expect(
        controller.updateCampaign(
          "campaign-1",
          payload as never,
          req(UserRole.ADVERTISER, "advertiser-A"),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(updateCampaign).not.toHaveBeenCalled();
    },
  );

  it("allows exactly the six QR/commerce link fields, including clearing values", async () => {
    const links = {
      whatsapp: "",
      instagram: "tad_brand",
      facebook: "tad",
      websiteUrl: "https://example.test",
      pedidosYaUrl: "",
      uberEatsUrl: "https://example.test/menu",
    };
    await controller.updateCampaign(
      "campaign-1",
      links,
      req(UserRole.ADVERTISER, "advertiser-A"),
    );
    expect(updateCampaign).toHaveBeenCalledWith("campaign-1", links);
  });

  it("fails closed for unexpected PATCH roles before campaign lookup", async () => {
    await expect(
      controller.updateCampaign(
        "campaign-1",
        { websiteUrl: "https://example.test" },
        req(UserRole.DRIVER),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(getCampaignById).not.toHaveBeenCalled();
    expect(updateCampaign).not.toHaveBeenCalled();
  });

  it("preserves an ADMIN's existing unrestricted edit workflow", async () => {
    const administrativeEdit = {
      advertiser_id: "advertiser-B",
      active: false,
      budget: 2500,
      target_devices: ["device-1"],
    };
    await controller.updateCampaign(
      "campaign-1",
      administrativeEdit,
      req(UserRole.ADMIN),
    );
    expect(updateCampaign).toHaveBeenCalledWith(
      "campaign-1",
      administrativeEdit,
    );
  });

  it.each([undefined, "", "   "])(
    "fails closed when an advertiser has a missing entityId in GET /campaigns",
    async (entityId) => {
      await expect(
        controller.getAllCampaigns(req(UserRole.ADVERTISER, entityId)),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(getAllCampaigns).not.toHaveBeenCalled();
      expect(findMany).not.toHaveBeenCalled();
    },
  );

  it("lists only the authenticated advertiser's campaigns", async () => {
    const data = await controller.getAllCampaigns(
      req(UserRole.ADVERTISER, "advertiser-A"),
    );
    expect(data).toEqual([{ id: "campaign-1", mediaAssets: [], media: [] }]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { advertiserId: "advertiser-A" } }),
    );
    expect(getAllCampaigns).not.toHaveBeenCalled();
  });

  it("preserves both MIME aliases and tenant scoping", async () => {
    findMany.mockResolvedValue([
      {
        id: "campaign-1",
        mediaAssets: [],
        media: [{ id: "media-1", mimeType: "video/mp4" }],
      },
    ]);

    const data = await controller.getAllCampaigns(
      req(UserRole.ADVERTISER, "advertiser-A"),
    );

    expect(data).toEqual([
      {
        id: "campaign-1",
        mediaAssets: [],
        media: [
          { id: "media-1", mimeType: "video/mp4", mime_type: "video/mp4" },
        ],
      },
    ]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { advertiserId: "advertiser-A" } }),
    );
    expect(getAllCampaigns).not.toHaveBeenCalled();
  });

  it("preserves global campaign listing for ADMIN", async () => {
    await expect(
      controller.getAllCampaigns(req(UserRole.ADMIN)),
    ).resolves.toEqual([{ id: "admin-result" }]);
    expect(getAllCampaigns).toHaveBeenCalledTimes(1);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("denies unexpected roles from accessing a global campaign listing", async () => {
    await expect(
      controller.getAllCampaigns(req(UserRole.DRIVER)),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(getAllCampaigns).not.toHaveBeenCalled();
    expect(findMany).not.toHaveBeenCalled();
  });
});
