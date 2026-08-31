import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkPlaybackDto {
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

export class BulkLocationDto {
  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;

  @IsString()
  timestamp!: string;

  @IsOptional()
  @IsBoolean()
  isSimulated?: boolean;
}

export class BulkSyncDto {
  @IsString()
  device_id!: string;

  @IsOptional()
  @IsNumber()
  battery_level?: number;

  @IsOptional()
  @IsString()
  storage_free?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkPlaybackDto)
  playbacks!: BulkPlaybackDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkLocationDto)
  locations!: BulkLocationDto[];

  @IsOptional()
  @IsBoolean()
  isSimulated?: boolean;
}
