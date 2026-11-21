import "reflect-metadata";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { UserRole } from "../auth/decorators/roles.decorator";
import { CampaignController } from "./campaign.controller";

describe("Campaign coverage privacy and tenant isolation", () => {
  const findUnique = jest.fn();
  const deviceFindMany = jest.fn();
  const assignmentsFindMany = jest.fn();
  const playlistFindMany = jest.fn();
  const prisma = {
    campaign: { findUnique },
    device: { findMany: deviceFindMany },
    deviceCampaign: { findMany: assignmentsFindMany },
    playlistItem: { findMany: playlistFindMany },
  };
  const controller = new CampaignController(
    {} as never,
    prisma as never,
    {} as never,
    {} as never,
  );

  const req = (role: UserRole, entityId = "adv-owner") =>
    ({ user: { role, entityId } }) as never;

  const safeDevice = {
    id: "device-uuid-1",
    deviceId: "TAD-001",
    taxiNumber: "T-01",
    city: "Santiago",
    status: "OPERATIVO",
    lastHeartbeat: null,
    lastSeen: null,
    lastSync: null,
  };
  const assertSafeSelection = (selection: Record<string, unknown>) => {
    expect(selection).toEqual({
      id: true,
      deviceId: true,
      taxiNumber: true,
      city: true,
      status: true,
      lastHeartbeat: true,
      lastSeen: true,
      lastSync: true,
    });
    expect(selection).not.toHaveProperty("authToken");
    expect(selection).not.toHaveProperty("lastLat");
    expect(selection).not.toHaveProperty("lastLng");
    expect(selection).not.toHaveProperty("driverId");
  };

  beforeEach(() => {
    jest.resetAllMocks();
    findUnique.mockResolvedValue({
      id: "campaign-1",
      name: "Test",
      advertiserId: "adv-owner",
      targetAll: true,
      isGlobal: false,
      targetCity: "Santiago",
    });
    deviceFindMany.mockResolvedValue([safeDevice]);
    assignmentsFindMany.mockResolvedValue([]);
    playlistFindMany.mockResolvedValue([]);
  });

  it("rejects cross-advertiser distribution BEFORE querying fleet assignments", async () => {
    findUnique.mockResolvedValue({
      name: "Another campaign",
      advertiserId: "adv-other",
    });
    const errorLog = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(
        controller.getCampaignDistribution(
          "campaign-1",
          req(UserRole.ADVERTISER),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    } finally {
      errorLog.mockRestore();
    }
    expect(assignmentsFindMany).not.toHaveBeenCalled();
    expect(playlistFindMany).not.toHaveBeenCalled();
    expect(deviceFindMany).not.toHaveBeenCalled();
  });

  it("rejects cross-advertiser device coverage BEFORE accessing any device", async () => {
    findUnique.mockResolvedValue({
      name: "Another campaign",
      advertiserId: "adv-other",
    });
    await expect(
      controller.getCampaignDevices("campaign-1", req(UserRole.ADVERTISER)),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(assignmentsFindMany).not.toHaveBeenCalled();
    expect(deviceFindMany).not.toHaveBeenCalled();
  });

  it("allows an owning advertiser to obtain distribution with safe device selection", async () => {
    assignmentsFindMany.mockResolvedValue([{ device_id: "device-uuid-1" }]);
    const result = await controller.getCampaignDistribution(
      "campaign-1",
      req(UserRole.ADVERTISER),
    );
    expect(result.total_screens).toBe(1);
    expect(result.taxis).toEqual([
      expect.objectContaining({ id: "device-uuid-1", taxiNumber: "T-01" }),
    ]);
    assertSafeSelection(deviceFindMany.mock.calls[0][0].select);
    expect(JSON.stringify(result)).not.toContain("authToken");
  });

  it("uses safe projection for legacy distribution lookup", async () => {
    playlistFindMany.mockResolvedValue([{ deviceId: "TAD-001" }]);
    await controller.getCampaignDistribution("campaign-1", req(UserRole.ADMIN));
    assertSafeSelection(deviceFindMany.mock.calls[0][0].select);
    expect(deviceFindMany.mock.calls[0][0].where).toEqual({
      deviceId: { in: ["TAD-001"] },
    });
  });

  it("does not expose credentials, precise GPS or driver IDs for global coverage", async () => {
    const result = await controller.getCampaignDevices(
      "campaign-1",
      req(UserRole.ADVERTISER),
    );
    expect(result).toEqual([
      expect.objectContaining({
        id: "device-uuid-1",
        deviceId: "TAD-001",
        assignment_type: "GLOBAL",
      }),
    ]);
    assertSafeSelection(deviceFindMany.mock.calls[0][0].select);
    expect(JSON.stringify(result)).not.toContain("authToken");
  });

  it("also restricts nested device query for explicitly assigned coverage", async () => {
    findUnique.mockResolvedValue({
      name: "Local",
      advertiserId: "adv-owner",
      targetAll: false,
      isGlobal: false,
      targetCity: "Santiago",
    });
    assignmentsFindMany.mockResolvedValue([
      { device: safeDevice, assigned_at: new Date("2026-11-18T00:00:00Z") },
    ]);
    deviceFindMany.mockResolvedValue([]);
    const result = await controller.getCampaignDevices(
      "campaign-1",
      req(UserRole.ADVERTISER),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("assignment_type", "DIRECT");
    assertSafeSelection(
      assignmentsFindMany.mock.calls[0][0].include.device.select,
    );
    assertSafeSelection(deviceFindMany.mock.calls[0][0].select);
  });

  it("allows admin inspection of coverage, but never exposes device auth tokens", async () => {
    await controller.getCampaignDevices("campaign-1", req(UserRole.ADMIN));
    assertSafeSelection(deviceFindMany.mock.calls[0][0].select);
  });

  it("returns missing-campaign behavior without touching fleet tables", async () => {
    findUnique.mockResolvedValue(null);
    const errorLog = jest.spyOn(console, "error").mockImplementation(() => {});
    const warningLog = jest.spyOn(console, "warn").mockImplementation(() => {});
    try {
      await expect(
        controller.getCampaignDistribution("missing", req(UserRole.ADVERTISER)),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        controller.getCampaignDevices("missing", req(UserRole.ADVERTISER)),
      ).resolves.toEqual([]);
    } finally {
      errorLog.mockRestore();
      warningLog.mockRestore();
    }
    expect(assignmentsFindMany).not.toHaveBeenCalled();
    expect(deviceFindMany).not.toHaveBeenCalled();
  });
});
