import { Module } from "@nestjs/common";
import { FinanceController } from "./finance.controller";
import { FinanceService } from "./finance.service";
import { InvoiceService } from "./invoice.service";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { DriversModule } from "../drivers/drivers.module";
import { AdvertisersModule } from "../advertisers/advertisers.module";

@Module({
  imports: [PrismaModule, NotificationsModule, DriversModule, AdvertisersModule],
  controllers: [FinanceController],
  providers: [FinanceService, InvoiceService],
  exports: [FinanceService, InvoiceService],
})
export class FinanceModule {}
