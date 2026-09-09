import { Module } from "@nestjs/common";
import { DeviceController } from "./device.controller";
import { DeviceService } from "./device.service";
import { CampaignModule } from "../campaign/campaign.module";
import { FinanceModule } from "../finance/finance.module";
import { DeviceAdminController } from "./device-admin.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { DeviceTokenGuard } from "./guards/device-token.guard";

@Module({
  imports: [CampaignModule, FinanceModule, PrismaModule],
  controllers: [DeviceController, DeviceAdminController],
  providers: [DeviceService, DeviceTokenGuard],
  exports: [DeviceService, DeviceTokenGuard],
})
export class DeviceModule {}
