import { Module } from '@nestjs/common';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PayrollAuditService } from './payroll-audit.service';

@Module({
  imports: [PrismaModule],
  controllers: [DriversController],
  providers: [DriversService, PayrollAuditService],
  exports: [DriversService, PayrollAuditService],
})
export class DriversModule {}
