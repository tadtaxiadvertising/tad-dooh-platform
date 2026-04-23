import { Controller, Get, Param } from '@nestjs/common';
import { ReferralService } from './referral.service';

@Controller('referral')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Get('generate/:driverId')
  async generate(@Param('driverId') driverId: string) {
    return this.referralService.generate(driverId);
  }
}
