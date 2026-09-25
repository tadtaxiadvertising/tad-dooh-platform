import { Type } from "class-transformer";
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUrl, IsUUID, Min } from "class-validator";

export class CreateReferralConversionDto {
  @IsString()
  referralCode!: string;

  @IsIn(["DRIVER", "ADVERTISER"])
  conversionType!: "DRIVER" | "ADVERTISER";

  @IsUUID()
  referrerDriverId!: string;

  @IsOptional()
  @IsUUID()
  referredDriverId?: string;

  @IsOptional()
  @IsUUID()
  referredAdvertiserId?: string;
}

export class SubmitPaymentEvidenceDto {
  @IsUUID()
  referralConversionId!: string;

  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount!: number;

  @IsOptional()
  @IsIn(["DOP", "USD", "EUR"])
  currency?: "DOP" | "USD" | "EUR";

  @IsOptional()
  @IsUrl({ protocols: ["https"], require_protocol: true })
  receiptUrl?: string;

  @IsOptional()
  @IsString()
  externalReference?: string;

  @IsOptional()
  @IsString()
  submittedBy?: string;
}

export class ConfirmPaymentEvidenceDto {
  @IsOptional()
  @IsString()
  reviewedBy?: string;

  @IsOptional()
  @IsString()
  reviewNote?: string;
}

export class ReversePaymentEvidenceDto {
  @IsOptional()
  @IsString()
  reviewedBy?: string;

  @IsString()
  reviewNote!: string;
}

export class CloseCommissionBatchDto {
  @IsDateString()
  cutoffDate!: string;
}
