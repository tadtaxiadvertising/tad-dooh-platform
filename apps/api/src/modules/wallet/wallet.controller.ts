import { Controller, Get, Post, Put, Body, Param, UseInterceptors, UsePipes, BadRequestException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';
import { z } from 'zod';

// Zod schema for Bank Info
export const BankInfoSchema = z.object({
  driverId: z.string().uuid().optional(),
  banco: z.string().min(3, 'El nombre del banco es muy corto'),
  cuenta: z.string().regex(/^\d{10,20}$/, 'Número de cuenta inválido (debe tener entre 10 y 20 dígitos)'),
  tipo: z.enum(['AHORRO', 'CORRIENTE']),
  cedula: z.string().regex(/^\d{11}$/, 'La cédula dominicana debe tener 11 dígitos'),
  ownerName: z.string().min(3).optional(),
});

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance/:driverId')
  async getBalance(@Param('driverId') driverId: string) {
    return this.walletService.getBalance(driverId);
  }

  @Post('withdraw')
  @UseInterceptors(IdempotencyInterceptor)
  async withdraw(@Body() payload: { driverId: string; amount: number }) {
    return this.walletService.withdraw(payload.driverId, payload.amount);
  }

  @Put('bank')
  @UseInterceptors(IdempotencyInterceptor)
  async updateBank(
    @Body() payload: any,
  ) {
    // Validate with Zod
    const parsed = BankInfoSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors.map((e) => e.message).join(', '),
      });
    }

    return this.walletService.updateBank(payload.driverId, parsed.data);
  }
}
