import {
  IsArray,
  IsString,
  IsNumber,
  ValidateNested,
  ArrayMaxSize,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";

export const GPS_TRACK_BATCH_LIMIT = 500;

class GPSPointDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @IsNumber()
  speed: number;

  @IsNumber()
  timestamp: number;
}

export class TrackBatchDto {
  @IsString() driverId: string;
  @IsString() deviceId: string;

  @IsArray()
  @ArrayMaxSize(GPS_TRACK_BATCH_LIMIT)
  @ValidateNested({ each: true })
  @Type(() => GPSPointDto)
  points: GPSPointDto[];
}
