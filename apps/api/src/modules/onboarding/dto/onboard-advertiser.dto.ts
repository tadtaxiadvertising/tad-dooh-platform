// apps/api/src/modules/onboarding/dto/onboard-advertiser.dto.ts
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  MinLength,
  IsNumber,
  Min,
  IsInt,
  IsObject,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class FileMetadataDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  size: number;

  @IsString()
  @IsNotEmpty()
  type: string;
}

export class OnboardAdvertiserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.01)
  budget: number;

  @IsInt()
  @Min(1)
  expectedScreens: number;

  @IsString()
  @IsNotEmpty()
  targetCity: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  campaignMonths?: number;

  @IsOptional()
  includeProduction?: boolean;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => FileMetadataDto)
  fileMetadata?: FileMetadataDto;
}
