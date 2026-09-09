import { Module } from "@nestjs/common";
import { SimulationService } from "./simulation.service";
import { SimulationController } from "./simulation.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [SimulationController],
  providers: [SimulationService],
  exports: [SimulationService],
})
export class SimulationModule {}
