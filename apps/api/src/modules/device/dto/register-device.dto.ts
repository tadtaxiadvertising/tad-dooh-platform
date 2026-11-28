import { IsString, IsOptional } from "class-validator";

export class RegisterDeviceDto {
  @IsString()
  device_id!: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  os_version?: string;

  @IsOptional()
  @IsString()
  app_version?: string;

  // Legacy clients may still send driver_id during registration.
  // It is deliberately ignored by this public endpoint: only the
  // authenticated ADMIN pairing workflow may change Device.driverId.
  @IsOptional()
  @IsString()
  driver_id?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;
}
