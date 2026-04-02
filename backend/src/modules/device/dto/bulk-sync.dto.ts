import { IsString, IsArray, ValidateNested, IsNumber, IsOptional, IsDateString, MaxLength, Matches, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkPlaybackDto {
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9_\-]+$/, { message: 'video_id contains invalid characters' })
  video_id: string;

  @IsDateString()
  timestamp: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;
}

export class BulkLocationDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsDateString()
  timestamp: string;
}

export class BulkSyncDto {
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9_\-]+$/, { message: 'device_id contains invalid characters' })
  device_id: string;

  @IsOptional()
  @IsNumber()
  battery_level?: number;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  @Matches(/^[0-9.]+\s?[GMBKmbk]+$/, { message: 'storage_free format is invalid (e.g. 1.2GB)' })
  storage_free?: string;

  @IsArray()
  @ArrayMaxSize(200) // Prevent OOM by limiting batch size
  @ValidateNested({ each: true })
  @Type(() => BulkPlaybackDto)
  playbacks: BulkPlaybackDto[];

  @IsArray()
  @ArrayMaxSize(200) // Prevent OOM by limiting batch size
  @ValidateNested({ each: true })
  @Type(() => BulkLocationDto)
  locations: BulkLocationDto[];
}
