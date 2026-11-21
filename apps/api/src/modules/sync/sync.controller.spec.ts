import { HttpException, HttpStatus } from "@nestjs/common";
import type { Response } from "express";
import { SyncController } from "./sync.controller";
import { SyncService } from "./sync.service";

function responseMock() {
  const res = {
    setHeader: jest.fn(),
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

describe("SyncController license and device-status safety", () => {
  const activeManifest = {
    timestamp: "2026-11-07T23:00:00.000Z",
    expiresAt: "2026-11-08T23:00:00.000Z",
    etag: "unchanged-content-hash",
    licenseToken: "fresh-device-license",
    device: { id: "uuid-1", deviceId: "TAD-0001", taxi: "TX-01" },
    count: 0,
    playlist: [],
    schedules: [],
  };

  it("generates a fresh manifest on every request, even if media ETag is unchanged", async () => {
    const getDeviceManifest = jest
      .fn()
      .mockResolvedValueOnce({ ...activeManifest, licenseToken: "license-1" })
      .mockResolvedValueOnce({ ...activeManifest, licenseToken: "license-2" });
    const controller = new SyncController({
      getDeviceManifest,
    } as unknown as SyncService);
    const firstRes = responseMock();
    const secondRes = responseMock();

    const first = await controller.getDeviceManifest(
      "TAD-0001",
      firstRes as unknown as Response,
    );
    const second = await controller.getDeviceManifest(
      "TAD-0001",
      secondRes as unknown as Response,
    );

    expect(getDeviceManifest).toHaveBeenCalledTimes(2);
    expect(first?.licenseToken).toBe("license-1");
    expect(second?.licenseToken).toBe("license-2");
    for (const res of [firstRes, secondRes]) {
      expect(res.setHeader).toHaveBeenCalledWith(
        "Cache-Control",
        "private, no-store",
      );
      expect(res.setHeader).toHaveBeenCalledWith("ETag", activeManifest.etag);
      expect(res.status).not.toHaveBeenCalledWith(HttpStatus.NOT_MODIFIED);
    }
  });

  it("cannot bypass a new subscription kill-switch with a cached ETag", async () => {
    const getDeviceManifest = jest
      .fn()
      .mockResolvedValueOnce(activeManifest)
      .mockResolvedValueOnce({
        ...activeManifest,
        licenseToken: "grace-token",
        killSwitch: true,
        killSwitchReason: "SUBSCRIPTION_UNPAID",
        playlist: [],
      });
    const controller = new SyncController({
      getDeviceManifest,
    } as unknown as SyncService);
    const firstRes = responseMock();
    const secondRes = responseMock();

    await controller.getDeviceManifest(
      "TAD-0001",
      firstRes as unknown as Response,
    );
    await controller.getDeviceManifest(
      "TAD-0001",
      secondRes as unknown as Response,
    );

    expect(getDeviceManifest).toHaveBeenCalledTimes(2);
    expect(secondRes.status).toHaveBeenCalledWith(HttpStatus.PAYMENT_REQUIRED);
    expect(secondRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ killSwitch: true }),
    );
    expect(secondRes.setHeader).toHaveBeenCalledWith(
      "Cache-Control",
      "private, no-store",
    );
  });

  it("propagates disabled-device failures instead of replying 304", async () => {
    const getDeviceManifest = jest
      .fn()
      .mockRejectedValue(
        new HttpException("DEVICE_DEACTIVATED", HttpStatus.FORBIDDEN),
      );
    const controller = new SyncController({
      getDeviceManifest,
    } as unknown as SyncService);
    const res = responseMock();

    await expect(
      controller.getDeviceManifest("TAD-0001", res as unknown as Response),
    ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
    expect(res.status).not.toHaveBeenCalledWith(HttpStatus.NOT_MODIFIED);
  });

  it("rejects missing hardware identity before querying Prisma", async () => {
    const getDeviceManifest = jest.fn();
    const controller = new SyncController({
      getDeviceManifest,
    } as unknown as SyncService);
    const res = responseMock();

    await expect(
      controller.getDeviceManifest("", res as unknown as Response),
    ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    expect(getDeviceManifest).not.toHaveBeenCalled();
  });
});
