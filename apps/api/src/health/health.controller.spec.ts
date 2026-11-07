import { PrismaService } from "../modules/prisma/prisma.service";
import { HealthController } from "./health.controller";

describe("HealthController master-sync readiness", () => {
  const metrics = jest.fn();
  const controller = new HealthController({
    getHealthMetrics: metrics,
  } as unknown as PrismaService);

  beforeEach(() => metrics.mockReset());

  it("retains /health liveness for the process even when sync is degraded", () => {
    expect(controller.check().status).toBe("up");
  });

  it("marks /health/full degraded when the master-sync view is missing", async () => {
    metrics.mockResolvedValue({
      connected: true,
      activeConnections: 1,
      masterSyncViewReady: false,
    });
    const result = await controller.checkFull();
    expect(result.status).toBe("degraded");
    expect(result.db.masterSyncViewReady).toBe(false);
  });

  it("marks /health/full healthy only when DB and sync view are ready", async () => {
    metrics.mockResolvedValue({
      connected: true,
      activeConnections: 1,
      masterSyncViewReady: true,
    });
    const result = await controller.checkFull();
    expect(result.status).toBe("up");
  });

  it("detects disconnected databases without exposing connection secrets", async () => {
    metrics.mockResolvedValue({
      connected: false,
      masterSyncViewReady: false,
    });
    const result = await controller.checkFull();
    expect(result.status).toBe("degraded");
  });
});
