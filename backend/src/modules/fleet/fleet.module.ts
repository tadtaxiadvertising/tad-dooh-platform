import { Module } from '@nestjs/common';
import { FleetController } from './fleet.controller';
import { FleetService } from './fleet.service';
import { DeviceModule } from '../device/device.module';

@Module({
  imports: [DeviceModule],
  controllers: [FleetController],
  providers: [FleetService],
})
export class FleetModule {}
