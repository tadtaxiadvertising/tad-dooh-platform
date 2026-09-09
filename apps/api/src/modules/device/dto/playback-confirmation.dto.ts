import { IsString, IsOptional, IsNumber, IsBoolean } from "class-validator";

export class PlaybackConfirmationDto {
  @IsString()
  device_id!: string;

  @IsString()
  video_id!: string;

  @IsString()
  timestamp!: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsBoolean()
  isSimulated?: boolean;
}
