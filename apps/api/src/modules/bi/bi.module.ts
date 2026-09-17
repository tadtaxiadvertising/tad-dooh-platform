import { Module } from "@nestjs/common";
import { BiController } from "./bi.controller";
import { BiService } from "./bi.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { AdvertisersModule } from "../advertisers/advertisers.module";
import { BiScheduler } from "./bi.scheduler";

@Module({
  imports: [PrismaModule, AuthModule, AdvertisersModule],
  controllers: [BiController],
  providers: [BiService, BiScheduler],
  exports: [BiService],
})
export class BiModule {}
