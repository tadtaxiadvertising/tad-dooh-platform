import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { Public } from "../modules/auth/decorators/public.decorator";
import { PrismaService } from "../modules/prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Public()
  check() {
    // Retornamos 200 OK para el orquestador de Easypanel
    return {
      status: "up",
      timestamp: new Date().toISOString(),
      service: "tad-backend-api",
      node_env: process.env.NODE_ENV,
    };
  }

  @Get("db")
  @Public()
  async dbMetrics() {
    return this.prisma.getHealthMetrics();
  }

  /**
   * Orchestrator readiness: HTTP 200 only when the database and the
   * master-sync view are usable. A degraded application must return HTTP
   * 503 (not a JSON body containing "degraded" with HTTP 200).
   *
   * The response is intentionally minimal: do not expose DB connection
   * metrics, stack traces, or internal schema information to public probes.
   */
  @Get("ready")
  @Public()
  async checkReady() {
    try {
      const db = await this.prisma.getHealthMetrics();
      if (db?.connected === true && db?.masterSyncViewReady === true) {
        return { status: "up" };
      }
    } catch {
      // Mask operational failure details from unauthenticated probes.
    }
    throw new ServiceUnavailableException({ status: "degraded" });
  }

  @Get("full")
  @Public()
  async checkFull() {
    const db = await this.prisma.getHealthMetrics();
    return {
      // Preserve /health liveness for EasyPanel, but expose degraded
      // readiness when API-to-tablet master sync cannot deliver campaigns.
      status: db.connected && db.masterSyncViewReady ? "up" : "degraded",
      timestamp: new Date().toISOString(),
      service: "tad-backend-api",
      // Public staging/readiness diagnostics require two booleans only.
      // Do not disclose memory usage, connection counts or server internals.
      db: {
        connected: db.connected === true,
        masterSyncViewReady: db.masterSyncViewReady === true,
      },
    };
  }
}
