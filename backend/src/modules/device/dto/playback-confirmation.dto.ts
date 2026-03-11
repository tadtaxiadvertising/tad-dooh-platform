import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class PlaybackConfirmationDto {
  @IsString()
  @IsNotEmpty()
  device_id: string;

  @IsString()
  @IsNotEmpty()
  video_id: string;

  @IsString()
  @IsNotEmpty()
  timestamp: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;
}
