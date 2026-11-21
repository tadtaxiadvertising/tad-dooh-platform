import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Req,
  UseInterceptors,
  Logger,
} from "@nestjs/common";
import { CommissionService, CommissionSourceType } from "./commission.service";
import type {
  CreateCommissionInput,
  MonthlySettlementInput,
} from "./commission.service";
import { IdempotencyInterceptor } from "../../common/interceptors/idempotency.interceptor";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import type { AuthUser } from "../auth/auth.types";

@Controller("commissions")
export class CommissionController {
  private readonly logger = new Logger(CommissionController.name);

  constructor(private readonly commissionService: CommissionService) {}

  /**
   * TenantGuard validates :id, not :driverId. Fail closed here for
   * commission history/pending endpoints that use a named driverId.
   */
  /**
   * The authenticated principal is the only valid audit actor.
   * A body-supplied approvedBy/revokedBy/paidBy/generatedBy is untrusted,
   * even when @Roles allows the request.
   */
  private requireAdminActor(req: { user?: AuthUser }): string {
    const user = req?.user;
    if (
      user?.role !== UserRole.ADMIN ||
      typeof user.id !== "string" ||
      !user.id.trim()
    ) {
      throw new ForbiddenException("Administrador autenticado requerido.");
    }
    return user.id;
  }

  private assertDriverAccess(driverId: string, user?: AuthUser) {
    if (user?.role === UserRole.ADMIN) return;
    if (
      user?.role === UserRole.DRIVER &&
      user.entityId &&
      user.entityId === driverId
    )
      return;
    throw new ForbiddenException(
      "No tienes acceso a las comisiones de este conductor.",
    );
  }

  /**
   * POST /api/commissions — Crear comisión idempotente
   * Requiere Idempotency-Key header
   * Body: { driverId, amount, sourceType, reference, metadata? }
   * Solo ADMIN puede crear comisiones manualmente (el sistema las crea automáticamente)
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @UseInterceptors(IdempotencyInterceptor)
  async createCommission(@Body() body: CreateCommissionInput) {
    if (!body.driverId || !body.amount || !body.sourceType || !body.reference) {
      throw new BadRequestException(
        "driverId, amount, sourceType, reference son requeridos",
      );
    }

    if (!Object.values(CommissionSourceType).includes(body.sourceType)) {
      throw new BadRequestException(`sourceType inválido: ${body.sourceType}`);
    }

    const result = await this.commissionService.createIdempotent(body);
    return {
      success: true,
      commission: result.commission,
      created: result.created,
    };
  }

  /**
   * GET /api/commissions/pending/:driverId — Comisiones pendientes de un conductor
   */
  @Get("pending/:driverId")
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  async getPendingCommissions(
    @Param("driverId") driverId: string,
    @Req() req: { user?: AuthUser },
  ) {
    this.assertDriverAccess(driverId, req.user);
    const commissions =
      await this.commissionService.getPendingCommissions(driverId);
    return { success: true, commissions };
  }

  /**
   * GET /api/commissions/history/:driverId — Historial de comisiones de un conductor
   */
  @Get("history/:driverId")
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  async getCommissionHistory(
    @Param("driverId") driverId: string,
    @Req() req: { user?: AuthUser },
  ) {
    this.assertDriverAccess(driverId, req.user);
    const commissions =
      await this.commissionService.getDriverCommissionHistory(driverId);
    return { success: true, commissions };
  }

  /**
   * PUT /api/commissions/:id/approve — Aprobar comisión (PENDING → APPROVED)
   * Solo ADMIN
   */
  @Put(":id/approve")
  @Roles(UserRole.ADMIN)
  @UseInterceptors(IdempotencyInterceptor)
  async approveCommission(
    @Param("id") id: string,
    @Req() req: { user?: AuthUser },
  ) {
    const actorId = this.requireAdminActor(req);
    const commission = await this.commissionService.approveCommission(
      id,
      actorId,
    );
    return { success: true, commission };
  }

