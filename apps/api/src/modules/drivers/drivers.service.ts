import {
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import {
  BUSINESS_RULES,
  BCRYPT_ROUNDS,
  JWT_EXPIRY,
} from "../../common/constants/business-rules";
import { PayrollAuditService } from "./payroll-audit.service";
import { ReferralService } from "../referral/referral.service";
import { deviceIdentityWhere } from "../campaign/device-identity-lookup";
import { driverProfileSelect, deviceProfileSelect } from "./driver-profile-select";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  entityId?: string;
}

// A9: generá una password temporal aleatoria y segura (12+ chars) entregada una sola vez.
function generateTemporaryPassword(): string {
  // 3 bloques de 4 bytes → 18 caracteres base64url, sin necesidad de separadores largos.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(15);
  let out = "";
  for (let i = 0; i < 15; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function toPublicDriver<T extends object>(driver: T): Omit<T, "password"> {
  const { password: passwordHash, ...publicDriver } = driver as T & {
    password?: unknown;
  };
  void passwordHash;
  return publicDriver;
}

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private readonly payrollAudit: PayrollAuditService,
    private readonly referralService: ReferralService,
  ) {}

  private async hasBankAccountConfigured(driverId: string): Promise<boolean> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { driverId },
      select: { bankInfo: true },
    });
    if (
      !wallet ||
      !wallet.bankInfo ||
      typeof wallet.bankInfo !== "object" ||
      Array.isArray(wallet.bankInfo)
    ) {
      return false;
    }
    const candidate = wallet.bankInfo as {
      banco?: unknown;
      cuenta?: unknown;
      cedula?: unknown;
      tipo?: unknown;
    };
    return Boolean(
      candidate.banco && candidate.cuenta && candidate.cedula && candidate.tipo,
    );
  }

  /**
   * REGLA DE NEGOCIO 1: Validar acceso a la publicidad
   * [ACTUALIZADO]: Morosos reciben kill-switch 402; tablets sin conductor van a setup.
   */
  async checkTabletAccess(tabletId: string) {
    const device = await this.prisma.device.findUnique({
      where: { id: tabletId },
      include: {
        driver: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            status: true,
            subscriptionPaid: true,
            subscriptionEnd: true,
            blockedAt: true,
          },
        },
      },
    });

    if (!device || !device.driver) {
      return {
        access: false,
        action: "SHOW_SETUP_SCREEN",
        message: "Tablet no asignada a un chofer.",
        reason: "NO_DRIVER_ASSIGNED",
      };
    }

    const driver = device.driver;
    const now = Date.now();
    const subscriptionExpired =
      !!driver.subscriptionEnd && driver.subscriptionEnd.getTime() < now;
    const delinquent =
      !driver.subscriptionPaid ||
      subscriptionExpired ||
      driver.status === BUSINESS_RULES.STATUS.DRIVER.SUSPENDED ||
      driver.status === BUSINESS_RULES.STATUS.DRIVER.INITIAL;

    if (delinquent) {
      return {
        access: false,
        action: "KILL_SWITCH",
        httpStatus: 402,
        message:
          "Conductor moroso. La PWA debe congelarse hasta regularizar el pago.",
        reason: subscriptionExpired
          ? "SUBSCRIPTION_EXPIRED"
          : "SUBSCRIPTION_PENDING",
        driverId: driver.id,
        driverStatus: driver.status,
        blockedAt: driver.blockedAt,
        subscriptionEnd: driver.subscriptionEnd,
      };
    }

    return {
      access: true,
      action: "PLAY_ADS",
      driverId: driver.id,
      driverName: driver.fullName,
    };
  }

  /**
   * REGLA DE NEGOCIO 2: Cálculo automático de pagos (v12.1.3 B8 PATCH).
   * Regla canónica (02_reglas_negocio_stack.md):
   *     Earnings = min(playbacks, 15) × RD$500  +  confirmed_sales × RD$500
   *
   * Antes pagaba por campañas ASIGNADAS al dispositivo (no reproducidas),
   * distorsionando métricas e incentivando BI inflado. Ahora pagamos por
   * reproducciones CONFIRMADAS en `playback_events` (PoP — Proof of Play).
   *
   * Cap estricto: 15 anuncios máximo. Más allá, no se acredita.
   */
  async calculateMonthlyEarnings(driverId: string) {
    const monthStart = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );
    const monthEnd = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    // Reproducciones CONFIRMADAS (PoP): conjunto de videoIds únicos
    // reproducidos en este mes en el(los) dispositivo(s) del conductor.
    // `verified:true` filtra eventos validados; `distinct:['videoId']` evita
    // pagar múltiples veces el mismo anuncio reproducido N veces al día.
    // La regla canónica es "por anuncio activo reproducido en su tablet al
    // mes", no "por evento de playback".
    const playedRows = await this.prisma.playbackEvent
      .findMany({
        where: {
          // Only a verified END is a billable Proof of Play; START/ERROR are not.
          eventType: "play_confirm",
          verified: true,
          timestamp: { gte: monthStart, lte: monthEnd },
          device: { driverId },
        },
        distinct: ["videoId"],
        select: { videoId: true },
      })
      .catch((err) => {
        this.logger.warn(
          `[EARNINGS] playbackEvent query failed for ${driverId}: ${err.message}`,
        );
        return [] as Array<{ videoId: string }>;
      });

    const playedCampaignsCount = playedRows.length;
    const cappedAds = Math.min(
      playedCampaignsCount,
      BUSINESS_RULES.MAX_CAMPAIGNS_PER_DRIVER,
    );
    const baseEarnings = cappedAds * BUSINESS_RULES.DRIVER_RATE_PER_CAMPAIGN_RD;

    // CPA por referido de anunciante cerrado (best-effort; no se descuenta).
    const confirmedSales = await this.prisma.commission
      .count({
        where: {
          driverId,
          sourceType: "ADVERTISER_SALE",
          status: "APPROVED",
        },
      })
      .catch(() => 0);
    const cpaEarnings =
      confirmedSales * BUSINESS_RULES.DRIVER_RATE_PER_CAMPAIGN_RD;

    const grossEarnings = baseEarnings + cpaEarnings;

    // Auditoría + penalización por debajo de meta de horas.
    const { amount, penaltyApplied, penaltyAmount } =
      await this.payrollAudit.applyPenaltyLogic(driverId, grossEarnings);

    return {
      driverId,
      playedCampaigns: playedCampaignsCount,
      cappedAds,
      activeCampaigns: cappedAds, // compat con shape legado (no se duplica)
      confirmedSales,
      baseEarningsRD: baseEarnings,
      cpaEarningsRD: cpaEarnings,
      penaltyApplied,
      penaltyAmount,
      projectedEarningsRD: amount,
      currency: "DOP",
      period: { start: monthStart, end: monthEnd },
    };
  }

  /**
   * Listar todos los choferes con su dispositivo y estado de suscripción
   */
  async findAll() {
    const [drivers, activeAdsCount] = await Promise.all([
      this.prisma.driver.findMany({
        select: {
          ...driverProfileSelect,
          devices: {
            select: {
              id: true,
              deviceId: true,
              status: true,
              batteryLevel: true,
              appVersion: true,
              lastSeen: true,
            },
          },
          referrals: {
            select: { id: true, status: true, subscriptionPaid: true },
          },
          referredAdvertisers: {
            select: { id: true, status: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      // FIX M-2: Usar constante en lugar de magic number
      this.prisma.campaign.count({ where: { status: "ACTIVE" } }),
    ]);

    return drivers.map((d) => {
      const driver = d;
      const validReferrals = driver.referrals
        ? driver.referrals.filter(
            (r) =>
              r.status === BUSINESS_RULES.STATUS.DRIVER.ACTIVE &&
              r.subscriptionPaid,
          ).length
        : 0;

      return toPublicDriver({
        ...driver,
        activeAds: activeAdsCount,
        // FIX M-2: Usar constantes en lugar de magic numbers
        projectedEarnings:
          driver.status === BUSINESS_RULES.STATUS.DRIVER.ACTIVE
            ? activeAdsCount * BUSINESS_RULES.DRIVER_RATE_PER_CAMPAIGN_RD
            : 0,
        referralBonus: validReferrals * BUSINESS_RULES.DRIVER_REFERRAL_BONUS_RD,
        advertiserReferralBonus:
          (driver.referredAdvertisers?.length || 0) *
          BUSINESS_RULES.ADVERTISER_REFERRAL_BONUS_RD,
        referralsCount: validReferrals,
        advertiserReferralsCount: driver.referredAdvertisers?.length || 0,
        // NUEVO: onboardingStatus visible para admin
        onboardingStatus: driver.onboardingStatus || "UNKNOWN",
      });
    });
  }

  /**
   * Buscar un chofer por ID
   */
  async findOne(id: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      select: {
        ...driverProfileSelect,
        devices: { select: deviceProfileSelect },
        subscriptions: { orderBy: { startDate: "desc" } },
      },
    });

    return driver ? toPublicDriver(driver) : null;
  }

  /**
   * Registrar un nuevo chofer con su suscripción
   */
  async create(data: {
    fullName: string;
    cedula?: string;
    phone: string;
    taxiPlate?: string;
    licensePlate?: string;
    subscriptionPaid?: boolean;
    subscriptionEnd?: Date;
    password?: string;
    contractAccepted?: boolean;
    agreementVersion?: string;
    referredBy?: string;
    referralCode?: string;
  }) {
    const plainPassword =
      data.password?.trim() ||
      // A9: password aleatoria (NO derivada del teléfono), entregada una sola vez.
      generateTemporaryPassword();
    // FIX B-2: Usar constante BCRYPT_ROUNDS en lugar de magic number
    const hashedPassword = await bcrypt.hash(plainPassword, BCRYPT_ROUNDS);

    // SANEAMIENTO DE DATOS: Campos opcionales únicos deben ser null si están vacíos
    const sanitizedCedula = data.cedula?.trim() || null;
    const sanitizedTaxiPlate =
      (data.taxiPlate || data.licensePlate)?.trim() || null;

    // Resolver referredBy: prioridad referralCode (desde ?ref= URL) sobre referredBy directo
    let resolvedReferredBy: string | null = null;
    if (data.referralCode) {
      const referrer = await this.prisma.driver.findUnique({
        where: { referralCode: data.referralCode },
        select: { id: true, phone: true },
      });
      if (referrer) {
        // Impedir auto-referencia si coincide el teléfono (registro propio)
        if (referrer.phone === data.phone) {
          this.logger.warn(
            `⚠️ [DRIVER_CREATE] Intento de auto-referencia por código ${data.referralCode} ignorado para el teléfono ${data.phone}`,
          );
        } else {
          resolvedReferredBy = referrer.id;
          this.logger.log(
            `[DRIVER_CREATE] Driver ${data.phone} referido por código ${data.referralCode} → ${referrer.id}`,
          );
        }
      } else {
        this.logger.warn(
          `[DRIVER_CREATE] Código de referido inválido ${data.referralCode} para driver ${data.phone}`,
        );
      }
    } else if (data.referredBy) {
      resolvedReferredBy = data.referredBy;
    }

    const driver = await this.prisma.driver
      .create({
        data: {
          fullName: data.fullName,
          cedula: sanitizedCedula,
          phone: data.phone,
          taxiPlate: sanitizedTaxiPlate,
          licensePlate: data.licensePlate,
          subscriptionPaid: data.subscriptionPaid ?? false,
          subscriptionEnd: data.subscriptionEnd,
          password: hashedPassword,
          insuranceAccepted: false, // Deprecated — TAD no longer offers insurance
          insuranceAcceptedAt: null,
          contractAccepted: data.contractAccepted ?? false,
          contractAcceptedAt: data.contractAccepted ? new Date() : null,
          agreementVersion: data.agreementVersion ?? "2.0",
          referredBy: resolvedReferredBy,
          status: data.subscriptionPaid
            ? BUSINESS_RULES.STATUS.DRIVER.ACTIVE
            : BUSINESS_RULES.STATUS.DRIVER.INITIAL,
          onboardingStatus: data.contractAccepted
            ? BUSINESS_RULES.STATUS.DRIVER.ONBOARDING.READY
            : BUSINESS_RULES.STATUS.DRIVER.ONBOARDING.TOS_PENDING,
        },
        include: { devices: true },
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `[DRIVER_CREATE] Fallo creando driver phone=${data.phone}: ${msg}`,
        );
        if (
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err as Record<string, unknown>).code === "P2002"
        ) {
          const meta = (err as Record<string, unknown>).meta as
            Record<string, unknown> | undefined;
          const target = meta?.target || "campo único";
          throw new BadRequestException(
            `Ya existe un conductor con ese valor (${target}). Verifica teléfono/cédula/placa.`,
          );
        }
        throw new HttpException(
          "Error interno al crear el conductor.",
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      });

    return toPublicDriver(driver);
  }

  async login(phone: string, pass: string) {
    let user;
    try {
      user = await this.prisma.driver.findUnique({ where: { phone } });
    } catch (err) {
      this.logger.error(
        `[DRIVER_LOGIN] DB lookup failed for phone ${phone}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new UnauthorizedException("No se pudo validar las credenciales");
    }
    if (!user) {
      throw new UnauthorizedException("Chofer no encontrado con este teléfono");
    }

    if (!user.password) {
      throw new UnauthorizedException(
        "Debe configurar su contraseña contactando a soporte.",
      );
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException("Contraseña incorrecta");
    }

    const payload = {
      sub: user.id,
      phone: user.phone,
      role: "DRIVER",
      app_metadata: {
        role: "DRIVER",
        entityId: user.id,
      },
    };

    // FIX C-1: NO usar fallback hardcodeado. Si no hay secreto, el token no se puede firmar.
    const jwtSecret =
      this.configService.get<string>("SUPABASE_JWT_SECRET") ||
      this.configService.get<string>("JWT_SECRET");
    if (!jwtSecret) {
      this.logger.error(
        "🚨 [DRIVER_LOGIN] JWT_SECRET no configurado. Login bloqueado por seguridad.",
      );
      throw new ForbiddenException("AUTH_CONFIG_MISSING_JWT_SECRET");
    }

    const token = jwt.sign(payload, jwtSecret, { expiresIn: JWT_EXPIRY });

    const device = await this.prisma.device.findFirst({
      where: { driverId: user.id },
    });

    return {
      access_token: token,
      driverId: user.id,
      name: user.fullName,
      role: "DRIVER",
      entityId: user.id,
      deviceId: device?.deviceId || null,
      subscriptionPaid: user.subscriptionPaid,
      contractAccepted: user.contractAccepted,
      agreementVersion: user.agreementVersion || null,
      onboardingStatus: user.onboardingStatus,
      bankAccountConfigured: await this.hasBankAccountConfigured(user.id),
    };
  }

  /**
   * Actualizar el estado de suscripción de un chofer
   * Cuando un driver referido alcanza ACTIVE + subscriptionPaid, se materializa
   * el bonus del referidor (driver→driver) si aún no fue abonado.
   */
  async updateSubscription(id: string, paid: boolean, endDate?: Date) {
    const driver = await this.prisma.driver.findUnique({ where: { id } });
    if (!driver) throw new Error("Chofer no encontrado");

    // Si se marca como pagado y estaba en PENDING_PAYMENT/READY, avanzar a BANK_PENDING
    let newOnboardingStatus = driver.onboardingStatus;
    const payableSteps: string[] = [
      BUSINESS_RULES.STATUS.DRIVER.ONBOARDING.PENDING_PAYMENT,
      BUSINESS_RULES.STATUS.DRIVER.ONBOARDING.READY,
    ];
    if (paid && payableSteps.includes(driver.onboardingStatus)) {
      newOnboardingStatus =
        BUSINESS_RULES.STATUS.DRIVER.ONBOARDING.BANK_PENDING;
    }

    const willBeActive =
      paid && driver.status !== BUSINESS_RULES.STATUS.DRIVER.ACTIVE;

    const updated = await this.prisma.driver.update({
      where: { id },
      data: {
        subscriptionPaid: paid,
        subscriptionEnd: endDate,
        status: paid
          ? BUSINESS_RULES.STATUS.DRIVER.ACTIVE
          : BUSINESS_RULES.STATUS.DRIVER.SUSPENDED,
        blockedAt: paid ? null : new Date(),
        onboardingStatus: newOnboardingStatus,
      },
    });

    // Si este driver fue referido y ahora alcanza ACTIVO, materializar el bonus del referidor
    if (willBeActive && driver.referredBy) {
      try {
        await this.referralService.awardDriverReferralBonus(
          driver.referredBy,
          id,
          "ONBOARDING_COMPLETE",
        );
      } catch (err) {
        this.logger.error(
          `[DRIVER_SUBSCRIPTION] Fallo al abonar bonus de referido para driver ${id} (referido por ${driver.referredBy}): ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return updated;
  }

  /**
   * Completar configuración de cuenta bancaria → onboarding COMPLETED
   * Se llama cuando el driver (o admin) confirma que la wallet tiene bankInfo completo.
   */
  async completeBankSetup(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
    });
    if (!driver) throw new Error("Chofer no encontrado");

    const bankReady = await this.hasBankAccountConfigured(driverId);
    if (!bankReady) {
      throw new BadRequestException(
        "Configuración bancaria incompleta. Se requieren: banco, cuenta, cédula y tipo.",
      );
    }

    // Requiere pago previo (BANK_PENDING viene de updateSubscription con paid=true)
    if (
      driver.onboardingStatus !==
        BUSINESS_RULES.STATUS.DRIVER.ONBOARDING.BANK_PENDING &&
      driver.onboardingStatus !==
        BUSINESS_RULES.STATUS.DRIVER.ONBOARDING.READY &&
      !driver.subscriptionPaid
    ) {
      throw new ForbiddenException(
        "Debe completar la suscripción (pago) antes de poder finalizar el onboarding.",
      );
    }

    return this.prisma.driver.update({
      where: { id: driverId },
      data: {
        onboardingStatus: BUSINESS_RULES.STATUS.DRIVER.ONBOARDING.COMPLETED,
        status:
          driver.status === BUSINESS_RULES.STATUS.DRIVER.INITIAL
            ? BUSINESS_RULES.STATUS.DRIVER.ACTIVE
            : driver.status,
      },
    });
  }

  /**
   * Listar choferes con onboarding incompleto (dashboard admin)
   * Útil para que el admin sepa quiénes faltan completar TOS/Pago/Banco.
   */
  async getOnboardingPending() {
    const incomplete = await this.prisma.driver.findMany({
      where: {
        onboardingStatus: {
          not: BUSINESS_RULES.STATUS.DRIVER.ONBOARDING.COMPLETED,
        },
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        cedula: true,
        status: true,
        onboardingStatus: true,
        subscriptionPaid: true,
        contractAccepted: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return incomplete;
  }

  /**
   * GET /drivers/:id/admin-profile — Perfil extendido para el admin.
   * Incluye onboarding, suscripción, banca y referidos.
   */
  async getAdminProfile(id: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      select: {
        ...driverProfileSelect,
        devices: {
          select: { id: true, deviceId: true, status: true, lastSeen: true },
        },
        subscriptions: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        contractAcceptances: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
        referrals: {
          where: { status: BUSINESS_RULES.STATUS.DRIVER.ACTIVE },
          select: {
            id: true,
            fullName: true,
            status: true,
            subscriptionPaid: true,
          },
        },
        referredAdvertisers: {
          select: { id: true, companyName: true, status: true },
        },
      },
    });
    if (!driver) throw new Error("Chofer no encontrado");

    const bankReady = await this.hasBankAccountConfigured(id);
    const lastPayment = await this.prisma.payrollPayment
      .findFirst({
        where: { driverId: id },
        orderBy: { createdAt: "desc" },
        select: { amount: true, status: true, paidAt: true, createdAt: true },
      })
      .catch(() => null);

    return toPublicDriver({
      ...driver,
      referencedDrivers: driver.referrals,
      bankAccountConfigured: bankReady,
      onboardingStatus: driver.onboardingStatus || "UNKNOWN",
      lastPayment,
    });
  }

  /**
   * Assign a hardware device to a driver
   */
  async assignDevice(driverId: string, deviceId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
    });
    if (!driver) throw new Error("Chofer no encontrado");

    // A driver's eligibility can change while another admin is assigning
    // hardware. Validate before the transaction AND again after acquiring
    // the driver-row lock, using one consistent rule.
    const assertEligibleForDevice = (candidate: {
      status: string;
      onboardingStatus: string;
    }) => {
      if (candidate.status === BUSINESS_RULES.STATUS.DRIVER.BLOCKED) {
        throw new ForbiddenException(
          "Conductor bloqueado: no se puede asignar una tablet.",
        );
      }
      const onboardingCompleteSteps: string[] = [
        BUSINESS_RULES.STATUS.DRIVER.ONBOARDING.COMPLETED,
        BUSINESS_RULES.STATUS.DRIVER.ONBOARDING.BANK_PENDING,
      ];
      if (
        candidate.status !== BUSINESS_RULES.STATUS.DRIVER.ACTIVE &&
        !onboardingCompleteSteps.includes(candidate.onboardingStatus)
      ) {
        throw new ForbiddenException(
          `Onboarding incompleto o suscripción no pagada. Estado actual: ${candidate.onboardingStatus}. Asegúrate de completar: TOS → Pago RD$${BUSINESS_RULES.STARTER_KIT_ANNUAL_FEE_RD.toLocaleString()} → Cuenta bancaria.`,
        );
      }
    };
    assertEligibleForDevice(driver);

    // Do not send hardware identifiers through devices.id (PostgreSQL UUID).
    // A UUID-looking hardware ID can also collide with a different device PK.
    const devices = await this.prisma.device.findMany({
      where: deviceIdentityWhere(deviceId),
      take: 2,
    });
    if (devices.length === 0) {
      throw new BadRequestException(
        "Dispositivo no encontrado en el inventario",
      );
    }
    if (devices.length > 1) {
      throw new BadRequestException("Identificador de dispositivo ambiguo");
    }
    const device = devices[0];

    // Keep driver handoffs serialized, including concurrent assignments to
    // different tablets. Updating the driver row takes a PostgreSQL row lock
    // for this transaction; updatedAt reflects the administrative change.
    // Compare-and-set on the target's observed owner prevents another admin
    // from silently overwriting a device that changed hands after our read.
    return this.prisma.$transaction(async (tx) => {
      const lockedDriver = await tx.driver.update({
        where: { id: driverId },
        data: { updatedAt: new Date() },
        select: { status: true, onboardingStatus: true },
      });
      // A suspension between the initial read and this lock must prevent
      // device unlinking and binding; a rejected transaction rolls back.
      assertEligibleForDevice(lockedDriver);
      // Serialize handoffs for the same driver. A transaction alone cannot
      // prevent concurrent admins from assigning two distinct tablets:
      // both may unlink the old binding before either target is written.
      // Lock the driver row first; NO KEY UPDATE avoids blocking FK key
      // checks while keeping other handoffs for this driver ordered.
      const lockedDrivers = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "drivers"
        WHERE "id" = ${driverId}
        FOR NO KEY UPDATE
      `;
      if (lockedDrivers.length !== 1) {
        throw new BadRequestException("Chofer no encontrado");
      }

      await tx.device.updateMany({
        where: { driverId, id: { not: device.id } },
        data: { driverId: null },
      });

      // Prisma 5 allows non-unique predicates alongside a unique id in
      // update.where. A lost race throws P2025 and rolls back the unlink.
      // Keep the target attached when replaying the same assignment.
      return tx.device.update({
        where: { id: device.id, driverId: device.driverId },
        data: { driverId },
      });
    });
  }

  /**
   * Unlink a hardware device from a driver
   */
  async unlinkDevice(driverId: string) {
    // Pairing and unpairing must serialize on the SAME driver-row lock.
    // Otherwise unlink can complete against the old tablet while a concurrent
    // handoff binds a new tablet, leaving a supposed unlink ineffective.
    return this.prisma.$transaction(async (tx) => {
      const lockedDrivers = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "drivers"
        WHERE "id" = ${driverId}
        FOR NO KEY UPDATE
      `;
      // Preserve the previous no-op { count: 0 } response for unknown IDs.
      if (lockedDrivers.length === 0) return { count: 0 };

      return tx.device.updateMany({
        where: { driverId },
        data: { driverId: null },
      });
    });
  }

  /**
   * Aceptar firma electrónica del contrato y pasar a PENDING_PAYMENT
   */
  async acceptAgreement(
    driverId: string,
    version: string,
    ipAddress: string,
    userAgent: string,
  ) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
    });
    if (!driver) throw new Error("Chofer no encontrado");

    if (driver.contractAccepted) {
      throw new Error("El conductor ya ha aceptado el contrato previamente");
    }

    await this.prisma.contractAcceptance.create({
      data: { driverId, version, ipAddress, userAgent },
    });

    return this.prisma.driver.update({
      where: { id: driverId },
      data: {
        contractAccepted: true,
        contractAcceptedAt: new Date(),
        agreementVersion: version,
        onboardingStatus:
          BUSINESS_RULES.STATUS.DRIVER.ONBOARDING.PENDING_PAYMENT,
      },
    });
  }

  /**
   * Estadísticas generales de la red de choferes
   */
  async getStats() {
    const [total, active, suspended, unpaid] = await Promise.all([
      this.prisma.driver.count(),
      this.prisma.driver.count({
        where: { status: BUSINESS_RULES.STATUS.DRIVER.ACTIVE },
      }),
      this.prisma.driver.count({
        where: { status: BUSINESS_RULES.STATUS.DRIVER.SUSPENDED },
      }),
      this.prisma.driver.count({ where: { subscriptionPaid: false } }),
    ]);

    return { total, active, suspended, unpaid };
  }

  /**
   * ESTADÍSTICAS PARA EL PORTAL DEL CHOFER por deviceId
   */
  async getDriverHubData(deviceId: string) {
    this.logger.debug(`[HUB] Realizando consulta por deviceId: ${deviceId}`);
    const device = await this.prisma.device.findUnique({
      where: { deviceId },
      include: {
        driver: {
          include: { referredAdvertisers: true },
        },
      },
    });

    if (!device) {
      throw new ForbiddenException("Dispositivo no encontrado.");
    }

    if (!device.driver) {
      this.logger.warn(
        `[HUB] Hub solicitado para deviceId ${deviceId} pero no tiene conductor vinculado.`,
      );
      // Retornar un hub vacío/default en lugar de throw para que el Admin Dashboard no se rompa
      return {
        driverName: "Sín Conductor",
        deviceId: device.deviceId,
        taxiNumber: device.taxiNumber || "---",
        phone: "---",
        cedula: "---",
        subscriptionPaid: false,
        adsPlayed: 0,
        activeAds: 0,
        projectedEarnings: 0,
        referralsCount: 0,
        referralEarnings: 0,
        lastPayment: null,
        totalPaid: 0,
        gpsPoints: 0,
        notices: [],
      };
    }

    return this.buildHubData(device.driver, device.deviceId);
  }

  /**
   * Alias de getDriverHubData usado por Admins
   */
  async getDriverHubDataByDeviceId(deviceId: string) {
    return this.getDriverHubData(deviceId);
  }

  /**
   * ESTADÍSTICAS PARA EL PORTAL DEL CHOFER por Driver ID
   */
  async getDriverHubDataById(driverId: string) {
    this.logger.debug(`[DRIVER_HUB][GET_BY_ID] Start driverId=${driverId}`);
    try {
      if (!driverId) {
        throw new ForbiddenException("ID de conductor no proporcionado.");
      }

      const driver = await this.prisma.driver.findUnique({
        where: { id: driverId },
        include: {
          devices: {
            select: { id: true, deviceId: true, status: true },
          },
          referredAdvertisers: {
            select: { id: true },
          },
        },
      });

      if (!driver) {
        this.logger.error(
          `[DRIVER_HUB][GET_BY_ID][NOT_FOUND] driverId=${driverId}`,
        );
        throw new ForbiddenException(
          "Perfil de conductor no encontrado. Por favor, re-inicia sesión.",
        );
      }

      const deviceId = driver.devices?.[0]?.deviceId || null;
      this.logger.debug(
        `[DRIVER_HUB][GET_BY_ID][FOUND] driverId=${driverId} deviceId=${deviceId}`,
      );

      return await this.buildHubData(driver, deviceId);
    } catch (err) {
      this.logger.error(
        `[DRIVER_HUB][GET_BY_ID][ERROR] driverId=${driverId} message=${err.message}`,
        err.stack,
      );
      // Evitar que el 500 rompa el portal si es posible devolver un error controlado
      if (err instanceof ForbiddenException) throw err;
      throw new Error(`Error al obtener datos del dashboard: ${err.message}`);
    }
  }

  /**
   * Método interno para construir el payload del Hub
   */
  private async buildHubData(
    driver: import("@prisma/client").Driver & {
      referredAdvertisers: { id: string }[];
    },
    deviceId: string | null,
  ) {
    this.logger.debug(`[HUB_BUILD] Iniciando construcción para ${driver.id}`);

    const monthStart = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );
    const monthEnd = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    // Queries en paralelo con manejo individual de errores
    const fetchAdsPlayed = deviceId
      ? this.prisma.analyticsEvent
          .count({
            where: {
              deviceId,
              eventType: { in: ["play_confirm", "video_end", "impression"] },
            },
          })
          .catch((e) => {
            this.logger.warn(`[HUB_WARN] Error adsPlayed: ${e.message}`);
            return 0;
          })
      : Promise.resolve(0);

    const fetchGpsPoints = this.prisma.driverLocation
      .count({
        where: {
          driverId: driver.id,
          timestamp: { gte: monthStart, lte: monthEnd },
        },
      })
      .catch((e) => {
        this.logger.warn(`[HUB_WARN] Error gpsPoints: ${e.message}`);
        return 0;
      });

    const fetchActiveAds = deviceId
      ? this.prisma.deviceCampaign
          .count({
            where: { device: { deviceId }, campaign: { status: "ACTIVE" } },
          })
          .catch((e) => {
            this.logger.warn(
              `[HUB_WARN] Error deviceCampaign count: ${e.message}. Using global fallback.`,
            );
            return this.prisma.campaign
              .count({ where: { status: "ACTIVE" } })
              .catch(() => 0);
          })
      : this.prisma.campaign
          .count({ where: { status: "ACTIVE" } })
          .catch(() => 0);

    const fetchLastPayment = this.prisma.payrollPayment
      .findFirst({
        where: { driverId: driver.id },
        orderBy: { createdAt: "desc" },
      })
      .catch((e) => {
        this.logger.warn(`[HUB_WARN] Error lastPayment: ${e.message}`);
        return null;
      });

    const fetchTotalPaid = this.prisma.payrollPayment
      .aggregate({
        where: { driverId: driver.id, status: "PAID" },
        _sum: { amount: true },
      })
      .catch((e) => {
        this.logger.warn(`[HUB_WARN] Error totalPaid aggregate: ${e.message}`);
        return { _sum: { amount: 0 } };
      });

    this.logger.debug(`[HUB_BUILD] Ejecutando queries paralelas...`);

    const [adsPlayed, gpsPoints, activeAdsCount, lastPayment, totalPaidSum] =
      await Promise.all([
        fetchAdsPlayed,
        fetchGpsPoints,
        fetchActiveAds,
        fetchLastPayment,
        fetchTotalPaid,
      ]);

    this.logger.debug(
      `[HUB_BUILD] Datos base obtenidos. adsPlayed=${adsPlayed}, activeAds=${activeAdsCount}`,
    );

    // El bono GPS ha sido eliminado en v10.1.0

    const projectedEarnings =
      driver.status === BUSINESS_RULES.STATUS.DRIVER.ACTIVE
        ? (activeAdsCount || 0) * BUSINESS_RULES.DRIVER_RATE_PER_CAMPAIGN_RD
        : 0;

    // Referidos (Conteo defensivo con catch)
    const referralsCount = await this.prisma.driver
      .count({
        where: {
          referredBy: driver.id,
          status: BUSINESS_RULES.STATUS.DRIVER.ACTIVE,
          subscriptionPaid: true,
        },
      })
      .catch(() => 0);

    const referralEarnings =
      referralsCount * BUSINESS_RULES.DRIVER_REFERRAL_BONUS_RD;
    const advertiserReferralEarnings =
      (driver.referredAdvertisers?.length || 0) *
      BUSINESS_RULES.ADVERTISER_REFERRAL_BONUS_RD;

    const totalPaid = totalPaidSum?._sum?.amount || 0;

    this.logger.debug(`[HUB_BUILD] Aplicando penalizaciones...`);

    // Aplicar penalizaciones al proyectado si aplica
    let finalProjected = projectedEarnings;
    let penaltyApplied = false;
    let penaltyAmount = 0;

    try {
      const penaltyResult = await this.payrollAudit.applyPenaltyLogic(
        driver.id,
        projectedEarnings,
      );
      finalProjected = penaltyResult.amount;
      penaltyApplied = penaltyResult.penaltyApplied;
      penaltyAmount = penaltyResult.penaltyAmount;
    } catch (pErr) {
      this.logger.error(
        `[HUB_ERROR] Error en applyPenaltyLogic: ${pErr.message}`,
      );
    }

    const balance =
      finalProjected +
      referralEarnings +
      advertiserReferralEarnings -
      totalPaid;

    this.logger.log(
      `✅ [HUB_SUCCESS] Hub construido para ${driver.fullName} (${driver.id}). Balance: ${balance}`,
    );

    return {
      driverId: driver.id,
      driverName: driver.fullName,
      level: driver.level,
      consecutiveMonthsUnderGoal: driver.consecutiveMonthsUnderGoal,
      phone: driver.phone,
      cedula: driver.cedula,
      taxiNumber: driver.taxiNumber || driver.taxiPlate || "S/N",
      adsPlayed,
      projectedEarnings: finalProjected,
      baseEarnings: projectedEarnings,
      penaltyApplied,
      penaltyAmount,
      referralEarnings,
      referralsCount,
      advertiserReferralEarnings,
      advertiserReferralsCount: driver.referredAdvertisers?.length || 0,
      gpsPoints,
      activeAds: activeAdsCount,
      totalPaid,
      balance,
      lastPayment: lastPayment
        ? {
            amount: lastPayment.amount,
            status: lastPayment.status,
            date: lastPayment.paidAt || lastPayment.createdAt,
          }
        : null,
      subscriptionStatus: driver.status,
      subscriptionPaid: driver.subscriptionPaid,
      contractAccepted: Boolean(driver.contractAccepted),
      agreementVersion: driver.agreementVersion || null,
      onboardingStatus: driver.onboardingStatus || "UNKNOWN",
      bankAccountConfigured: await this.hasBankAccountConfigured(driver.id),
      deviceId,
    };
  }

  /**
   * Eliminar un chofer por ID (desvincula tablet automáticamente)
   */
  async remove(id: string) {
    // FIX M-5: Loguear si falla la desvinculación en lugar de descartarlo silenciosamente
    try {
      await this.prisma.device.updateMany({
        where: { driverId: id },
        data: { driverId: null },
      });
    } catch (err) {
      this.logger.warn(
        `[DRIVER_REMOVE] No se pudieron desvincular dispositivos del conductor ${id}: ${err.message}`,
      );
    }

    return this.prisma.driver.delete({ where: { id } });
  }

  /**
   * PURGA TOTAL — FK-safe según schema.prisma real
   * Orden: tablas hijas → drivers → devices
   * NOTA: Este método solo debe llamarse desde el controlador con doble validación de seguridad.
   */
  async purgeAll() {
    const nodeEnv = this.configService.get<string>("NODE_ENV");
    if (nodeEnv === "production") {
      this.logger.error(
        "🚨 [DRIVER_PURGE][BLOCKED] Intento de purgeAll bloqueado en entorno production.",
      );
      throw new ForbiddenException("PURGE_NOT_ALLOWED_IN_PRODUCTION");
    }

    this.logger.error(
      `[DRIVER_PURGE][CRITICAL] purgeAll ejecutado en entorno=${nodeEnv || "undefined"}.`,
    );
    const tables: Array<[string, () => Promise<unknown>]> = [
      ["driverLocation", () => this.prisma.driverLocation.deleteMany()],
      ["payrollPayment", () => this.prisma.payrollPayment.deleteMany()],
      ["subscription", () => this.prisma.subscription.deleteMany()],
      ["analyticsEvent", () => this.prisma.analyticsEvent.deleteMany()],
      ["deviceHeartbeat", () => this.prisma.deviceHeartbeat.deleteMany()],
      ["playbackEvent", () => this.prisma.playbackEvent.deleteMany()],
      ["deviceCommand", () => this.prisma.deviceCommand.deleteMany()],
      ["campaignMetric", () => this.prisma.campaignMetric.deleteMany()],
      ["playlistItem", () => this.prisma.playlistItem.deleteMany()],
      ["deviceCampaign", () => this.prisma.deviceCampaign.deleteMany()],
    ];

    for (const [table, deleteRows] of tables) {
      try {
        await deleteRows();
      } catch (err) {
        this.logger.warn(
          `[PURGE] Tabla ${table} falló o no existe: ${err.message}`,
        );
      }
    }

    try {
      await this.prisma.device.updateMany({ data: { driverId: null } });
    } catch (err) {
      this.logger.warn(
        `[PURGE] No se pudo desvincular devices: ${err.message}`,
      );
    }

    const [deletedDrivers, deletedDevices] = await Promise.all([
      this.prisma.driver.deleteMany(),
      this.prisma.device.deleteMany(),
    ]);

    this.logger.warn(
      `🚨 [PURGE] Base de datos limpiada: ${deletedDrivers.count} conductores, ${deletedDevices.count} dispositivos eliminados`,
    );

    return {
      message: "Base de datos limpiada exitosamente",
      deletedDrivers: deletedDrivers.count,
      deletedDevices: deletedDevices.count,
    };
  }

  /**
   * Link an active ad to a driver (V12 Financial Logic)
   */
  async linkActiveAd(driverId: string, campaignId: string) {
    return this.prisma.activeAd.upsert({
      where: {
        driverId_campaignId: {
          driverId,
          campaignId,
        },
      },
      update: { status: "ACTIVE" },
      create: {
        driverId,
        campaignId,
        status: "ACTIVE",
      },
    });
  }

  /**
   * GET /api/drivers/me/transactions — Returns payroll payment history for a driver.
   * Includes earnings, withdrawals, referral bonuses, and subscription payments.
   */
  async getDriverTransactions(driverId: string) {
    const payments = await this.prisma.payrollPayment.findMany({
      where: { driverId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        amount: true,
        status: true,
        month: true,
        year: true,
        paidAt: true,
        createdAt: true,
        penaltyApplied: true,
        penaltyPercentage: true,
        transmissionHours: true,
        activeAds: true,
        gpsPoints: true,
      },
    });

    const subscriptions = await this.prisma.subscription.findMany({
      where: { driverId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        plan: true,
        amount: true,
        status: true,
        validUntil: true,
        paidAt: true,
        createdAt: true,
      },
    });

    const transactions = [
      ...payments.map((p) => ({
        id: p.id,
        type: "EARNING",
        amount: p.amount,
        date: (p.paidAt || p.createdAt).toISOString(),
        desc: `Ganancias ${p.month}/${p.year} — ${p.activeAds} campañas, ${p.gpsPoints} puntos GPS`,
        status: p.status,
        penaltyApplied: p.penaltyApplied,
        penaltyPercentage: p.penaltyPercentage,
        transmissionHours: p.transmissionHours,
        activeAds: p.activeAds,
        gpsPoints: p.gpsPoints,
      })),
      ...subscriptions.map((s) => ({
        id: s.id,
        type:
          s.status === "ACTIVE" && s.paidAt
            ? "SUBSCRIPTION"
            : "SUBSCRIPTION_PENDING",
        amount: -s.amount,
        date: (s.paidAt || s.createdAt).toISOString(),
        desc: `${s.plan} — ${s.status}`,
        status: s.status,
        validUntil: s.validUntil?.toISOString() || null,
      })),
    ];

    return transactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }
}
