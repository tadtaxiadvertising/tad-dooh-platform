import {
  IsString,
  IsDateString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  IsArray,
} from "class-validator";

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  advertiser: string;

  @IsString()
  @IsOptional()
  advertiser_id?: string;

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
  target_city?: string;

  /** Targeting multi-ciudad (JSONB array). Vacío [] = sin restricción por ciudad. */
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  target_cities?: string[];

  /** Targeting multi-flota (JSONB array). Vacío [] = sin restricción por flota. */
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  target_fleets?: string[];

  @IsString()
  @IsOptional()
  category?: string;

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
