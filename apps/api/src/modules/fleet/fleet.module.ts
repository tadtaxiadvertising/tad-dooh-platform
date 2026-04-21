import { Module } from '@nestjs/common';
import { FleetController } from './fleet.controller';
import { FleetService } from './fleet.service';
import { DeviceModule } from '../device/device.module';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [DeviceModule, SupabaseModule],
  controllers: [FleetController],
  providers: [FleetService],
})
export class FleetModule {}
