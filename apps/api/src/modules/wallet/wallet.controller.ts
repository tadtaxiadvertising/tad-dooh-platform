import { Controller, Get, Post, Put, Body, Req, UseInterceptors, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { z } from 'zod';

// Zod schema for Bank Info
export const BankInfoSchema = z.object({
  banco: z.string().min(3, 'El nombre del banco es muy corto'),
  cuenta: z.string().regex(/^\d{10,20}$/, 'Número de cuenta inválido (debe tener entre 10 y 20 dígitos)'),
  tipo: z.enum(['AHORRO', 'CORRIENTE']),
  cedula: z.string().regex(/^\d{11}$/, 'La cédula dominicana debe tener 11 dígitos'),
  ownerName: z.string().min(3).optional(),
});

// Zod schema for Withdraw
const WithdrawSchema = z.object({
  amount: z.number().positive('El monto debe ser positivo').max(500000, 'El monto excede el límite permitido'),
});

@Controller('wallet')
@Roles(UserRole.DRIVER)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * SHELTER FIX A-S3: driverId se extrae SIEMPRE del JWT (req.user.entityId).
   * Nunca se acepta un driverId del body o query params para operaciones de escritura.
   */
  @Get('balance')
  async getBalance(@Req() req: any) {
    const driverId = this.extractDriverId(req);
    return this.walletService.getBalance(driverId);
  }

  @Post('withdraw')
  @UseInterceptors(IdempotencyInterceptor)
  async withdraw(@Req() req: any, @Body() payload: any) {
    const driverId = this.extractDriverId(req);

    // Validar monto con Zod
    const parsed = WithdrawSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors.map((e) => e.message).join(', '),
      });
    }

    return this.walletService.withdraw(driverId, parsed.data.amount);
  }

  @Put('bank')
  @UseInterceptors(IdempotencyInterceptor)
  async updateBank(@Req() req: any, @Body() payload: any) {
    const driverId = this.extractDriverId(req);

    // Validate with Zod
    const parsed = BankInfoSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors.map((e) => e.message).join(', '),
      });
    }

    return this.walletService.updateBank(driverId, parsed.data);
  }

  /**
   * Extrae el driverId del token JWT validado por SupabaseAuthGuard.
   * Si el token no contiene entityId, deniega el acceso inmediatamente.
   */
  private extractDriverId(req: any): string {
    const entityId = req.user?.entityId;
    if (!entityId) {
      throw new UnauthorizedException(
        'Token de sesión inválido: no se encontró entityId. Reautentícate.'
      );
    }
    return entityId;
  }
}
