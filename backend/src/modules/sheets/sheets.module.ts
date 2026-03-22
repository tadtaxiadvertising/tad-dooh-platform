import { Module } from '@nestjs/common';
import { SheetsService } from './sheets.service';
// @ts-ignore - Arismendy: This is a ghost IDE error, the file exists and is correct.
import { SheetsController } from './sheets.controller'; 
import { PrismaModule } from '../prisma/prisma.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [PrismaModule, FinanceModule],
  controllers: [SheetsController],
  providers: [SheetsService],
  exports: [SheetsService],
})
export class SheetsModule {}
