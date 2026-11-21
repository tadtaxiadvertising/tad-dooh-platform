import { PortalRequestsService } from "./portal-requests.service";

describe("PortalRequestsService campaign ownership before request creation", () => {
  const findUnique = jest.fn();
  const prisma = { campaign: { findUnique } };
  const service = new PortalRequestsService(prisma as never);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("only accepts a campaign belonging to the authenticated advertiser", async () => {
    findUnique.mockResolvedValue({ advertiserId: "adv-1" });
    await expect(
      service.advertiserOwnsCampaign("campaign-1", "adv-1"),
    ).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "campaign-1" },
      select: { advertiserId: true },
    });
  });

  it("rejects foreign campaigns and unassigned campaigns", async () => {
    findUnique
      .mockResolvedValueOnce({ advertiserId: "adv-other" })
      .mockResolvedValueOnce({ advertiserId: null });
    await expect(
      service.advertiserOwnsCampaign("campaign-other", "adv-1"),
    ).resolves.toBe(false);
    await expect(
      service.advertiserOwnsCampaign("campaign-orphan", "adv-1"),
    ).resolves.toBe(false);
  });

  it("rejects nonexistent campaigns and invalid identity without making DB calls", async () => {
    findUnique.mockResolvedValueOnce(null);
    await expect(
      service.advertiserOwnsCampaign("missing", "adv-1"),
    ).resolves.toBe(false);
    jest.clearAllMocks();
    await expect(service.advertiserOwnsCampaign("", "adv-1")).resolves.toBe(
      false,
    );
    await expect(service.advertiserOwnsCampaign("campaign", "")).resolves.toBe(
      false,
    );
    expect(findUnique).not.toHaveBeenCalled();
  });
});
