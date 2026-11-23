import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { VerifiedMetricsController } from "./verified-metrics.controller";
import { TenantGuard } from "../auth/guards/tenant.guard";
import { UserRole } from "../auth/decorators/roles.decorator";

function context(entityId: string, driverId: string, role = UserRole.DRIVER) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: { role, entityId }, params: { driverId } }),
    }),
  } as unknown as ExecutionContext;
}

describe("VerifiedMetrics driver report tenant isolation", () => {
  it("registers the existing TenantGuard on driver/:driverId", () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      VerifiedMetricsController.prototype.getDriverVerifiedStats,
    ) as Array<unknown> | undefined;
    expect(guards).toContain(TenantGuard);
  });

  it("allows a driver to read only its own verified metrics", () => {
    const guard = new TenantGuard();
    expect(guard.canActivate(context("driver-A", "driver-A"))).toBe(true);
    expect(() => guard.canActivate(context("driver-A", "driver-B"))).toThrow(
      UnauthorizedException,
    );
  });

  it("ADMIN retains access under the existing global role guard", () => {
    const guard = new TenantGuard();
    expect(
      guard.canActivate(context("admin-A", "driver-B", UserRole.ADMIN)),
    ).toBe(true);
  });
});
