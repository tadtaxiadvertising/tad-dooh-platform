import {
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  IsNotEmpty,
} from "class-validator";
import { Type } from "class-transformer";

export class GpsPointDto {
  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @IsNumber()
  @IsNotEmpty()
  longitude: number;

  @IsNumber()
  @IsNotEmpty()
  speed: number;

  @IsString()
  @IsNotEmpty()
  timestamp: string;

  // Mobile Legacy Support
  lat?: number;
  lng?: number;
}

export class GpsBatchDto {
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsString()
  @IsNotEmpty()
  driverId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GpsPointDto)
  points?: GpsPointDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GpsPointDto)
  locations?: GpsPointDto[];
}
