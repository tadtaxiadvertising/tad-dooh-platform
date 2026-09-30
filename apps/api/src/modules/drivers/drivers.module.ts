import { Module } from "@nestjs/common";
import { DriversController } from "./drivers.controller";
import { DriversService } from "./drivers.service";
import { PrismaModule } from "../prisma/prisma.module";
import { PayrollAuditService } from "./payroll-audit.service";
import { SystemSettingsModule } from "../system-settings/system-settings.module";
import { ReferralModule } from "../referral/referral.module";

@Module({
  imports: [PrismaModule, SystemSettingsModule, ReferralModule],
  controllers: [DriversController],
  providers: [DriversService, PayrollAuditService],
  exports: [DriversService, PayrollAuditService],
})
export class DriversModule {}
