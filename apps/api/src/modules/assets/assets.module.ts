import { Module } from "@nestjs/common";
import { AssetsController } from "./assets.controller";
import { AssetsService } from "./assets.service";
import { PrismaModule } from "../prisma/prisma.module";
import { DeviceModule } from "../device/device.module";

@Module({
  imports: [PrismaModule, DeviceModule],
  controllers: [AssetsController],
  providers: [AssetsService],
})
export class AssetsModule {}
