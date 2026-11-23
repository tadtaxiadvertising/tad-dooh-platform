import { UserRole } from "../auth/decorators/roles.decorator";
import { VerifiedMetricsService } from "./verified-metrics.service";

describe("Verified campaign metrics — by-device hardware ID", () => {
  it("counts verified plays by physical hardware ID, not UUID", async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: "campaign-1",
      name: "Test",
      status: "ACTIVE",
      mediaAssets: [{ id: "video-1", filename: "ad.mp4", weight: 1 }],
      devices: [
        {
          device: {
            id: "internal-device-uuid",
            deviceId: "TAD-PHYSICAL-001",
            taxiNumber: "T-001",
            driver: { id: "driver-1", fullName: "Test Driver" },
          },
        },
      ],
    });
    const findMany = jest.fn().mockResolvedValue([
      {
        videoId: "video-1",
        deviceId: "TAD-PHYSICAL-001",
        timestamp: new Date("2026-11-15T12:00:00.000Z"),
      },
    ]);
    const service = new VerifiedMetricsService({
      campaign: { findUnique },
      playbackEvent: { findMany },
    } as never);

    const report = await service.getCampaignVerifiedStats(
      "campaign-1",
      new Date("2026-11-01T00:00:00.000Z"),
      new Date("2026-11-30T23:59:59.000Z"),
      { role: UserRole.ADMIN },
    );

    expect(report.totalVerifiedPlays).toBe(1);
    expect(report.byDevice).toHaveLength(1);
    expect(report.byDevice[0].verifiedPlays).toBe(1);
    // Preserve the existing response field contract (internal UUID).
    expect(report.byDevice[0].deviceId).toBe("internal-device-uuid");
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          eventType: "play_confirm",
          verified: true,
        }),
      }),
    );
  });
});
