import { HttpException, UnauthorizedException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import type { PrismaService } from "../../prisma/prisma.service";
import { SubscriptionGuard } from "./subscription.guard";

describe("SubscriptionGuard authenticated scope and payment status", () => {
  const findUnique = jest.fn();
  const guard = new SubscriptionGuard({
    device: { findUnique },
  } as unknown as PrismaService);
  const contextFor = (authenticatedDeviceId?: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          authenticatedDeviceId,
          body: { device_id: "TAD-B" },
          headers: { "x-device-id": "TAD-B" },
        }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    findUnique.mockReset();
  });

  it("does not skip subscription enforcement for a snake_case bulk sync", async () => {
    findUnique.mockResolvedValue({
      driverId: "driver-a",
      lastHeartbeat: new Date(),
      driver: { subscriptionPaid: false, subscriptionEnd: null },
    });

    await expect(guard.canActivate(contextFor("TAD-A"))).rejects.toBeInstanceOf(
      HttpException,
    );
    expect(findUnique).toHaveBeenCalledWith({
      where: { deviceId: "TAD-A" },
      select: expect.any(Object),
    });
  });

  it("fails closed if the device auth guard did not establish identity", async () => {
    await expect(guard.canActivate(contextFor())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("accepts paid legacy subscriptions with no explicit end date", async () => {
    findUnique.mockResolvedValue({
      driverId: "driver-a",
      lastHeartbeat: new Date(),
      driver: { subscriptionPaid: true, subscriptionEnd: null },
    });
    await expect(guard.canActivate(contextFor("TAD-A"))).resolves.toBe(true);
  });

  it("does not allow a recently connected unpaid device", async () => {
    findUnique.mockResolvedValue({
      driverId: "driver-a",
      lastHeartbeat: new Date(),
      driver: {
        subscriptionPaid: false,
        subscriptionEnd: new Date(Date.now() - 3600_000),
      },
    });
    await expect(guard.canActivate(contextFor("TAD-A"))).rejects.toMatchObject({
      status: 402,
    });
  });

  it("keeps the documented offline grace behavior for expired subscriptions", async () => {
    findUnique.mockResolvedValue({
      driverId: "driver-a",
      lastHeartbeat: new Date(Date.now() - 26 * 3600_000),
      driver: {
        subscriptionPaid: false,
        subscriptionEnd: new Date(Date.now() - 30 * 3600_000),
      },
    });
    await expect(guard.canActivate(contextFor("TAD-A"))).resolves.toBe(true);
  });
});
