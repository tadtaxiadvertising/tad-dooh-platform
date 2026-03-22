import { IsString, IsDateString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  advertiser: string;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsOptional()
  target_impressions?: number;

  @IsOptional()
  budget?: number;

  @IsOptional()
  target_devices?: string[];

  @IsBoolean()
  @IsOptional()
  target_all?: boolean;

  @IsString()
  @IsOptional()
  whatsapp?: string;

  @IsString()
  @IsOptional()
  instagram?: string;

  @IsString()
  @IsOptional()
  facebook?: string;

  @IsString()
  @IsOptional()
  websiteUrl?: string;

  @IsString()
  @IsOptional()
  pedidosYaUrl?: string;

  @IsString()
  @IsOptional()
  uberEatsUrl?: string;
}
