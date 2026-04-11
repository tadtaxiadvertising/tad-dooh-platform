import { IsString, IsNotEmpty, IsNumber, IsOptional, Max } from 'class-validator';

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
  @Max(57671680, { message: 'El archivo excede el límite permitido de 55MB' })
  fileSize?: number;

  @IsString()
  @IsOptional()
  checksum?: string;

  @IsNumber()
  @IsOptional()
  duration?: number;

  @IsString()
  @IsOptional()
  status?: string; // 'READY', 'PENDING', 'RENDERING'
}
