import type { AuthenticatedRequest } from "../auth/auth.types";
import { errorMessage } from "../../utils/error.util";
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  BadRequestException,
  Headers,
  ForbiddenException,
  Req,
  UseGuards,
  Logger,
  HttpException,
  HttpStatus,
  UseInterceptors,
  Query,
} from "@nestjs/common";
import type { Request } from "express";
import { DriversService } from "./drivers.service";
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../auth/decorators/roles.decorator";
import { Throttle } from "@nestjs/throttler";
import { TenantGuard } from "../auth/guards/tenant.guard";
import { SystemSettingsService } from "../system-settings/system-settings.service";
import { IdempotencyInterceptor } from "../../common/interceptors/idempotency.interceptor";

@Controller("drivers")
export class DriversController {
  private readonly logger = new Logger(DriversController.name);
  constructor(
    private readonly driversService: DriversService,
    private readonly systemSettings: SystemSettingsService,
  ) {}

  /**
   * GET /api/drivers/app-version — Última versión publicada de la app Flutter.
   * Endpoint público (sin auth) para que la app consulte al arrancar y decida
   * si debe forzar update. Responde antes que @Get(':id') para evitar colisión.
   */
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get("app-version")
  async getAppVersion() {
    return this.systemSettings.getDriverAppVersion();
  }

  /**
   * GET /api/drivers — Listar todos los choferes
   */
  @Get()
  @Roles(UserRole.ADMIN)
  async findAll() {
    return this.driversService.findAll();
  }

  /**
   * GET /api/drivers/stats — Estadísticas de la red
   */
  @Get("stats")
  @Roles(UserRole.ADMIN)
  async getStats() {
    return this.driversService.getStats();
  }

  /**
   * GET /api/drivers/onboarding-pending — Choferes con onboarding incompleto
   * Debe declararse antes de @Get(':id') para evitar colisión de rutas.
   */
  @Get("onboarding-pending")
  @Roles(UserRole.ADMIN)
  async getOnboardingPending() {
    return this.driversService.getOnboardingPending();
  }

  /**
   * GET /api/drivers/:id/admin-profile — Perfil extendido para admin
   */
  @Get(":id/admin-profile")
  @Roles(UserRole.ADMIN)
  async getAdminProfile(@Param("id") id: string) {
    return this.driversService.getAdminProfile(id);
  }

  /**
   * GET /api/drivers/:id — Detalle de un chofer
   */
  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  @UseGuards(TenantGuard)
  async findOne(@Param("id") id: string) {
    const driver = await this.driversService.findOne(id);
    if (!driver) throw new BadRequestException("Chofer no encontrado");
    return driver;
  }

  /**
   * POST /api/drivers — Registrar un nuevo chofer
   * C2 FIX: subscriptionPaid y subscriptionEnd REMOVIDOS del DTO público.
   * Solo ADMIN puede setear suscripción pagada vía PUT /drivers/:id/subscription.
   *
   * Atribución de referido: acepta `?ref=` query param con el código del referidor.
   * El servicio resuelve referralCode → driverId y persiste referredBy.
   */
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post()
  async create(
    @Body()
    body: {
      fullName: string;
      cedula?: string;
      phone: string;
      taxiPlate?: string;
      licensePlate?: string;
      password?: string;
      contractAccepted?: boolean;
      agreementVersion?: string;
      referralCode?: string;
    },
    @Req() req?: AuthenticatedRequest,
    @Query("ref") referralCode?: string,
  ) {
    if (!body.fullName || !body.phone) {
      throw new BadRequestException("fullName y phone son obligatorios");
    }

    const isAdmin = req?.user?.role === "ADMIN" || req?.user?.role === "admin";
    const isContractAccepted = isAdmin ? true : body.contractAccepted;

    if (!isAdmin && !isContractAccepted) {
      throw new BadRequestException(
        "Debes aceptar el contrato de servicio para unirte a TAD",
      );
    }

    // Sanear campos opcionales: Convertir strings vacíos a undefined para evitar conflictos de unicidad en Prisma
    const sanitize = (val?: string) =>
      val && val.trim() !== "" ? val : undefined;

    // Public signup must not mass-assign driver/device/financial fields.
    // Tablet pairing is reserved for the authenticated ADMIN endpoint
    // POST /drivers/:id/assign-device, after onboarding verification.
    return this.driversService.create({
      fullName: body.fullName,
      phone: body.phone,
      cedula: sanitize(body.cedula),
      taxiPlate: sanitize(body.taxiPlate),
      licensePlate: sanitize(body.licensePlate),
      password: body.password,
      contractAccepted: isContractAccepted,
      agreementVersion: body.agreementVersion,
      // Attribution from a validated referral code, never a raw driver ID.
      referralCode: referralCode?.trim() || undefined,
      subscriptionPaid: false,
      subscriptionEnd: undefined,
    });
  }

