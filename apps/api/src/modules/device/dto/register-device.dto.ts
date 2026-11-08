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

  @IsOptional()
  @IsString()
  driver_id?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;
}
