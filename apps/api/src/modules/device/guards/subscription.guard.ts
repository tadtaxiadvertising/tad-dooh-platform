import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthenticatedRequest } from "../../auth/auth.types";

/**
 * REVENUE SHIELD v12.2.5: Subscription Guard
 *
 * Verifies that the device's associated driver has an active, paid subscription.
 * Applied to tablet-facing endpoints (sync, playlist) to enforce the kill-switch.
 *
 * Returns HTTP 402 if:
 *  - Driver.subscriptionPaid === false
 *  - Driver.subscriptionEnd < now (subscription expired)
 *
 * Grace period: If the device is offline (no heartbeat in >24h), allow 48h
 * of continued playback after subscription expiry, aligned with JWT expiry policy.
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // DeviceTokenGuard runs first and sets this identity only after a valid
    // JWT and an ownership check. Never pick a client-supplied header/body ID:
    // bulk-sync uses body.device_id and previously bypassed the payment guard.
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const deviceId = request.authenticatedDeviceId;
    if (!deviceId) {
      throw new UnauthorizedException("Authenticated device is required");
    }

    const device = await this.prisma.device.findUnique({
      where: { deviceId },
      select: {
        driverId: true,
        lastHeartbeat: true,
        driver: {
          select: {
            subscriptionPaid: true,
            subscriptionEnd: true,
          },
        },
      },
    });

    if (!device || !device.driver) {
      // Device not assigned to a driver — allow (new device setup scenario)
      return true;
    }

    const driver = device.driver;

    // Check if subscription is paid and not expired
    if (
      driver.subscriptionPaid &&
      (!driver.subscriptionEnd || driver.subscriptionEnd > new Date())
    ) {
      return true; // Active subscription
    }

    // Grace period: if offline for >24h, allow 48h after subscription expiry
    if (device.lastHeartbeat) {
      const offlineThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const isOffline = device.lastHeartbeat < offlineThreshold;

      if (isOffline && driver.subscriptionEnd) {
        const gracePeriodEnd = new Date(
          driver.subscriptionEnd.getTime() + 48 * 60 * 60 * 1000,
        );
        if (gracePeriodEnd > new Date()) {
          // Within 48h grace period — allow continued playback
          return true;
        }
      }
    }

    // Subscription expired and no grace period — block
    throw new HttpException(
      {
        statusCode: 402,
        message: "Subscription expired. Payment required to continue service.",
        reason: "SUBSCRIPTION_EXPIRED",
        deviceId,
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
