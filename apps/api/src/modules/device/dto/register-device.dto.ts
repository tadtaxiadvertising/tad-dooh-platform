import { PartialType } from '@nestjs/swagger';

export class RegisterDeviceDto {
  device_id!: string;
  model?: string;
  os_version?: string;
  app_version?: string;
  driver_id?: string;
  manufacturer?: string;
}