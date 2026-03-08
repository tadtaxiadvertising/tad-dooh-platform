import { PartialType } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  device_id: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  app_version?: string;
}
