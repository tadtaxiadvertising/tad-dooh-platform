import { IsString, IsOptional, IsNumber } from "class-validator";

export class AddMediaAssetDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsString()
  filename!: string;

  @IsString()
  url!: string;

  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @IsOptional()
  @IsString()
  checksum?: string;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsString()
  status?: string;
}
