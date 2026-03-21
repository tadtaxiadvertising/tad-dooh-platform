import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class AddMediaAssetDto {
  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsNumber()
  @IsOptional()
  fileSize?: number;

  @IsString()
  @IsOptional()
  checksum?: string;

  @IsNumber()
  @IsOptional()
  duration?: number;
}
