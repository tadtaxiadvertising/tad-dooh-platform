import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ReferralService } from "./referral.service";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import {
  CloseCommissionBatchDto,
  ConfirmPaymentEvidenceDto,
  CreateReferralConversionDto,
  ReversePaymentEvidenceDto,
  SubmitPaymentEvidenceDto,
} from "./referral-payment.dto";

@Roles(UserRole.ADMIN)
@Controller("referral")
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Get("generate/:driverId")
  async generate(@Param("driverId") driverId: string) {
    return this.referralService.generate(driverId);
  }

  @Get("stats")
  async getStats() {
    return this.referralService.getStats();
  }

  @Get("network")
  async getNetwork() {
    return this.referralService.getNetwork();
  }

  @Post("conversions")
  async createConversion(@Body() dto: CreateReferralConversionDto) {
    return this.referralService.createConversion(dto);
  }

  @Post("payment-evidence")
  async submitPaymentEvidence(@Body() dto: SubmitPaymentEvidenceDto) {
    return this.referralService.submitPaymentEvidence(dto);
  }

  @Post("payment-evidence/:id/confirm")
  async confirmPaymentEvidence(
    @Param("id") id: string,
    @Body() dto: ConfirmPaymentEvidenceDto,
  ) {
    return this.referralService.confirmPaymentEvidence(id, dto);
  }

  @Post("payment-evidence/:id/reject")
  async rejectPaymentEvidence(
    @Param("id") id: string,
    @Body() dto: ConfirmPaymentEvidenceDto,
  ) {
    return this.referralService.rejectPaymentEvidence(id, dto);
  }

  @Post("payment-evidence/:id/reverse")
  async reversePaymentEvidence(
    @Param("id") id: string,
    @Body() dto: ReversePaymentEvidenceDto,
  ) {
    return this.referralService.reversePaymentEvidence(id, dto);
  }

  @Post("payout-batches/close")
  async closeCommissionBatch(@Body() dto: CloseCommissionBatchDto) {
    return this.referralService.closeCommissionBatch(dto);
  }
}
