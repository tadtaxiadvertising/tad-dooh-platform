import type { ExecutionContext } from "@nestjs/common";
import { ForbiddenException } from "@nestjs/common";
import * as jwt from "jsonwebtoken";
import type { PrismaService } from "../../prisma/prisma.service";
import { DeviceTokenGuard } from "./device-token.guard";

describe("DeviceTokenGuard device ownership", () => {
  const signingKey = "device-guard-test-key-not-for-production";
  const findUnique = jest.fn();
  let guard: DeviceTokenGuard;

  beforeEach(() => {
    process.env.JWT_SECRET = signingKey;
    findUnique.mockReset();
    findUnique.mockResolvedValue({ deviceId: "TAD-A", status: "OPERATIVO" });
    guard = new DeviceTokenGuard({
      device: { findUnique },
    } as unknown as PrismaService);
  });

  const contextFor = (overrides: Record<string, unknown> = {}) => {
    const request = {
      body: { deviceId: "TAD-A" },
      query: {},
      params: {},
      ...overrides,
      headers: {
        "x-device-token": jwt.sign(
          { deviceId: "TAD-A", type: "OFFLINE_LICENSE" },
          signingKey,
        ),
        ...(overrides.headers as Record<string, unknown> | undefined),
      },
    };
    return {
      context: {
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext,
      request,
    };
  };

  it("authorizes a device requesting only its own resources", async () => {
    const { context, request } = contextFor();
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledWith({
      where: { deviceId: "TAD-A" },
      select: { deviceId: true, status: true },
    });
    expect(request).toHaveProperty("authenticatedDeviceId", "TAD-A");
  });

  it.each([
    [{ body: { deviceId: "TAD-B" } }, "POST /device/sync"],
    [{ body: { device_id: "TAD-B" } }, "POST /device/bulk-sync"],
    [{ query: { device_id: "TAD-B" } }, "GET /assets/manifest"],
    [{ headers: { "x-device-id": "TAD-B" } }, "conflicting device header"],
    [{ params: { deviceId: "TAD-B" } }, "path-scoped device"],
  ])("rejects cross-device access (%s, %s)", async (override, description) => {
    const { context } = contextFor(override);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("allows the command ACK route's command-id path without treating it as a device", async () => {
    const { context } = contextFor({ params: { id: "command-uuid" } });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it("rejects deactivated devices even with matching identity", async () => {
    findUnique.mockResolvedValue({ deviceId: "TAD-A", status: "SUSPENDIDO" });
    const { context } = contextFor();
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
