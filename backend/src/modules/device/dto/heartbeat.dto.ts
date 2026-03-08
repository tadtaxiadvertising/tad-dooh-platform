import { IsNumber, IsOptional, IsString } from 'class-validator';

export class HeartbeatDto {
  @IsString()
  device_id: string;

  @IsNumber()
  @IsOptional()
  battery_level?: number;

  @IsString()
  @IsOptional()
  storage_free?: string;

  @IsString()
  @IsOptional()
  player_status?: string;
}
