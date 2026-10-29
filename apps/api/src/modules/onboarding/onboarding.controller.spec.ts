import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../auth/decorators/public.decorator";
import {
  ROLES_KEY,
  UserRole,
} from "../auth/decorators/roles.decorator";
import { TenantGuard } from "../auth/guards/tenant.guard";
import { OnboardingController } from "./onboarding.controller";

function requestContext(
  user: { role: UserRole; entityId?: string } | undefined,
  id: string,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user, params: { id } }),
    }),
  } as unknown as ExecutionContext;
}

describe("OnboardingController authorization", () => {
  const handler = OnboardingController.prototype.complete;
  const tenantGuard = new TenantGuard();

  it("requires authentication and advertiser/admin RBAC for completion", () => {
    const reflector = new Reflector();

    expect(reflector.get<boolean>(IS_PUBLIC_KEY, handler)).not.toBe(true);
    expect(reflector.get<UserRole[]>(ROLES_KEY, handler)).toEqual([
      UserRole.ADMIN,
      UserRole.ADVERTISER,
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toContain(TenantGuard);
  });

  it("denies anonymous and cross-tenant advertiser activation", () => {
    expect(
      tenantGuard.canActivate(requestContext(undefined, "advertiser-a")),
    ).toBe(false);

    expect(() =>
      tenantGuard.canActivate(
        requestContext(
          { role: UserRole.ADVERTISER, entityId: "advertiser-b" },
          "advertiser-a",
        ),
      ),
    ).toThrow(UnauthorizedException);
  });

  it("preserves completion for the owning advertiser and administrators", () => {
    expect(
      tenantGuard.canActivate(
        requestContext(
          { role: UserRole.ADVERTISER, entityId: "advertiser-a" },
          "advertiser-a",
        ),
      ),
    ).toBe(true);

    expect(
      tenantGuard.canActivate(
        requestContext({ role: UserRole.ADMIN }, "advertiser-a"),
      ),
    ).toBe(true);
  });
});
