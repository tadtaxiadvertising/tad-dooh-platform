import "reflect-metadata";
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../auth/decorators/public.decorator";
import { ROLES_KEY, UserRole } from "../auth/decorators/roles.decorator";
import { TenantGuard } from "../auth/guards/tenant.guard";
import { OnboardingController } from "./onboarding.controller";
import { OnboardingService } from "./onboarding.service";

function requestContext(
  user: { role: UserRole; entityId?: string } | undefined,
  id: string,
): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user, params: { id } }) }),
  } as unknown as ExecutionContext;
}

describe("OnboardingController security boundary", () => {
  const handler = OnboardingController.prototype.complete;
  const tenantGuard = new TenantGuard();
  const service = {
    onboardAdvertiser: jest.fn(),
    quoteAdvertiser: jest.fn(),
    completeOnboarding: jest.fn(),
  };
  const controller = new OnboardingController(
    service as unknown as OnboardingService,
  );

  beforeEach(() => jest.clearAllMocks());

  it("exposes a public read-only quote delegated to server verification", async () => {
    const handler = OnboardingController.prototype.quote;
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
    service.quoteAdvertiser.mockResolvedValue({
      baseMonthlyScreenRate: 2500,
      effectiveMonthlyScreenRate: 1500,
      discountPercent: 40,
    });
    const request = {
      expectedScreens: 1,
      campaignMonths: 1,
      includeProduction: false,
      referralCode: "DRIVER_TEST_1",
    };
    const response = await controller.quote(request);
    expect(service.quoteAdvertiser).toHaveBeenCalledWith(request);
    expect(response.discountPercent).toBe(40);
  });

  it("forwards the registration attempt key without changing public access", async () => {
    const request = {
      name: "Fixture",
      companyName: "Fixture Company",
      email: "signup@example.invalid",
      phone: "8095550101",
      password: "fixture-password",
      budget: 1,
      expectedScreens: 1,
      targetCity: "Santiago",
    };
    const key = "12345678-1234-4234-8234-123456789abc";
    await controller.onboard(request, key);
    expect(service.onboardAdvertiser).toHaveBeenCalledWith(request, key);
    await controller.onboard(request);
    expect(service.onboardAdvertiser).toHaveBeenCalledWith(request, undefined);
  });

  it("keeps initial registration public", () => {
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        OnboardingController.prototype.onboard,
      ),
    ).toBe(true);
  });

  it("requires authentication, RBAC, and tenant checks for completion", () => {
    const reflector = new Reflector();
    expect(reflector.get<boolean>(IS_PUBLIC_KEY, handler)).not.toBe(true);
    expect(reflector.get<UserRole[]>(ROLES_KEY, handler)).toEqual([
      UserRole.ADMIN,
      UserRole.ADVERTISER,
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toContain(
      TenantGuard,
    );
  });

  it("denies anonymous and cross-tenant activation", () => {
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

  it("allows the owning advertiser and administrators through the tenant guard", () => {
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

  it("rejects activation without changing advertiser state", async () => {
    await expect(controller.complete()).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(service.completeOnboarding).not.toHaveBeenCalled();
  });
});
