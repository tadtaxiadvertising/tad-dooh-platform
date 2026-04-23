import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance/:driverId')
  async getBalance(@Param('driverId') driverId: string) {
    return this.walletService.getBalance(driverId);
  }

  @Post('withdraw')
  async withdraw(@Body() payload: { driverId: string; amount: number }) {
    return this.walletService.withdraw(payload.driverId, payload.amount);
  }

  @Put('bank')
  async updateBank(
    @Body() payload: { driverId: string; bank: string; account: string; type: string; ownerName: string; idDocument: string },
  ) {
    return this.walletService.updateBank(payload.driverId, payload);
  }
}
