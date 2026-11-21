import "reflect-metadata";
import { UnauthorizedException } from "@nestjs/common";
import { IS_PUBLIC_KEY } from "../auth/decorators/public.decorator";
import { ROLES_KEY, UserRole } from "../auth/decorators/roles.decorator";
import { AdvertisersService } from "./advertisers.service";
import { AdvertisersController } from "./advertisers.controller";

describe("Authoritative OAuth advertiser status", () => {
  const findUnique = jest.fn();
  const service = new AdvertisersService(
    {
      advertiser: { findUnique },
    } as never,
    {} as never,
  );
  const controller = new AdvertisersController(service);
  const identity = {
    role: "ADVERTISER",
    entityId: "advertiser-own",
    email: "own@example.test",
  };

  beforeEach(() => {
    jest.resetAllMocks();
    findUnique.mockResolvedValue({
      id: "advertiser-own",
      email: "own@example.test",
      status: "ACTIVE",
    });
  });

  it("uses the verified entity, not a caller supplied advertiser ID", async () => {
    const response = await controller.verifyOAuthStatus({
      user: identity,
    });
    expect(response).toEqual({
      role: "ADVERTISER",
      advertiserId: "advertiser-own",
      status: "ACTIVE",
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "advertiser-own" },
      select: { id: true, email: true, status: true },
    });
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        AdvertisersController.prototype.verifyOAuthStatus,
      ),
    ).not.toBe(true);
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        AdvertisersController.prototype.verifyOAuthStatus,
      ),
    ).toEqual([UserRole.ADVERTISER]);
  });

  it("reads PENDING_REVIEW from PostgreSQL despite stale ACTIVE metadata", async () => {
    findUnique.mockResolvedValue({
      id: "advertiser-own",
      email: "own@example.test",
      status: "PENDING_REVIEW",
    });
    await expect(
      service.verifyOAuthAdvertiserStatus(identity),
    ).resolves.toEqual({
      role: "ADVERTISER",
      advertiserId: "advertiser-own",
      status: "PENDING_REVIEW",
    });
  });

  it.each(["SUSPENDED", "DISABLED", "UNKNOWN"])(
    "denies %s accounts, not silently authorizing ACTIVE",
    async (status) => {
      findUnique.mockResolvedValue({
        id: "advertiser-own",
        email: "own@example.test",
        status,
      });
      await expect(
        service.verifyOAuthAdvertiserStatus(identity),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    },
  );

  it("returns PENDING_ONBOARDING only for its verified owner to finish the existing profile", async () => {
    findUnique.mockResolvedValue({
      id: "advertiser-own",
      email: "own@example.test",
      status: "PENDING_ONBOARDING",
    });
    await expect(
      service.verifyOAuthAdvertiserStatus(identity),
    ).resolves.toEqual({
      role: "ADVERTISER",
      advertiserId: "advertiser-own",
      status: "PENDING_ONBOARDING",
    });
  });

  it("refuses deleted users and email/ownership mismatch", async () => {
    findUnique.mockResolvedValueOnce(null);
    await expect(
      service.verifyOAuthAdvertiserStatus(identity),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    findUnique.mockResolvedValueOnce({
      id: "advertiser-other",
      email: "other@example.test",
      status: "ACTIVE",
    });
    await expect(
      service.verifyOAuthAdvertiserStatus(identity),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("refuses role spoofing, missing identity and an absent email", async () => {
    for (const fake of [
      { ...identity, role: "ADMIN" },
      { ...identity, entityId: " " },
      { ...identity, entityId: null },
      { ...identity, email: undefined },
    ]) {
      await expect(
        service.verifyOAuthAdvertiserStatus(fake),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    }
  });
});
