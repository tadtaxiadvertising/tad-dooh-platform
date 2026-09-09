import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Request } from "express";
import { BUSINESS_RULES } from "../../../common/constants/business-rules";

/**
 * KILL-SWITCH 402 (CORE TAD v12)
 * ─────────────────────────────
 * Regla dura: ningún dispositivo con suscripción morosa puede reproducir pauta.
 *
 * Comportamiento:
 *  1. Sin deviceId → pasa (otros middlewares deciden)
 *  2. Dispositivo sin driver → pasa (escenario primer encendido / out-of-the-box)
 *  3. Suscripción al día (paid + vigente) → pasa
 *  4. Suscripción morosa PERO offline >24h Y dentro de la ventana de gracia 48h
 *     post-vencimiento → pasa (alineado con sync.service grace token)
 *  5. Cualquier otro caso → 402 PAYMENT_REQUIRED con payload completo para que
 *     la PWA active el PaymentLockOverlay (usePaymentStore.setLock).
 *
 * Reason codes (campo `reason` del payload):
 *  - SUBSCRIPTION_UNPAID    → flag subscriptionPaid=false
 *  - SUBSCRIPTION_EXPIRED   → vencido (con o sin flag activo)
 *  - STATE_BLOCKED          → status en BLOQUEADO/SUSPENDED
 *  - SUBSCRIPTION_PENDING   → conductor en onboarding inicial
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionGuard.name);

  /** 48h de gracia offline post-vencimiento (alineado con sync.service JWT 24h + offline-first) */
  private static readonly GRACE_PERIOD_MS = 48 * 60 * 60 * 1000;

  /** Ventana "offline" usada para permitir el grace period */
  private static readonly OFFLINE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const deviceId =
      (request.headers["x-device-id"] as string) ||
      request.body?.deviceId ||
      (request.params as any)?.deviceId ||
      null;

    if (!deviceId) {
      // No deviceId → no aplica la regla. Auth global maneja el resto.
      return true;
    }

    const device = await this.prisma.device.findUnique({
      where: { deviceId },
      select: {
        id: true,
        driverId: true,
        lastHeartbeat: true,
        driver: {
          select: {
            id: true,
            subscriptionPaid: true,
            subscriptionEnd: true,
            status: true,
            blockedAt: true,
          },
        },
      },
    });

    if (!device || !device.driver) {
      // Out-of-the-box: dejar pasar para mostrar SETUP_SCREEN en la PWA.
      return true;
    }

    const driver = device.driver;
    const now = new Date();

    const isPaid = driver.subscriptionPaid === true;
    const notExpired =
      !driver.subscriptionEnd ||
      driver.subscriptionEnd.getTime() > now.getTime();
    const activeStatus = driver.status === BUSINESS_RULES.STATUS.DRIVER.ACTIVE;

    // 3. Estado ideal
    if (isPaid && notExpired && activeStatus) {
      return true;
    }

    // 4. Grace period 48h (offline-first): si el dispositivo lleva >24h sin
    //    contactar el backend, permitimos continuar hasta 48h después del
    //    vencimiento para no cortar abruptamente a taxis en carreteras.
    if (device.lastHeartbeat) {
      const offlineSince =
        now.getTime() - device.lastHeartbeat.getTime() >=
        SubscriptionGuard.OFFLINE_THRESHOLD_MS;
      if (
        offlineSince &&
        driver.subscriptionEnd &&
        driver.subscriptionEnd.getTime() + SubscriptionGuard.GRACE_PERIOD_MS >
          now.getTime()
      ) {
        this.logger.warn(
          `🟡 [GRACE] Device ${deviceId} dentro de 48h post-vencimiento. Permitido offline.`,
        );
        return true;
      }
    }

    // 5. Determinar razón para el 402 (para UI y logs)
    let reason: string;
    if (driver.status === BUSINESS_RULES.STATUS.DRIVER.SUSPENDED) {
      reason = "STATE_BLOCKED";
    } else if (driver.status === BUSINESS_RULES.STATUS.DRIVER.INITIAL) {
      reason = "SUBSCRIPTION_PENDING";
    } else if (!isPaid) {
      reason = "SUBSCRIPTION_UNPAID";
    } else {
      reason = "SUBSCRIPTION_EXPIRED";
    }

    this.logger.warn(
      `🚫 [KILL-SWITCH 402] Device ${deviceId} → Driver ${driver.id} bloqueado. reason=${reason}`,
    );

    throw new HttpException(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        error: "PAYMENT_REQUIRED",
        reason,
        message:
          "Acceso bloqueado: suscripción anual RD$6,000 vencida o pendiente.",
        driverId: driver.id,
        deviceId,
        blockedAt: driver.blockedAt,
        subscriptionEnd: driver.subscriptionEnd,
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
