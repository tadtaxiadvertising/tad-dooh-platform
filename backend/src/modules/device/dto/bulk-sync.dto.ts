import { IsString, IsArray, ValidateNested, IsNumber, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkPlaybackDto {
  @IsString()
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
  device_id: string;

  @IsOptional()
  @IsNumber()
  battery_level?: number;

  @IsOptional()
  @IsString()
  storage_free?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkPlaybackDto)
  playbacks: BulkPlaybackDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkLocationDto)
  locations: BulkLocationDto[];
}
