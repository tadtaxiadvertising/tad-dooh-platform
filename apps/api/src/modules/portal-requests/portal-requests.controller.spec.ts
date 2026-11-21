import "reflect-metadata";
import { ForbiddenException } from "@nestjs/common";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { TenantGuard } from "../auth/guards/tenant.guard";
import { IS_PUBLIC_KEY } from "../auth/decorators/public.decorator";
import { ROLES_KEY, UserRole } from "../auth/decorators/roles.decorator";
import { PortalRequestsController } from "./portal-requests.controller";
import { PortalRequestsService } from "./portal-requests.service";

describe("Portal requests authenticated tenant ownership", () => {
  const create = jest.fn();
  const advertiserOwnsCampaign = jest.fn();
  const controller = new PortalRequestsController({
    create,
    advertiserOwnsCampaign,
  } as unknown as PortalRequestsService);

  const req = (role: UserRole, entityId: string | undefined) =>
    ({ user: { role, entityId, email: "test@example.test" } }) as never;

  const base = {
    type: "GENERAL",
    title: "Solicitud de prueba",
    description: "Descripción",
    data: { note: "check" },
  };

  beforeEach(() => {
    jest.resetAllMocks();
    create.mockResolvedValue({ id: "created-request" });
    advertiserOwnsCampaign.mockResolvedValue(true);
  });

  it("is protected and requires an authorized portal role", () => {
    const handler = PortalRequestsController.prototype.create;
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).not.toBe(true);
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([
      UserRole.ADMIN,
      UserRole.ADVERTISER,
      UserRole.DRIVER,
    ]);
  });

  it("keeps advertiser/driver listing endpoints protected by RBAC and TenantGuard", () => {
    const handlers = [
      {
        action: PortalRequestsController.prototype.findByAdvertiser,
        roles: [UserRole.ADMIN, UserRole.ADVERTISER],
      },
      {
        action: PortalRequestsController.prototype.findByDriver,
        roles: [UserRole.ADMIN, UserRole.DRIVER],
      },
    ];
    for (const { action, roles } of handlers) {
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, action)).not.toBe(true);
      expect(Reflect.getMetadata(ROLES_KEY, action)).toEqual(roles);
      expect(Reflect.getMetadata(GUARDS_METADATA, action)).toContain(
        TenantGuard,
      );
    }
  });

  it("binds advertiser requests to verified entityId even when body omits it", async () => {
    await controller.create(req(UserRole.ADVERTISER, "adv-1"), base);
    expect(create).toHaveBeenCalledWith({
      ...base,
      advertiserId: "adv-1",
      driverId: undefined,
    });
  });

  it("rejects advertiser impersonation of a different tenant or a driver", async () => {
    for (const body of [
      { ...base, advertiserId: "adv-other" },
      { ...base, driverId: "driver-other" },
    ]) {
      await expect(
        controller.create(req(UserRole.ADVERTISER, "adv-1"), body),
      ).rejects.toBeInstanceOf(ForbiddenException);
    }
    expect(create).not.toHaveBeenCalled();
  });

  it("checks database ownership of any referenced campaign", async () => {
    const body = { ...base, advertiserId: "adv-1", campaignId: "campaign-1" };
    await controller.create(req(UserRole.ADVERTISER, "adv-1"), body);
    expect(advertiserOwnsCampaign).toHaveBeenCalledWith("campaign-1", "adv-1");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        advertiserId: "adv-1",
        campaignId: "campaign-1",
      }),
    );
  });

  it("refuses foreign campaigns even when advertiserId was spoofed correctly", async () => {
    advertiserOwnsCampaign.mockResolvedValue(false);
    await expect(
      controller.create(req(UserRole.ADVERTISER, "adv-1"), {
        ...base,
        advertiserId: "adv-1",
        campaignId: "foreign-campaign",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(create).not.toHaveBeenCalled();
  });

  it("binds driver requests to verified identity, never client-selected owner", async () => {
    await controller.create(req(UserRole.DRIVER, "driver-1"), {
      ...base,
      driverId: "driver-1",
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        driverId: "driver-1",
        advertiserId: undefined,
        campaignId: undefined,
      }),
    );
    for (const body of [
      { ...base, driverId: "driver-other" },
      { ...base, advertiserId: "adv-other" },
      { ...base, campaignId: "campaign-1" },
    ]) {
      await expect(
        controller.create(req(UserRole.DRIVER, "driver-1"), body),
      ).rejects.toBeInstanceOf(ForbiddenException);
    }
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("denies absent identity and preserves explicit admin creation", async () => {
    await expect(
      controller.create(req(UserRole.ADVERTISER, undefined), base),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await controller.create(req(UserRole.ADMIN, undefined), {
      ...base,
      advertiserId: "adv-other",
    });
    expect(create).toHaveBeenCalledWith({
      ...base,
      advertiserId: "adv-other",
    });
  });
});