  /**
   * POST /api/drivers/login — Iniciar sesión chofer
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post("login")
  async login(
    @Body()
    body: {
      phone?: string;
      email?: string;
      cedula?: string;
      password?: string;
    },
  ) {
    const phone = body.phone || body.email || body.cedula;
    if (!phone || !body.password) {
      throw new BadRequestException(
        "Debe enviar phone, email o cédula junto a la contraseña.",
      );
    }
    return this.driversService.login(phone, body.password);
  }

  /**
   * GET /api/drivers/:id/earnings — Cálculo de ganancias mensuales
   */
  @Get(":id/earnings")
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  @UseGuards(TenantGuard)
  async getEarnings(@Param("id") id: string) {
    return this.driversService.calculateMonthlyEarnings(id);
  }

  /**
   * PUT /api/drivers/:id/subscription — Actualizar estado de suscripción
   * Requiere Idempotency-Key para prevenir doble procesamiento de pagos de suscripción
   */
  @Put(":id/subscription")
  @Roles(UserRole.ADMIN)
  @UseInterceptors(IdempotencyInterceptor)
  async updateSubscription(
    @Param("id") id: string,
    @Body() body: { paid: boolean; endDate?: string },
  ) {
    return this.driversService.updateSubscription(
      id,
      body.paid,
      body.endDate ? new Date(body.endDate) : undefined,
    );
  }

