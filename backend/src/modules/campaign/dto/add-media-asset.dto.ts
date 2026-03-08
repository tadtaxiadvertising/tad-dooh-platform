import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class AddMediaAssetDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsNumber()
  fileSize: number;

  @IsString()
  @IsNotEmpty()
  checksum: string;

  @IsNumber()
  @IsOptional()
  duration?: number;
}
