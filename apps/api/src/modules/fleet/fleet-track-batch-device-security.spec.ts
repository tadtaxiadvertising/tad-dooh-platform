import "reflect-metadata";
import type { ExecutionContext } from "@nestjs/common";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import * as jwt from "jsonwebtoken";
import { IS_PUBLIC_KEY } from "../auth/decorators/public.decorator";
import { DeviceTokenGuard } from "../device/guards/device-token.guard";
import { FleetController } from "./fleet.controller";
import { FleetService } from "./fleet.service";

describe("Fleet track-batch device possession gate", () => {
  const secret = "fleet-track-batch-test-fixture-not-for-production";
  const findUnique = jest.fn();
  const ingestTelemetryBatch = jest.fn();
  const handler = FleetController.prototype.trackBatch;

  const makeContext = (deviceId: string, token?: string): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: token ? { "x-device-token": token } : {},
          body: {
            driverId: "driver-approved",
            deviceId,
            points: [{ lat: 19.45, lng: -70.69, speed: 0, timestamp: 1 }],
          },
          query: {},
          params: {},
        }),
      }),
    }) as unknown as ExecutionContext;

  const tokenFor = (deviceId: string, type = "DEVICE_AUTH") =>
    jwt.sign({ deviceId, type }, secret);

  beforeEach(() => {
    process.env.JWT_SECRET = secret;
    jest.resetAllMocks();
    findUnique.mockResolvedValue({ deviceId: "TAD-A", status: "OPERATIVO" });
    ingestTelemetryBatch.mockResolvedValue({ count: 1, input: 1 });
  });

  it("installs a purpose-bound guard even though portal JWT is skipped", () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toContain(
      DeviceTokenGuard,
    );
  });

  it("rejects missing credentials before looking up a device", async () => {
    const guard = new DeviceTokenGuard({ device: { findUnique } } as never);
    await expect(
      guard.canActivate(makeContext("TAD-A")),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(findUnique).not.toHaveBeenCalled();
    expect(ingestTelemetryBatch).not.toHaveBeenCalled();
  });

  it("rejects tokens for a different hardware device", async () => {
    const guard = new DeviceTokenGuard({ device: { findUnique } } as never);
    await expect(
      guard.canActivate(makeContext("TAD-B", tokenFor("TAD-A"))),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(findUnique).not.toHaveBeenCalled();
    expect(ingestTelemetryBatch).not.toHaveBeenCalled();
  });

  it("rejects OFFLINE_LICENSE tokens", async () => {
    const guard = new DeviceTokenGuard({ device: { findUnique } } as never);
    await expect(
      guard.canActivate(
        makeContext("TAD-A", tokenFor("TAD-A", "OFFLINE_LICENSE")),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("accepts matching DEVICE_AUTH for an operative device", async () => {
    const guard = new DeviceTokenGuard({ device: { findUnique } } as never);
    await expect(
      guard.canActivate(makeContext("TAD-A", tokenFor("TAD-A"))),
    ).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledWith({
      where: { deviceId: "TAD-A" },
      select: { deviceId: true, status: true },
    });
  });

  it("retains the existing response for authorized GPS batches", async () => {
    const controller = new FleetController({
      ingestTelemetryBatch,
    } as unknown as FleetService);
    const payload = {
      driverId: "driver-approved",
      deviceId: "TAD-A",
      points: [{ lat: 19.45, lng: -70.69, speed: 0, timestamp: 1 }],
    };
    await expect(controller.trackBatch(payload)).resolves.toEqual({
      count: 1,
      input: 1,
    });
    expect(ingestTelemetryBatch).toHaveBeenCalledWith(payload);
  });
});
