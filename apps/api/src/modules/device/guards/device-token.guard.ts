import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { BUSINESS_RULES } from '../../../common/constants/business-rules';

/**
 * SEC-03: Device Token Guard
 *
 * Validates that the request includes a valid X-Device-Token header
 * (JWT signed by the backend during sync) and that the device
 * identified by the token is in OPERATIVO status.
 *
 * This guard is applied to sync and bulk-sync endpoints to ensure
 * only registered, approved tablets can pull campaign content.
 */
@Injectable()
export class DeviceTokenGuard implements CanActivate {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'tad-default-secret-2026';

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.headers['x-device-token'] as string;

    if (!token) {
      throw new UnauthorizedException('Missing X-Device-Token header');
    }

    // Verify the JWT and extract the deviceId
    let decoded: { deviceId?: string };
    try {
      decoded = jwt.verify(token, this.JWT_SECRET) as { deviceId?: string };
    } catch {
      throw new UnauthorizedException('Invalid or expired device token');
    }

    const deviceId = decoded.deviceId;
    if (!deviceId) {
      throw new UnauthorizedException('Device token missing deviceId claim');
    }

    // Look up the device and enforce OPERATIVO status
    const device = await this.prisma.device.findUnique({
      where: { deviceId },
      select: { deviceId: true, status: true },
    });

    if (!device) {
      throw new UnauthorizedException('Device not found');
    }

    if (device.status !== BUSINESS_RULES.STATUS.DEVICE.ACTIVE) {
      throw new ForbiddenException(
        `Device not operative (status: ${device.status})`,
      );
    }

    // Attach deviceId to request for downstream use
    (request as any).authenticatedDeviceId = deviceId;
    return true;
  }
}
