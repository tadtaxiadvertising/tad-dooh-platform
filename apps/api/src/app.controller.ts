import { Controller, Get } from "@nestjs/common";
import { Public } from "./modules/auth/decorators/public.decorator";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "./modules/prisma/prisma.service";

interface ApiStatusResponse {
  status: "UP";
  timestamp: string;
  service: string;
  version: string;
  routes: {
    health: string[];
    api: string;
    docs: string;
  };
}

@ApiTags("Health")
@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  private getStatus(): ApiStatusResponse {
    return {
      status: "UP",
      timestamp: new Date().toISOString(),
      service: "TAD API Gateway",
      version: "v12-shelter",
      routes: {
        health: ["/api/health", "/health", "/api/v1/health"],
        api: "/api/v1",
        docs: "/api/docs",
      },
    };
  }

  /**
   * Root/status endpoints for EasyPanel probes and browser smoke tests.
   * Keep these public so a successful deploy never looks like a 404.
   */
  @Get("/")
  @Get("api")
  @Get("api/v1")
  @Public()
  getRoot() {
    return this.getStatus();
  }

  /**
   * Health Check endpoint - Requerido por EasyPanel v10+
   * Verifica conectividad real a la base de datos
   */
  @Get("api/health")
  @Public() // Bypassear el AuthGuard global
  async getHealth() {
    const dbHealth = await this.prisma.getHealthMetrics();
    const status = dbHealth.connected ? "UP" : "DEGRADED";
    return {
      status,
      timestamp: new Date().toISOString(),
      service: "TAD API Gateway",
      version: "v12-shelter",
      database: {
        connected: dbHealth.connected,
        activeConnections: dbHealth.activeConnections,
      },
      routes: {
        health: ["/api/health", "/health", "/api/v1/health"],
        api: "/api/v1",
        docs: "/api/docs",
      },
    };
  }
}
