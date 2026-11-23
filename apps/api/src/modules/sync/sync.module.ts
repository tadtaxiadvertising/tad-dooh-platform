import { Module } from "@nestjs/common";
import { SyncController } from "./sync.controller";
import { SyncService } from "./sync.service";
import { PrismaModule } from "../prisma/prisma.module";
import { DeviceTokenGuard } from "../device/guards/device-token.guard";

@Module({
  imports: [PrismaModule],
  controllers: [SyncController],
  providers: [SyncService, DeviceTokenGuard],
  exports: [SyncService],
})
export class SyncModule {}
