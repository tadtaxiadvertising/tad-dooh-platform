import { IsArray, IsString, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class GPSPointDto {
  @IsNumber() lat: number;
  @IsNumber() lng: number;
  @IsNumber() speed: number;
  @IsNumber() timestamp: number;
}

export class TrackBatchDto {
  @IsString() driverId: string;
  @IsString() deviceId: string;
  
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GPSPointDto)
  points: GPSPointDto[];
}
