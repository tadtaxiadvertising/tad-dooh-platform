import { IsString, IsNotEmpty } from 'class-validator';

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
}
