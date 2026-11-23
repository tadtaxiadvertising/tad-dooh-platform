import { HttpStatus } from "@nestjs/common";
import type { Response } from "express";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService, safeQrDestinationUrl } from "./analytics.service";

describe("Passenger QR redirect safety", () => {
  const fallback = "https://tad.do";

  it.each([
    ["javascript:alert(1)", fallback],
    ["data:text/html,<script>alert(1)</script>", fallback],
    ["file:///etc/passwd", fallback],
    ["//attacker.example.invalid/offer", fallback],
    [
      "https://brand.example.invalid/offer\nLocation: https://evil.invalid",
      fallback,
    ],
    ["", fallback],
    [null, fallback],
    [undefined, fallback],
  ])("refuses unsafe campaign QR target %j", (candidate, expected) => {
    expect(safeQrDestinationUrl(candidate)).toBe(expected);
  });

  it("rejects destinations containing embedded user credentials", () => {
    const target = new URL("https://brand.example.invalid/offer");
    target.username = "fixture-user";
    target.password = "fixture-password";
    expect(safeQrDestinationUrl(target.toString())).toBe(fallback);
    target.password = "";
    expect(safeQrDestinationUrl(target.toString())).toBe(fallback);
  });

  it.each([
    "https://brand.example.invalid/menu?utm_source=tad",
    "http://legacy.example.invalid/offer",
  ])("preserves a legitimate web target %s", (target) => {
    expect(safeQrDestinationUrl(target)).toBe(target);
  });

  it("records a scan but refuses an unsafe stored target", async () => {
    const findUnique = jest.fn().mockResolvedValue({
      targetUrl: "javascript:alert(1)",
    });
    const create = jest.fn().mockResolvedValue({ id: "scan-1" });
    const service = new AnalyticsService(
      {
        campaign: { findUnique },
        analyticsEvent: { create },
      } as never,
      {} as never,
    );

    await expect(service.registerQrScan("campaign-1", "device-1")).resolves.toBe(
      fallback,
    );
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "campaign-1" },
      select: { targetUrl: true },
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        campaignId: "campaign-1",
        deviceId: "device-1",
        eventType: "QR_SCAN",
      }),
    });
  });

  it("redirects with uncached HTTP 302 and no-referrer", async () => {
    const registerQrScan = jest
      .fn()
      .mockResolvedValue("https://brand.example.invalid/menu");
    const controller = new AnalyticsController(
      { registerQrScan } as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const set = jest.fn();
    const redirect = jest.fn().mockReturnValue("redirect-sent");
    const response = { set, redirect } as unknown as Response;

    await expect(
      controller.trackQrScan("campaign-1", "device-1", response),
    ).resolves.toBe("redirect-sent");
    expect(registerQrScan).toHaveBeenCalledWith("campaign-1", "device-1");
    expect(set).toHaveBeenCalledWith({
      "Cache-Control": "no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
    });
    expect(redirect).toHaveBeenCalledWith(
      HttpStatus.FOUND,
      "https://brand.example.invalid/menu",
    );
    expect(redirect).toHaveBeenCalledTimes(1);
  });
});
