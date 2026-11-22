import "reflect-metadata";
import type { ExecutionContext } from "@nestjs/common";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import * as jwt from "jsonwebtoken";
import { IS_PUBLIC_KEY } from "../auth/decorators/public.decorator";
import { DeviceTokenGuard } from "../device/guards/device-token.guard";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";

describe("External GPS device possession gate", () => {
  const key = "external-gps-test-fixture-not-for-production";
  const findUnique = jest.fn();
  const updateDeviceLocationFromMobile = jest.fn();
  const handler = AnalyticsController.prototype.trackExternalGps;

  beforeEach(() => {
    process.env.JWT_SECRET = key;
    jest.resetAllMocks();
    findUnique.mockResolvedValue({
      deviceId: "TAD-A",
      status: "OPERATIVO",
    });
    updateDeviceLocationFromMobile.mockResolvedValue({ id: "device-uuid" });
  });

  const makeContext = (hardwareId: string, token?: string): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: token ? { "x-device-token": token } : {},
          body: { deviceId: hardwareId, lat: 19.45, lng: -70.69 },
          query: {},
          params: {},
        }),
      }),
    }) as unknown as ExecutionContext;

  const deviceToken = (deviceId: string, type = "DEVICE_AUTH") =>
    jwt.sign({ deviceId, type }, key);

  it("installs the purpose-bound guard on the route even when portal JWT is skipped", () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toContain(
      DeviceTokenGuard,
    );
  });

  it("rejects missing device credentials before any database read", async () => {
    const guard = new DeviceTokenGuard({
      device: { findUnique },
    } as never);

    await expect(
      guard.canActivate(makeContext("TAD-A")),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("rejects cross-device spoofing and offline-license tokens", async () => {
    const guard = new DeviceTokenGuard({
      device: { findUnique },
    } as never);
    await expect(
      guard.canActivate(makeContext("TAD-B", deviceToken("TAD-A"))),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      guard.canActivate(
        makeContext("TAD-A", deviceToken("TAD-A", "OFFLINE_LICENSE")),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("allows only an operative device with matching DEVICE_AUTH purpose", async () => {
    const guard = new DeviceTokenGuard({
      device: { findUnique },
    } as never);
    await expect(
      guard.canActivate(makeContext("TAD-A", deviceToken("TAD-A"))),
    ).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledWith({
      where: { deviceId: "TAD-A" },
      select: { deviceId: true, status: true },
    });
  });

  it("preserves the mobile JSON response contract for authenticated callers", async () => {
    const controller = new AnalyticsController(
      { updateDeviceLocationFromMobile } as unknown as AnalyticsService,
      {} as never,
      {} as never,
      {} as never,
    );
    const body = { deviceId: "TAD-A", lat: 19.45, lng: -70.69 };
    await expect(controller.trackExternalGps(body)).resolves.toEqual({
      success: true,
    });
    expect(updateDeviceLocationFromMobile).toHaveBeenCalledWith(body);
  });
});
