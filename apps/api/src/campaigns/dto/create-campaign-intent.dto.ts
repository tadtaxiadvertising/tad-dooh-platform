// backend/src/campaigns/dto/create-campaign-intent.dto.ts
import { IsString, IsNumber, Min, IsOptional, IsObject } from 'class-validator';

export class CreateCampaignIntentDto {
  @IsString()
  brandName: string;

  @IsNumber()
  @Min(500)
  budget: number;

  @IsNumber()
  @Min(1)
  expectedScreens: number;

  @IsOptional()
  @IsObject()
  fileMetadata?: Record<string, any>;
}
