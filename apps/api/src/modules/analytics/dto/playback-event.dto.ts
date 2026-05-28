import { IsString, IsNotEmpty } from 'class-validator';

export class PlaybackEventDto {
  @IsString()
  @IsNotEmpty()
  device_id: string;

  @IsString()
  @IsNotEmpty()
  event: string;

  @IsString()
  @IsNotEmpty()
  video_id: string;

  @IsString()
  @IsNotEmpty()
  // Can be parsed to Date but sent as ISO string "2026-03-06T12:20:00Z"
  timestamp: string;
}
