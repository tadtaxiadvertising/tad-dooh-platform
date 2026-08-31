import { IsString, IsOptional, IsNumber } from 'class-validator';

export class HeartbeatDto {
  @IsString()
  device_id!: string;

  @IsOptional()
  @IsNumber()
  battery_level?: number;

  @IsOptional()
  @IsString()
  storage_free?: string;

  @IsOptional()
  @IsString()
  player_status?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsString()
  timestamp?: string;
}
