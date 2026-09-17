import { Module } from "@nestjs/common";
import { AdvertisersController } from "./advertisers.controller";
import { AdvertisersService } from "./advertisers.service";
import { AdvertiserBillingService } from "./advertiser-billing.service";
import { PrismaModule } from "../prisma/prisma.module";
import { FinanceModule } from "../finance/finance.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [PrismaModule, FinanceModule, NotificationsModule],
  controllers: [AdvertisersController],
  providers: [AdvertisersService, AdvertiserBillingService],
  exports: [AdvertisersService, AdvertiserBillingService],
})
export class AdvertisersModule {}
