import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const deviceId = request.headers['x-device-id'] || request.query.device_id || request.query.deviceId;

    if (!deviceId) return true; // Si no hay ID, el middleware de Auth se encargará

    const driver = await this.prisma.driver.findFirst({
      where: { deviceId: deviceId as string },
      include: { subscriptions: true }
    });

    if (!driver) {
      throw new ForbiddenException('Dispositivo no vinculado a un chofer activo.');
    }

    // Si tiene suscripción marcada como pagada (Regla D - Sprint 2)
    const hasActiveSubscription = driver.subscriptionPaid === true;

    if (!hasActiveSubscription) {
      throw new ForbiddenException({
        error: 'SUBSCRIPTION_EXPIRED',
        message: 'Acceso bloqueado. Pendiente pago suscripción anual RD$6,000.',
        contact: 'Soporte TAD: +1-829-XXX-XXXX'
      });
    }

    return true;
  }
}
