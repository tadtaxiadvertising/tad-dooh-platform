import "reflect-metadata";
import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../auth/decorators/public.decorator";
import { ROLES_KEY, UserRole } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AdvertisersController } from "./advertisers.controller";

describe("Assisted advertiser creation boundary", () => {
  const create = jest.fn();
  const controller = new AdvertisersController({ create } as never);
  const payload = {
    companyName: "Synthetic merchant",
    contactName: "Synthetic contact",
    email: " Merchant@Example.invalid ",
    phone: "8095550101",
  };

  beforeEach(() => {
    jest.resetAllMocks();
    create.mockResolvedValue({
      id: "fixture-advertiser",
      ...payload,
      email: "merchant@example.invalid",
      status: "PENDING_REVIEW",
      referredBy: null,
      password: "synthetic-hash-not-for-output",
    });
  });

  it("requires authenticated admin or driver via the real role guard", () => {
    const handler = AdvertisersController.prototype.create;
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).not.toBe(true);
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([
      UserRole.ADMIN,
      UserRole.DRIVER,
    ]);
    const guard = new RolesGuard(new Reflector());
    const context = (role?: UserRole) =>
      ({
        getHandler: () => handler,
        getClass: () => AdvertisersController,
        switchToHttp: () => ({
          getRequest: () => ({ user: role ? { role } : undefined }),
        }),
      }) as unknown as ExecutionContext;
    expect(() => guard.canActivate(context())).toThrow();
    expect(() => guard.canActivate(context(UserRole.ADVERTISER))).toThrow();
    expect(guard.canActivate(context(UserRole.ADMIN))).toBe(true);
    expect(guard.canActivate(context(UserRole.DRIVER))).toBe(true);
  });

  it("rejects missing identity and role injection before service access", async () => {
    await expect(
      controller.create({ ...payload, role: "ADMIN" }, {}),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      controller.create(payload, { user: { role: "ADVERTISER" } }),
    ).rejects.toMatchObject({ status: 403 });
    expect(create).not.toHaveBeenCalled();
  });

  it.each([
    { password: "third-party-fixture-password" },
    { referralCode: "THIRD_PARTY" },
    { password: null },
    { referralCode: "" },
  ])(
    "rejects driver-controlled credentials or referral overrides (%p)",
    async (fields) => {
      await expect(
        controller.create(
          { ...payload, ...fields },
          { user: { role: "DRIVER" } },
        ),
      ).rejects.toMatchObject({ status: 403 });
      expect(create).not.toHaveBeenCalled();
    },
  );

  it("preserves authorized driver contact registration without credentials", async () => {
    const result = await controller.create(payload, {
      user: { role: "DRIVER" },
    });
    expect(create).toHaveBeenCalledWith({
      ...payload,
      email: "merchant@example.invalid",
      password: undefined,
      referralCode: undefined,
    });
    expect(result).toEqual({
      id: "fixture-advertiser",
      ...payload,
      email: "merchant@example.invalid",
      status: "PENDING_REVIEW",
      referredBy: null,
    });
    expect(result).not.toHaveProperty("password");
  });

  it("retains privileged admin referral attribution without returning hashes", async () => {
    const result = await controller.create(
      { ...payload, referralCode: "DRIVER_FIXTURE" },
      { user: { role: "ADMIN" } },
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ referralCode: "DRIVER_FIXTURE" }),
    );
    expect(result).not.toHaveProperty("password");
  });

  it("rejects attempts to force commercial status even for administrators", async () => {
    await expect(
      controller.create(
        { ...payload, status: "ACTIVE" },
        { user: { role: "ADMIN" } },
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(create).not.toHaveBeenCalled();
  });
});
