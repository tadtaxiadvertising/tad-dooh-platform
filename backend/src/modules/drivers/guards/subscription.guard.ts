import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Extraer DeviceID de cabeceras o query params
    const deviceId = request.headers['x-device-id'] || request.query.deviceId || request.body?.deviceId;

    if (!deviceId) return true; // El AuthGuard global se encarga si falta identificación

    const sub = await this.prisma.subscription.findUnique({
      where: { deviceId: deviceId as string },
    });

    // REGLA DE NEGOCIO: Si no existe suscripción o está vencida
    if (!sub || sub.status !== 'ACTIVE' || new Date() > sub.validUntil) {
      throw new ForbiddenException({
        errorCode: 'SUBSCRIPTION_REQUIRED',
        message: 'Acceso bloqueado: Pago de suscripción RD$6,000 pendiente.',
        contact: 'soporte@tad.do'
      });
    }

    return true;
  }
}