  /**
   * POST /api/drivers/:id/accept-agreement — Firma Electrónica
   * Requiere Idempotency-Key para prevenir doble procesamiento
   */
  @Post(":id/accept-agreement")
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  @UseGuards(TenantGuard)
  @UseInterceptors(IdempotencyInterceptor)
  async acceptAgreement(
    @Param("id") id: string,
    @Body() body: { version: string },
    @Req() req: Request,
  ) {
    if (!body.version) throw new BadRequestException("version es requerida");

    // Fallbacks para IP address and headers
    const ipAddress = (req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress ||
      "unknown") as string;
    const userAgent = req.headers["user-agent"] || "unknown";

    try {
      return await this.driversService.acceptAgreement(
        id,
        body.version,
        ipAddress,
        userAgent,
      );
    } catch (e: unknown) {
      this.logger.error(
        `[ACCEPT_AGREEMENT] Error al procesar acuerdo para driver ${id}: ${errorMessage(e)}`,
        e instanceof Error ? e.stack : undefined,
      );
      if (e instanceof BadRequestException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(
        "No se pudo procesar la aceptación del contrato.",
      );
    }
  }

  /**
   * POST /api/drivers/:id/complete-bank-setup — Confirmar cuenta bancaria y finalizar onboarding
   * Requiere Idempotency-Key para prevenir doble procesamiento
   */
  @Post(":id/complete-bank-setup")
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  @UseGuards(TenantGuard)
  @UseInterceptors(IdempotencyInterceptor)
  async completeBankSetup(@Param("id") id: string) {
    try {
      return await this.driversService.completeBankSetup(id);
    } catch (e: unknown) {
      if (e instanceof ForbiddenException) throw e;
      if (e instanceof BadRequestException) throw e;
      this.logger.error(
        `[BANK_SETUP] Error configurando cuenta bancaria para driver ${id}: ${errorMessage(e)}`,
        e instanceof Error ? e.stack : undefined,
      );
      throw new BadRequestException(
        "No se pudo completar la configuración bancaria.",
      );
    }
  }

  /**
   * POST /api/drivers/:id/assign-device — Asignar pantalla al chofer
   * Requiere Idempotency-Key para prevenir asignaciones duplicadas
   */
  @Post(":id/assign-device")
  @Roles(UserRole.ADMIN)
  @UseInterceptors(IdempotencyInterceptor)
  async assignDevice(
    @Param("id") id: string,
    @Body() body: { deviceId: string },
  ) {
    if (!body.deviceId) throw new BadRequestException("deviceId es requerido");
    return this.driversService.assignDevice(id, body.deviceId);
  }

  /**
   * POST /api/drivers/:id/unlink-device — Desvincular pantalla
   * Requiere Idempotency-Key para prevenir desvinculaciones duplicadas
   */
  @Post(":id/unlink-device")
  @Roles(UserRole.ADMIN)
  @UseInterceptors(IdempotencyInterceptor)
  async unlinkDevice(@Param("id") id: string) {
    return this.driversService.unlinkDevice(id);
  }

  /**
   * GET /api/drivers/tablet/:tabletId/access — Verificar acceso de tablet
   * Usado por la PWA/FullyKiosk para saber si debe bloquear la pantalla.
   */
  @Get("tablet/:tabletId/access")
  @Public()
  async checkTabletAccess(@Param("tabletId") tabletId: string) {
    const result = await this.driversService.checkTabletAccess(tabletId);

    if (!result.access && result.httpStatus === HttpStatus.PAYMENT_REQUIRED) {
      throw new HttpException(result, HttpStatus.PAYMENT_REQUIRED);
    }

    return result;
  }

  /**
   * GET /api/drivers/me/hub — Datos de negocio para el portal del chofer (Autenticado con JWT propio)
   * Nuevo flujo: Los choferes registrados usan su JWT para entrar, tengan o no pauta activa.
   */
  @Get("me/hub")
  @Roles(UserRole.DRIVER)
  async getMyHub(@Req() req: AuthenticatedRequest) {
    const { entityId } = req.user;
    if (!entityId)
      throw new ForbiddenException("No tienes un perfil de conductor asociado");
    return this.driversService.getDriverHubDataById(entityId);
  }

  /**
   * GET /api/drivers/me/transactions — Historial de transacciones (pagos, retiros, bonos) del chofer autenticado
   */
  @Get("me/transactions")
  @Roles(UserRole.DRIVER)
  async getMyTransactions(@Req() req: AuthenticatedRequest) {
    const { entityId } = req.user;
    if (!entityId)
      throw new ForbiddenException("No tienes un perfil de conductor asociado");
    return this.driversService.getDriverTransactions(entityId);
  }

  /**
   * GET /api/drivers/:id/hub-preview — Datos de negocio para admins
   */
  @Get(":id/hub-preview")
  @Roles(UserRole.ADMIN)
  async getHubPreview(@Param("id") id: string) {
    return this.driversService.getDriverHubDataById(id);
  }

  /**
   * GET /api/drivers/device/:deviceId/hub-preview — Datos de negocio para admins cuando el dispositivo no tiene conductor asignado o se busca por dispositivo
   */
  @Get("device/:deviceId/hub-preview")
  @Roles(UserRole.ADMIN)
  async getDeviceHubPreview(@Param("deviceId") deviceId: string) {
    return this.driversService.getDriverHubDataByDeviceId(deviceId);
  }

  /**
   * GET /api/drivers/tablet/:tabletId/hub — Datos de negocio para el portal del chofer
   */
  @Public() // El portal del chofer usa solo el ID del hardware para autenticarse
  @Get("tablet/:tabletId/hub")
  async getDriverHub(
    @Param("tabletId") tabletId: string,
    @Headers("x-tablet-key") tabletKey: string,
  ) {
    const validKey = process.env.TABLET_HUB_KEY;
    if (!validKey || tabletKey !== validKey) {
      this.logger.warn(
        `🛑 [SECURITY] Intento de acceso a HUB sin TABLET_KEY válida. Tablet: ${tabletId}`,
      );
      throw new ForbiddenException("Invalid tablet authentication");
    }
    try {
      return await this.driversService.getDriverHubData(tabletId);
    } catch (e: unknown) {
      if (e instanceof ForbiddenException) throw e;
      if (e instanceof BadRequestException) throw e;
      this.logger.error(
        `[DRIVER_HUB] Error al obtener datos para tablet ${tabletId}: ${errorMessage(e)}`,
        e instanceof Error ? e.stack : undefined,
      );
      throw new BadRequestException(
        "No se pudieron cargar los datos del portal del chofer.",
      );
    }
  }

  /**
   * POST /api/drivers/purge-all — Purge ALL drivers and devices
   * FIX C-3: Requires ADMIN role (class-level guard) + x-admin-secret header.
   * Double-gated to prevent accidental or unauthorized DB wipes.
   */
  @Post("purge-all")
  @Roles(UserRole.ADMIN)
  async purgeAll(
    @Headers("x-admin-secret") secret: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret || secret !== adminSecret) {
      this.logger.warn(`⚠️ [PURGE] Intento no autorizado desde IP: ${req.ip}`);
      throw new ForbiddenException("Unauthorized purge attempt");
    }
    // Audit log — cada uso queda registrado
    this.logger.warn(
      `🚨 [PURGE] Purga total iniciada por ADMIN autenticado. IP: ${req.ip}`,
    );
    return this.driversService.purgeAll();
  }

  /**
   * DELETE /api/drivers/:id — Eliminar un chofer
   */
  @Delete(":id")
  @Roles(UserRole.ADMIN)
  async remove(@Param("id") id: string) {
    return this.driversService.remove(id);
  }

  /**
   * POST /api/drivers/:id/active-ads — Vincular anuncio activo (V12)
   */
  @Post(":id/active-ads")
  @Roles(UserRole.ADMIN)
  async linkActiveAd(
    @Param("id") id: string,
    @Body("campaignId") campaignId: string,
  ) {
    return this.driversService.linkActiveAd(id, campaignId);
  }
}
