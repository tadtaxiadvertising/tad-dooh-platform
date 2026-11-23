import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { UserRole } from "../auth/decorators/roles.decorator";
import { VerifiedMetricsService } from "./verified-metrics.service";
import { VerifiedMetricsController } from "./verified-metrics.controller";

const from = new Date("2026-11-01T00:00:00.000Z");
const to = new Date("2026-11-15T00:00:00.000Z");

const campaign = {
  id: "campaign-B",
  name: "Other advertiser's campaign",
  advertiserId: "advertiser-B",
  status: "ACTIVE",
  mediaAssets: [],
  devices: [],
};

describe("Verified campaign metrics access — no cross-advertiser reads", () => {
  const findUnique = jest.fn();
  const findMany = jest.fn();
  const service = new VerifiedMetricsService({
    campaign: { findUnique },
    playbackEvent: { findMany },
  } as never);

  beforeEach(() => {
    jest.resetAllMocks();
    findMany.mockResolvedValue([]);
  });

  it("denies a service call without access scope", async () => {
    await expect(
      service.getCampaignVerifiedStats(
        "campaign-B",
        from,
        to,
        undefined as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("rejects an advertiser without entityId", async () => {
    await expect(
      service.getCampaignVerifiedStats("campaign-B", from, to, {
        role: UserRole.ADVERTISER,
        advertiserId: "   ",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("filters another advertiser out of the Prisma query", async () => {
    findUnique.mockResolvedValue(null);
    await expect(
      service.getCampaignVerifiedStats("campaign-B", from, to, {
        role: UserRole.ADVERTISER,
        advertiserId: "advertiser-A",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "campaign-B", advertiserId: "advertiser-A" },
      }),
    );
    expect(findMany).not.toHaveBeenCalled();
  });

  it("rejects a mismatched DB response defensively", async () => {
    findUnique.mockResolvedValue(campaign);
    await expect(
      service.getCampaignVerifiedStats("campaign-B", from, to, {
        role: UserRole.ADVERTISER,
        advertiserId: "advertiser-A",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("permits a campaign owner and trims their entityId", async () => {
    findUnique.mockResolvedValue(campaign);
    const report = await service.getCampaignVerifiedStats(
      "campaign-B",
      from,
      to,
      {
        role: UserRole.ADVERTISER,
        advertiserId: " advertiser-B ",
      },
    );
    expect(report.campaignId).toBe("campaign-B");
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "campaign-B", advertiserId: "advertiser-B" },
      }),
    );
  });

  it("allows administrator access without a tenant filter", async () => {
    findUnique.mockResolvedValue(campaign);
    const report = await service.getCampaignVerifiedStats(
      "campaign-B",
      from,
      to,
      { role: UserRole.ADMIN },
    );
    expect(report.campaignId).toBe("campaign-B");
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "campaign-B" } }),
    );
  });

  it("HTTP controller rejects missing/wrong identity", async () => {
    const getCampaignVerifiedStats = jest.fn();
    const controller = new VerifiedMetricsController({
      getCampaignVerifiedStats,
    } as never);
    for (const role of [undefined, UserRole.DRIVER, UserRole.ADVERTISER]) {
      await expect(
        controller.getCampaignVerifiedStats("campaign-B", {
          user: { role, entityId: undefined },
        } as never),
      ).rejects.toBeInstanceOf(ForbiddenException);
    }
    expect(getCampaignVerifiedStats).not.toHaveBeenCalled();
  });

  it("HTTP controller derives advertiser scope from JWT", async () => {
    const getCampaignVerifiedStats = jest
      .fn()
      .mockResolvedValue({ campaignId: "campaign-B" });
    const controller = new VerifiedMetricsController({
      getCampaignVerifiedStats,
    } as never);
    await controller.getCampaignVerifiedStats("campaign-B", {
      user: { role: UserRole.ADVERTISER, entityId: "advertiser-A" },
    } as never);
    expect(getCampaignVerifiedStats).toHaveBeenCalledWith(
      "campaign-B",
      expect.any(Date),
      expect.any(Date),
      { role: UserRole.ADVERTISER, advertiserId: "advertiser-A" },
    );
  });
});
