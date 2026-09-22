import { Module } from "@nestjs/common";
import { QrScanService } from "./qr-scan.service";
import { QrScanController } from "./qr-scan.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [QrScanController],
  providers: [QrScanService],
  exports: [QrScanService],
})
export class QrScanModule {}