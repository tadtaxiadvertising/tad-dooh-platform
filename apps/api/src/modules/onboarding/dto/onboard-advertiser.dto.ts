// apps/api/src/modules/onboarding/dto/onboard-advertiser.dto.ts
import { IsString, IsEmail, IsNotEmpty, IsOptional, IsNumber, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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
  @IsOptional()
  password?: string;

  @IsNumber()
  budget: number;

  @IsNumber()
  expectedScreens: number;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => FileMetadataDto)
  fileMetadata?: FileMetadataDto;
}
