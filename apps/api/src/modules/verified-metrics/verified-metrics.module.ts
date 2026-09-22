import { Module } from "@nestjs/common";
import { VerifiedMetricsService } from "./verified-metrics.service";
import { VerifiedMetricsController } from "./verified-metrics.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [VerifiedMetricsController],
  providers: [VerifiedMetricsService],
  exports: [VerifiedMetricsService],
})
export class VerifiedMetricsModule {}