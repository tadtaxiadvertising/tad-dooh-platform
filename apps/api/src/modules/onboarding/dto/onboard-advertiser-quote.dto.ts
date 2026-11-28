import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from "class-validator";

/** Public input is a request for a quote, never an assertion of eligibility. */
export class OnboardAdvertiserQuoteDto {
  @IsInt()
  @Min(1)
  @Max(100)
  expectedScreens: number;

  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  campaignMonths?: number;

  @IsBoolean()
  @IsOptional()
  includeProduction?: boolean;

  @IsString()
  @Matches(/^[A-Za-z0-9_-]{1,64}$/)
  @IsOptional()
  referralCode?: string;
}
