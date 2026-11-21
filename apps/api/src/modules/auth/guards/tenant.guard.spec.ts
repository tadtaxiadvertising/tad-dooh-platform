import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { UserRole } from "../decorators/roles.decorator";
import { TenantGuard } from "./tenant.guard";

describe("TenantGuard route-param ownership", () => {
  const guard = new TenantGuard();

  function context(
    user: { role: UserRole; entityId?: string } | null,
    params: Record<string, string> = {},
  ): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => ({ user, params }) }),
    } as unknown as ExecutionContext;
  }

  it("preserves legacy :id behavior", () => {
    const advertiser = { role: UserRole.ADVERTISER, entityId: "adv-1" };
    expect(guard.canActivate(context(advertiser, { id: "adv-1" }))).toBe(true);
    expect(() =>
      guard.canActivate(context(advertiser, { id: "adv-2" })),
    ).toThrow(UnauthorizedException);
  });

  it("binds :advertiserId to the signed advertiser entity", () => {
    const advertiser = { role: UserRole.ADVERTISER, entityId: "adv-1" };
    expect(
      guard.canActivate(context(advertiser, { advertiserId: "adv-1" })),
    ).toBe(true);
    expect(() =>
      guard.canActivate(
        context(advertiser, {
          advertiserId: "adv-other",
        }),
      ),
    ).toThrow(UnauthorizedException);
  });

  it("binds :driverId to the signed driver entity", () => {
    const driver = { role: UserRole.DRIVER, entityId: "driver-1" };
    expect(guard.canActivate(context(driver, { driverId: "driver-1" }))).toBe(
      true,
    );
    expect(() =>
      guard.canActivate(
        context(driver, {
          driverId: "driver-other",
        }),
      ),
    ).toThrow(UnauthorizedException);
  });

  it("rejects crossing between driver and advertiser IDs", () => {
    expect(() =>
      guard.canActivate(
        context(
          {
            role: UserRole.ADVERTISER,
            entityId: "same-id",
          },
          { driverId: "same-id" },
        ),
      ),
    ).toThrow(UnauthorizedException);
    expect(() =>
      guard.canActivate(
        context(
          {
            role: UserRole.DRIVER,
            entityId: "same-id",
          },
          { advertiserId: "same-id" },
        ),
      ),
    ).toThrow(UnauthorizedException);
  });

  it("checks ALL tenant parameters on compound routes", () => {
    const advertiser = { role: UserRole.ADVERTISER, entityId: "adv-1" };
    expect(() =>
      guard.canActivate(
        context(advertiser, {
          id: "adv-1",
          advertiserId: "adv-other",
        }),
      ),
    ).toThrow(UnauthorizedException);
    expect(() =>
      guard.canActivate(
        context(advertiser, {
          id: "adv-other",
          advertiserId: "adv-1",
        }),
      ),
    ).toThrow(UnauthorizedException);
  });

  it("preserves admin access and rejects absent or malformed tenant values", () => {
    expect(
      guard.canActivate(
        context(
          {
            role: UserRole.ADMIN,
          },
          { advertiserId: "adv-other", driverId: "driver-other" },
        ),
      ),
    ).toBe(true);
    expect(guard.canActivate(context(null, { advertiserId: "adv-1" }))).toBe(
      false,
    );
    expect(() =>
      guard.canActivate(
        context(
          {
            role: UserRole.ADVERTISER,
            entityId: "adv-1",
          },
          { advertiserId: "" },
        ),
      ),
    ).toThrow(UnauthorizedException);
  });

  it("preserves parameterless routes (controller must validate body ownership)", () => {
    expect(
      guard.canActivate(
        context({
          role: UserRole.DRIVER,
          entityId: "driver-1",
        }),
      ),
    ).toBe(true);
  });
});
