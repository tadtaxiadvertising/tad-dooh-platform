import { Controller, Get } from "@nestjs/common";
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
      node_env: process.env.NODE_ENV,
      db,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
    };
  }
}
