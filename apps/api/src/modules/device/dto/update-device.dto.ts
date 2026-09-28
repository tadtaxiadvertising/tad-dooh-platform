import { IsOptional, IsString } from "class-validator";

export class UpdateDeviceDto {
  @IsOptional()
  @IsString()
  taxiNumber?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  driverId?: string | null;
}