  /**
   * PUT /api/commissions/:id/revoke — Revocar comisión (fraude, reembolso)
   * Solo ADMIN
   */
  @Put(":id/revoke")
  @Roles(UserRole.ADMIN)
  @UseInterceptors(IdempotencyInterceptor)
  async revokeCommission(
    @Param("id") id: string,
    @Body() body: { reason?: string },
    @Req() req: { user?: AuthUser },
  ) {
    const actorId = this.requireAdminActor(req);
    if (typeof body?.reason !== "string" || !body.reason.trim()) {
      throw new BadRequestException("reason es requerido");
    }

    const result = await this.commissionService.revokeCommission(
      id,
      body.reason.trim(),
      actorId,
    );
    return { ...result };
  }

  /**
   * POST /api/commissions/settlement/generate — Generar lote de liquidación mensual
   * Body: { month, year } — operator ID comes from verified session
   * Solo ADMIN
   * Idempotente: si ya existe lote para el periodo, devuelve el existente
   */
  @Post("settlement/generate")
  @Roles(UserRole.ADMIN)
  @UseInterceptors(IdempotencyInterceptor)
  async generateSettlement(
    @Body() body: Pick<MonthlySettlementInput, "month" | "year">,
    @Req() req: { user?: AuthUser },
  ) {
    const actorId = this.requireAdminActor(req);
    if (
      !Number.isInteger(body?.month) ||
      body.month < 1 ||
      body.month > 12 ||
      !Number.isInteger(body?.year) ||
      body.year < 2020 ||
      body.year > 2100
    ) {
      throw new BadRequestException(
        "month/year deben representar un período válido",
      );
    }

    const batch = await this.commissionService.generateMonthlySettlement({
      month: body.month,
      year: body.year,
      generatedBy: actorId,
    });
    return { success: true, batch };
  }

  /**
   * GET /api/commissions/settlement/:period — Obtener lote de liquidación
   * period formato: "2026-09"
   */
  @Get("settlement/:period")
  @Roles(UserRole.ADMIN)
  async getSettlement(@Param("period") period: string) {
    // Validar formato YYYY-MM
    if (!/^\d{4}-\d{2}$/.test(period)) {
      throw new BadRequestException("period debe tener formato YYYY-MM");
    }

    const batch = await this.prisma.settlementBatch.findUnique({
      where: { period },
    });

    if (!batch) {
      throw new NotFoundException(`Settlement batch for ${period} not found`);
    }

    return { success: true, batch };
  }

  /**
   * PUT /api/commissions/settlement/:id/approve — Aprobar lote de liquidación (DRAFT → APPROVED)
   * Solo ADMIN
   */
  @Put("settlement/:id/approve")
  @Roles(UserRole.ADMIN)
  @UseInterceptors(IdempotencyInterceptor)
  async approveSettlement(
    @Param("id") id: string,
    @Req() req: { user?: AuthUser },
  ) {
    const actorId = this.requireAdminActor(req);
    const batch = await this.commissionService.approveSettlementBatch(
      id,
      actorId,
    );
    return { success: true, batch };
  }

  /**
   * PUT /api/commissions/settlement/:id/pay — Pagar lote aprobado (APPROVED → PAID)
   * Solo ADMIN
   */
  @Put("settlement/:id/pay")
  @Roles(UserRole.ADMIN)
  @UseInterceptors(IdempotencyInterceptor)
  async paySettlement(
    @Param("id") id: string,
    @Body() body: { referenceNum?: string } | undefined,
    @Req() req: { user?: AuthUser },
  ) {
    const actorId = this.requireAdminActor(req);
    const batch = await this.commissionService.paySettlementBatch(
      id,
      actorId,
      body?.referenceNum,
    );
    return { success: true, batch };
  }

  /**
   * GET /api/commissions/reconcile/:month/:year — Reconciliación de comisiones
   * Solo ADMIN
   */
  @Get("reconcile/:month/:year")
  @Roles(UserRole.ADMIN)
  async reconcile(@Param("month") month: string, @Param("year") year: string) {
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    if (isNaN(m) || m < 1 || m > 12) {
      throw new BadRequestException("month inválido");
    }
    if (isNaN(y) || y < 2020 || y > 2030) {
      throw new BadRequestException("year inválido");
    }

    const result = await this.commissionService.reconcileCommissions(m, y);
    return { success: true, ...result };
  }

  // Inject prisma for settlement batch lookup
  private readonly prisma = this.commissionService["prisma"];
}
