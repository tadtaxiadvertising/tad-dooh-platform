import { Module, forwardRef } from "@nestjs/common";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { FinanceModule } from "../finance/finance.module";
import { PrismaModule } from "../prisma/prisma.module";
import { DeviceTokenGuard } from "../device/guards/device-token.guard";

@Module({
  imports: [PrismaModule, forwardRef(() => FinanceModule)],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, DeviceTokenGuard],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
