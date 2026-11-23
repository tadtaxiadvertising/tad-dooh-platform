import { ForbiddenException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AnalyticsController } from "./analytics.controller";
import { RolesGuard } from "../auth/guards/roles.guard";
import { UserRole } from "../auth/decorators/roles.decorator";
import type { AuthenticatedRequest } from "../auth/auth.types";

describe("Campaign analytics role and ownership isolation", () => {
  const campaignRead = jest.fn();
  const getMetrics = jest.fn();
  const controller = new AnalyticsController(
    { getCampaignAnalytics: getMetrics } as never,
    {} as never,
    { campaign: { findUnique: campaignRead } } as never,
    {} as never,
  );

  const req = (role: UserRole, entityId?: string) =>
    ({
      user: {
        id: "authenticated-user",
        email: "user@example.invalid",
        role,
        entityId,
      },
    }) as AuthenticatedRequest;

  const rolesGuard = new RolesGuard(new Reflector());
  const contextForRole = (role: UserRole): ExecutionContext =>
    ({
      getHandler: () => AnalyticsController.prototype.getCampaignAnalytics,
      getClass: () => AnalyticsController,
      switchToHttp: () => ({
        getRequest: () => req(role),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.resetAllMocks();
    campaignRead.mockResolvedValue({ advertiserId: "advertiser-1" });
    getMetrics.mockResolvedValue({ campaignId: "campaign-1", totalEvents: 4 });
  });

  it("rejects DRIVER role before accessing the campaign analytics route", () => {
    expect(() =>
      rolesGuard.canActivate(contextForRole(UserRole.DRIVER)),
    ).toThrow(ForbiddenException);
    expect(campaignRead).not.toHaveBeenCalled();
    expect(getMetrics).not.toHaveBeenCalled();
  });

  it.each([UserRole.ADMIN, UserRole.ADVERTISER])(
    "allows the %s role through global RBAC",
    (role) => {
      expect(rolesGuard.canActivate(contextForRole(role))).toBe(true);
    },
  );

  it("rejects an advertiser requesting metrics from another account", async () => {
    campaignRead.mockResolvedValue({ advertiserId: "advertiser-other" });

    await expect(
      controller.getCampaignAnalytics(
        "campaign-1",
        req(UserRole.ADVERTISER, "advertiser-1"),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(getMetrics).not.toHaveBeenCalled();
  });

  it("denies a nonexistent campaign to an advertiser", async () => {
    campaignRead.mockResolvedValue(null);

    await expect(
      controller.getCampaignAnalytics(
        "campaign-missing",
        req(UserRole.ADVERTISER, "advertiser-1"),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(getMetrics).not.toHaveBeenCalled();
  });

  it("allows only the advertiser's own campaign", async () => {
    await expect(
      controller.getCampaignAnalytics(
        "campaign-1",
        req(UserRole.ADVERTISER, "advertiser-1"),
      ),
    ).resolves.toEqual({ campaignId: "campaign-1", totalEvents: 4 });
    expect(campaignRead).toHaveBeenCalledWith({
      where: { id: "campaign-1" },
    });
    expect(getMetrics).toHaveBeenCalledWith("campaign-1");
  });

  it("permits an admin without an advertiser ownership lookup", async () => {
    await expect(
      controller.getCampaignAnalytics("campaign-1", req(UserRole.ADMIN)),
    ).resolves.toEqual({ campaignId: "campaign-1", totalEvents: 4 });
    expect(campaignRead).not.toHaveBeenCalled();
    expect(getMetrics).toHaveBeenCalledWith("campaign-1");
  });
});
