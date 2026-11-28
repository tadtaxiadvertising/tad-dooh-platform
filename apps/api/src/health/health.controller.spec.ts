import { ServiceUnavailableException } from "@nestjs/common";
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
  it("public /health/full exposes only safe DB flags, never process memory or connection count", async () => {
    metrics.mockResolvedValue({
      connected: true,
      activeConnections: 42,
      masterSyncViewReady: true,
    });
    const response = await controller.checkFull();
    expect(response.db).toEqual({ connected: true, masterSyncViewReady: true });
    expect(response).not.toHaveProperty("memory");
    expect(response).not.toHaveProperty("uptime");
    expect(response).not.toHaveProperty("node_env");
    expect(response.db).not.toHaveProperty("activeConnections");
  });

  it("returns minimal HTTP readiness success only when DB and master-sync view pass", async () => {
    metrics.mockResolvedValue({
      connected: true,
      activeConnections: 32,
      masterSyncViewReady: true,
    });
    await expect(controller.checkReady()).resolves.toEqual({ status: "up" });
  });

  it.each([
    { connected: false, masterSyncViewReady: false },
    { connected: true, masterSyncViewReady: false },
    { connected: false, masterSyncViewReady: true },
    { connected: true, masterSyncViewReady: undefined },
    null,
  ])(
    "fails closed with 503 when readiness metrics are degraded: %p",
    async (result) => {
      metrics.mockResolvedValue(result);
      try {
        await controller.checkReady();
        throw new Error("Expected readiness failure");
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceUnavailableException);
        const failure = error as ServiceUnavailableException;
        expect(failure.getStatus()).toBe(503);
        expect(failure.getResponse()).toEqual({
          status: "degraded",
        });
      }
    },
  );

  it("masks database errors from unauthenticated readiness probes", async () => {
    metrics.mockRejectedValue(new Error("internal-connection-details"));
    try {
      await controller.checkReady();
      throw new Error("Expected readiness failure");
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect(
        JSON.stringify((error as ServiceUnavailableException).getResponse()),
      ).not.toContain("internal-connection-details");
    }
  });

  it("keeps /health/full informative and /health unconditionally live", async () => {
    metrics.mockResolvedValue({
      connected: true,
      activeConnections: 1,
      masterSyncViewReady: false,
    });
    expect(controller.check().status).toBe("up");
    await expect(controller.checkFull()).resolves.toEqual(
      expect.objectContaining({ status: "degraded" }),
    );
    await expect(controller.checkReady()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
