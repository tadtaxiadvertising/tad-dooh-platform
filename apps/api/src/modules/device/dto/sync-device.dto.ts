import { IsString, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class SyncDeviceDto {
  @IsString()
  deviceId: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  batteryLevel?: number;

  @IsOptional()
  @IsString()
  lastHash?: string;
}
