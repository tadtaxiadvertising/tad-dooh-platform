import { CampaignService } from "./campaign.service";

describe("CampaignService pending-review device assignment gate", () => {
  const findAdvertiser = jest.fn();
  const campaignCount = jest.fn();
  const createRecord = jest.fn();
  const refreshActiveCampaignsView = jest.fn();
  const broadcastEvent = jest.fn();
  const tx = {
    campaign: { count: campaignCount, create: createRecord },
  };
  const prisma = {
    advertiser: { findUnique: findAdvertiser },
    $transaction: jest.fn(
      async (callback: (transaction: typeof tx) => unknown) => callback(tx),
    ),
    refreshActiveCampaignsView,
  };
  const service = new CampaignService(
    prisma as never,
    { broadcastEvent } as never,
    {} as never,
    {} as never,
  );
  const input = {
    name: "Campaña de prueba",
    advertiser: "Marca",
    start_date: "2026-12-01T00:00:00.000Z",
    end_date: "2026-12-31T00:00:00.000Z",
    budget: 2500,
  };
  const advertiser = {
    role: "ADVERTISER",
    entityId: "adv-A",
    email: "advertiser@example.test",
  } as never;
  const admin = { role: "ADMIN" } as never;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(async (callback) => callback(tx));
    findAdvertiser.mockResolvedValue({ companyName: "Marca real" });
    campaignCount.mockResolvedValue(0);
    createRecord.mockImplementation(async ({ data }) => ({
      ...data,
      id: "campaign-1",
    }));
    refreshActiveCampaignsView.mockResolvedValue(undefined);
    broadcastEvent.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates advertiser review campaign but does not reserve named devices", async () => {
    const assign = jest.spyOn(service, "assignCampaignToDevices");
    const optimal = jest.spyOn(service, "getOptimalDevicesForCampaign");
    const result = await service.createCampaign(
      { ...input, active: true, target_devices: ["device-1"] },
      advertiser,
    );
    expect(result.status).toBe("PENDING_REVIEW");
    expect(result.active).toBe(false);
    expect(result.advertiserId).toBe("adv-A");
    expect(assign).not.toHaveBeenCalled();
    expect(optimal).not.toHaveBeenCalled();
    expect(refreshActiveCampaignsView).not.toHaveBeenCalled();
    expect(broadcastEvent).not.toHaveBeenCalled();
  });

  it("does not automatically target fleet from city or unapproved budget", async () => {
    const assign = jest.spyOn(service, "assignCampaignToDevices");
    const optimal = jest.spyOn(service, "getOptimalDevicesForCampaign");
    const result = await service.createCampaign(
      {
        ...input,
        target_city: "Santiago",
        target_all: false,
        target_devices: [],
      },
      advertiser,
    );
    expect(result.status).toBe("PENDING_REVIEW");
    expect(optimal).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
    expect(broadcastEvent).not.toHaveBeenCalled();
  });

  it("preserves existing admin draft device assignment behavior", async () => {
    const assign = jest
      .spyOn(service, "assignCampaignToDevices")
      .mockResolvedValue({ count: 1, skipped: 0 });
    const result = await service.createCampaign(
      { ...input, active: false, target_devices: ["device-1"] },
      admin,
    );
    expect(result.status).toBe("DRAFT");
    expect(assign).toHaveBeenCalledWith("campaign-1", ["device-1"]);
    expect(broadcastEvent).not.toHaveBeenCalled();
  });

  it("preserves existing admin active campaign distribution behavior", async () => {
    const assign = jest
      .spyOn(service, "assignCampaignToDevices")
      .mockResolvedValue({ count: 1, skipped: 0 });
    const result = await service.createCampaign(
      { ...input, active: true, target_devices: ["device-1"] },
      admin,
    );
    expect(result.status).toBe("ACTIVE");
    expect(assign).toHaveBeenCalledWith("campaign-1", ["device-1"]);
    expect(refreshActiveCampaignsView).toHaveBeenCalled();
    expect(broadcastEvent).toHaveBeenCalledWith(
      "fleet_sync",
      "WAKE_UP_CALL",
      expect.objectContaining({ campaignId: "campaign-1" }),
    );
  });
});
