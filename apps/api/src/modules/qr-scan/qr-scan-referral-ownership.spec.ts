import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { QrScanController } from "./qr-scan.controller";
import { QrScanService } from "./qr-scan.service";
import { UserRole } from "../auth/decorators/roles.decorator";
import type { AuthUser } from "../auth/auth.types";

describe("QrScan referral statistics tenant isolation", () => {
  const adminStats = jest.fn();
  const driverStats = jest.fn();
  const controller = new QrScanController({
    getReferralStats: adminStats,
    getDriverReferralStats: driverStats,
  } as unknown as QrScanService);

  const req = (role: string, entityId?: string): { user: AuthUser } => ({
    user: {
      id: "authenticated-user",
      email: "user@example.invalid",
      role,
      entityId,
    },
  });

  beforeEach(() => {
    jest.resetAllMocks();
    adminStats.mockResolvedValue({ totalScans: 3 });
    driverStats.mockResolvedValue({ totalScans: 2 });
  });

  it("lets an ADMIN request any referral code without a driver lookup", async () => {
    await expect(
      controller.getReferralStats("REF-OTHER", undefined, req(UserRole.ADMIN)),
    ).resolves.toEqual({ success: true, stats: { totalScans: 3 } });
    expect(adminStats).toHaveBeenCalledWith("REF-OTHER", 30);
    expect(driverStats).not.toHaveBeenCalled();
  });

  it("routes a DRIVER through database ownership instead of the admin metrics path", async () => {
    await expect(
      controller.getReferralStats(
        "REF-OWN",
        "7",
        req(UserRole.DRIVER, "driver-1"),
      ),
    ).resolves.toEqual({ success: true, stats: { totalScans: 2 } });
    expect(driverStats).toHaveBeenCalledWith("REF-OWN", "driver-1", 7);
    expect(adminStats).not.toHaveBeenCalled();
  });

  const deniedRequests: Array<[{ user?: AuthUser }, string]> = [
    [{ user: undefined }, "missing principal"],
    [req(UserRole.DRIVER), "driver missing entity ID"],
    [req(UserRole.DRIVER, ""), "driver empty entity ID"],
    [req("ADVERTISER", "driver-1"), "unprivileged role"],
  ];
  it.each(deniedRequests)(
    "rejects %s (%s) before accessing any statistics",
    async (request) => {
      await expect(
        controller.getReferralStats("REF-OTHER", undefined, request),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(adminStats).not.toHaveBeenCalled();
      expect(driverStats).not.toHaveBeenCalled();
    },
  );

  it("rejects an invalid days window before either metrics path", async () => {
    await expect(
      controller.getReferralStats(
        "REF-OWN",
        "366",
        req(UserRole.DRIVER, "driver-1"),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(adminStats).not.toHaveBeenCalled();
    expect(driverStats).not.toHaveBeenCalled();
  });

  describe("database-backed owner gate", () => {
    const driverRead = jest.fn();
    const scanRead = jest.fn();
    const service = new QrScanService({
      driver: { findFirst: driverRead },
      qrScan: { findMany: scanRead },
    } as never);

    beforeEach(() => {
      jest.resetAllMocks();
      driverRead.mockImplementation(
        async ({ where }: { where: { id: string; referralCode: string } }) =>
          where.id === "driver-1" && where.referralCode === "REF-OWN"
            ? { id: "driver-1" }
            : null,
      );
      scanRead.mockResolvedValue([
        { id: "scan-1", converted: true, driverId: "driver-1" },
        { id: "scan-2", converted: false, driverId: null },
      ]);
    });

    it("queries only the authenticated driver's exact referral code", async () => {
      const stats = await service.getDriverReferralStats(
        "REF-OWN",
        "driver-1",
        30,
      );
      expect(stats.totalScans).toBe(2);
      expect(stats.conversions).toBe(1);
      expect(driverRead).toHaveBeenCalledWith({
        where: { id: "driver-1", referralCode: "REF-OWN" },
        select: { id: true },
      });
      expect(scanRead).toHaveBeenCalledWith({
        where: {
          referrerCode: "REF-OWN",
          scannedAt: { gte: expect.any(Date) },
        },
        select: { id: true, converted: true, leadId: true, driverId: true },
      });
    });

    it.each([
      ["REF-OTHER", "driver-1"],
      ["REF-OWN", "other-driver"],
      ["REF-OWN", ""],
      ["", "driver-1"],
    ])(
      "blocks foreign or missing ownership for code=%s driver=%s before any scan read",
      async (code, driver) => {
        await expect(
          service.getDriverReferralStats(code, driver, 30),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(scanRead).not.toHaveBeenCalled();
      },
    );

    it("fails closed on a driver lookup outage, without reading QR metrics", async () => {
      driverRead.mockRejectedValue(new Error("database unavailable"));
      await expect(
        service.getDriverReferralStats("REF-OWN", "driver-1"),
      ).rejects.toThrow("database unavailable");
      expect(scanRead).not.toHaveBeenCalled();
    });
  });
});
