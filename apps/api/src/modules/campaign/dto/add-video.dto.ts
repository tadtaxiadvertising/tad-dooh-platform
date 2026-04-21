import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class AddVideoDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  url?: string;

  @IsString()
  @IsOptional()
  media_id?: string;

  @IsNumber()
  duration: number;

  @IsNumber()
  @IsOptional()
  size?: number;

  @IsString()
  @IsOptional()
  mime?: string;
}
