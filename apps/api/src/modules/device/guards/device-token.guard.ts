import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Request } from "express";
import * as jwt from "jsonwebtoken";
import { BUSINESS_RULES } from "../../../common/constants/business-rules";
import { requireEnv } from "../../../utils/env.util";
import type { AuthenticatedRequest } from "../../auth/auth.types";
import { matchesAuthenticatedDevice } from "./device-request-scope";

/**
 * SEC-03: Device Token Guard
 *
 * Validates that X-Device-Token carries a purpose-bound DEVICE_AUTH JWT
 * and that its device is OPERATIVO. Public OFFLINE_LICENSE manifests are
 * playback entitlements, never proof of device possession.
 *
 * This guard protects sync and command ACK. Issuance/rotation of DEVICE_AUTH
 * must be implemented through a separate authenticated pairing protocol;
 * this guard must never mint or return a token.
 */
@Injectable()
export class DeviceTokenGuard implements CanActivate {
  private readonly JWT_SECRET = requireEnv("JWT_SECRET");

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.headers["x-device-token"] as string;

    if (!token) {
      throw new UnauthorizedException("Missing X-Device-Token header");
    }

    // Device operations require a purpose-bound device credential. The
    // public /sync/:deviceId manifest returns a signed OFFLINE_LICENSE JWT;
    // a valid signature and deviceId alone cannot authorize device commands.
    // No token is minted here: provisioning remains an ADMIN-controlled flow.
    let decoded: { deviceId?: string; type?: string };
    try {
      decoded = jwt.verify(token, this.JWT_SECRET, {
        algorithms: ["HS256"],
      }) as { deviceId?: string; type?: string };
    } catch {
      throw new UnauthorizedException("Invalid or expired device token");
    }

    if (decoded.type !== "DEVICE_AUTH") {
      throw new UnauthorizedException("Invalid device token purpose");
    }

    const deviceId = decoded.deviceId;
    if (!deviceId) {
      throw new UnauthorizedException("Device token missing deviceId claim");
    }

    // The token must authorize the SAME device in every user-controlled
    // identity field. Without this check, a device-A token could request
    // device-B sync, bulk-sync or asset manifest (IDOR).
    // Do not treat params.id as a device: command/:id/ack uses a command ID.
    const requestedDeviceIds = [
      request.headers["x-device-id"],
      request.body?.deviceId,
      request.body?.device_id,
      request.query?.deviceId,
      request.query?.device_id,
      request.params?.deviceId,
    ];
    if (!matchesAuthenticatedDevice(deviceId, requestedDeviceIds)) {
      throw new ForbiddenException("Device identity does not match token");
    }

    // Look up the device and enforce OPERATIVO status
    const device = await this.prisma.device.findUnique({
      where: { deviceId },
      select: { deviceId: true, status: true },
    });

    if (!device) {
      throw new UnauthorizedException("Device not found");
    }

    if (device.status !== BUSINESS_RULES.STATUS.DEVICE.ACTIVE) {
      throw new ForbiddenException(
        `Device not operative (status: ${device.status})`,
      );
    }

    // Attach deviceId to request for downstream use
    (request as AuthenticatedRequest).authenticatedDeviceId = deviceId;
    return true;
  }
}
