import "reflect-metadata";
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AdvertisersController } from "../../advertisers/advertisers.controller";
import { OnboardingController } from "../../onboarding/onboarding.controller";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { ADVERTISER_ALLOWED_STATUSES_KEY } from "../decorators/advertiser-status.decorator";
import { AdvertiserAccountStatusGuard } from "./advertiser-account-status.guard";

describe("AdvertiserAccountStatusGuard — direct API status authorization", () => {
  const checkStatus = jest.fn();
  const service = { verifyOAuthAdvertiserStatus: checkStatus };
  const reflector = new Reflector();
  const guard = new AdvertiserAccountStatusGuard(reflector, service as never);
  const identity = {
    id: "supabase-auth-id",
    email: "advertiser@example.test",
    role: "ADVERTISER",
    entityId: "advertiser-db-id",
  };

  function context(
    handler: Function,
    user: Record<string, unknown> | null = identity,
    controller: Function = AdvertisersController,
  ): ExecutionContext {
    return {
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({
        getRequest: () => ({ user, params: { id: "advertiser-db-id" } }),
      }),
    } as unknown as ExecutionContext;
  }

  const campaignHandler = function createCampaign() {};
  const activeOnly = () =>
    context(campaignHandler, identity, class CampaignController {});

  beforeEach(() => {
    jest.resetAllMocks();
    checkStatus.mockResolvedValue({
      role: "ADVERTISER",
      advertiserId: "advertiser-db-id",
      status: "ACTIVE",
    });
  });

  it("requires DB ACTIVE status for direct advertiser API calls by default", async () => {
    await expect(guard.canActivate(activeOnly())).resolves.toBe(true);
    expect(checkStatus).toHaveBeenCalledWith({
      role: "ADVERTISER",
      entityId: "advertiser-db-id",
      email: "advertiser@example.test",
    });
    for (const status of ["PENDING_ONBOARDING", "PENDING_REVIEW"]) {
      checkStatus.mockResolvedValueOnce({
        role: "ADVERTISER",
        advertiserId: "advertiser-db-id",
        status,
      });
      await expect(guard.canActivate(activeOnly())).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    }
  });

  it("also gates existing advertiser portal, invoices and update endpoints", async () => {
    const methods = [
      AdvertisersController.prototype.getPortal,
      AdvertisersController.prototype.getInvoices,
      AdvertisersController.prototype.update,
      AdvertisersController.prototype.findOne,
    ];
    for (const method of methods) {
      checkStatus.mockResolvedValueOnce({
        role: "ADVERTISER",
        advertiserId: "advertiser-db-id",
        status: "PENDING_REVIEW",
      });
      await expect(guard.canActivate(context(method))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    }
    expect(checkStatus).toHaveBeenCalledTimes(methods.length);
  });

  it("allows DB-verified pending states only to read their account status", async () => {
    const handler = AdvertisersController.prototype.verifyOAuthStatus;
    expect(
      Reflect.getMetadata(ADVERTISER_ALLOWED_STATUSES_KEY, handler),
    ).toEqual(["ACTIVE", "PENDING_REVIEW", "PENDING_ONBOARDING"]);
    for (const status of ["ACTIVE", "PENDING_REVIEW", "PENDING_ONBOARDING"]) {
      checkStatus.mockResolvedValueOnce({
        role: "ADVERTISER",
        advertiserId: "advertiser-db-id",
        status,
      });
      await expect(guard.canActivate(context(handler))).resolves.toBe(true);
    }
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).not.toBe(true);
  });

  it("only pending users can reach the protected OAuth profile completion", async () => {
    const handler = OnboardingController.prototype.completeOAuthProfile;
    expect(
      Reflect.getMetadata(ADVERTISER_ALLOWED_STATUSES_KEY, handler),
    ).toEqual(["PENDING_ONBOARDING", "PENDING_REVIEW"]);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).not.toBe(true);
    for (const status of ["PENDING_ONBOARDING", "PENDING_REVIEW"]) {
      checkStatus.mockResolvedValueOnce({
        role: "ADVERTISER",
        advertiserId: "advertiser-db-id",
        status,
      });
      await expect(
        guard.canActivate(context(handler, identity, OnboardingController)),
      ).resolves.toBe(true);
    }
    await expect(
      guard.canActivate(context(handler, identity, OnboardingController)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("fails closed for suspended users, expired identities and DB errors", async () => {
    for (const error of [
      new UnauthorizedException("SUSPENDED"),
      new UnauthorizedException("Identity does not match"),
      new Error("Database unavailable"),
    ]) {
      checkStatus.mockRejectedValueOnce(error);
      await expect(guard.canActivate(activeOnly())).rejects.toBe(error);
    }
  });

  it("does not affect public endpoints, admin or driver identities", async () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, AdvertisersController.prototype.login),
    ).toBe(true);
    await expect(
      guard.canActivate(context(AdvertisersController.prototype.login)),
    ).resolves.toBe(true);
    for (const role of ["ADMIN", "DRIVER"]) {
      await expect(
        guard.canActivate(context(campaignHandler, { ...identity, role })),
      ).resolves.toBe(true);
    }
    expect(checkStatus).not.toHaveBeenCalled();
  });

  it("does not grant auth to anonymous requests (earlier AuthGuard must reject)", async () => {
    await expect(
      guard.canActivate(context(AdvertisersController.prototype.findOne, null)),
    ).resolves.toBe(true);
    expect(checkStatus).not.toHaveBeenCalled();
  });

  it("does not trust client-selected advertiser IDs or JWT status claims", async () => {
    const payload = {
      ...identity,
      status: "ACTIVE",
      app_metadata: { status: "ACTIVE" },
    };
    checkStatus.mockResolvedValueOnce({
      role: "ADVERTISER",
      advertiserId: "advertiser-db-id",
      status: "PENDING_REVIEW",
    });
    await expect(
      guard.canActivate(
        context(campaignHandler, payload, class CampaignController {}),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(checkStatus).toHaveBeenCalledWith({
      role: "ADVERTISER",
      entityId: "advertiser-db-id",
      email: "advertiser@example.test",
    });
  });
});
