import { IsOptional, IsString, Length, Matches } from "class-validator";

/**
 * Completes the existing Supabase OAuth advertiser, never creates an account.
 * Client cannot set id, role, status, discounts, campaign or approval state.
 */
export class CompleteOAuthAdvertiserProfileDto {
  @IsString()
  @Length(2, 120)
  companyName: string;

  @IsString()
  @Length(2, 120)
  contactName: string;

  @IsOptional()
  @IsString()
  @Matches(/^[+0-9 ()-]{7,25}$/)
  phone?: string;
}
