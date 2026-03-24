import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionGuard.name);
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Extraer DeviceID de cabeceras o query params
    const deviceId = request.headers['x-device-id'] || request.query.deviceId || request.body?.deviceId;

    if (!deviceId) return true; // El AuthGuard global se encarga si falta identificación

    const sub = await this.prisma.subscription.findFirst({
      where: { deviceId: deviceId as string },
    });

    // GRACE PERIOD: Si no hay suscripción registrada, permitir acceso (onboarding/piloto)
    if (!sub) {
      this.logger.warn(`⚠️ Device ${deviceId}: Sin suscripción. Acceso permitido (grace period).`);
      return true;
    }

    // BLOQUEO: Solo si la suscripción existe Y está expirada
    if (sub.status === 'EXPIRED' || (sub.validUntil && new Date() > sub.validUntil)) {
      this.logger.warn(`⛔ Device ${deviceId}: Suscripción vencida. Bloqueando.`);
      throw new ForbiddenException({
        errorCode: 'SUBSCRIPTION_EXPIRED',
        message: 'Acceso bloqueado: Pago de suscripción RD$6,000 pendiente.',
        contact: 'soporte@tad.do'
      });
    }

    return true;
  }
}
