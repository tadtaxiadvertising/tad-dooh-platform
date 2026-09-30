import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  BadRequestException,
  NotFoundException,
  UseInterceptors,
  Logger,
} from "@nestjs/common";
import {
  CommissionService,
  CreateCommissionInput,
  CommissionStatus,
  CommissionSourceType,
  MonthlySettlementInput,
} from "./commission.service";
import { IdempotencyInterceptor } from "../../common/interceptors/idempotency.interceptor";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";

@Controller("commissions")
export class CommissionController {
  private readonly logger = new Logger(CommissionController.name);

  constructor(private readonly commissionService: CommissionService) {}

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
  async getPendingCommissions(@Param("driverId") driverId: string) {
    const commissions =
      await this.commissionService.getPendingCommissions(driverId);
    return { success: true, commissions };
  }

  /**
   * GET /api/commissions/history/:driverId — Historial de comisiones de un conductor
   */
  @Get("history/:driverId")
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  async getCommissionHistory(@Param("driverId") driverId: string) {
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
    @Body() body: { approvedBy: string },
  ) {
    if (!body.approvedBy) {
      throw new BadRequestException("approvedBy es requerido");
    }

    const commission = await this.commissionService.approveCommission(
      id,
      body.approvedBy,
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
    @Body() body: { reason: string; revokedBy: string },
  ) {
    if (!body.reason || !body.revokedBy) {
      throw new BadRequestException("reason y revokedBy son requeridos");
    }

    const result = await this.commissionService.revokeCommission(
      id,
      body.reason,
      body.revokedBy,
    );
    return { success: true, ...result };
  }

  /**
   * POST /api/commissions/settlement/generate — Generar lote de liquidación mensual
   * Body: { month, year, generatedBy }
   * Solo ADMIN
   * Idempotente: si ya existe lote para el periodo, devuelve el existente
   */
  @Post("settlement/generate")
  @Roles(UserRole.ADMIN)
  @UseInterceptors(IdempotencyInterceptor)
  async generateSettlement(@Body() body: MonthlySettlementInput) {
    if (!body.month || !body.year || !body.generatedBy) {
      throw new BadRequestException("month, year, generatedBy son requeridos");
    }

    if (body.month < 1 || body.month > 12) {
      throw new BadRequestException("month debe estar entre 1 y 12");
    }

    const batch = await this.commissionService.generateMonthlySettlement(body);
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
    @Body() body: { approvedBy: string },
  ) {
    if (!body.approvedBy) {
      throw new BadRequestException("approvedBy es requerido");
    }

    const batch = await this.commissionService.approveSettlementBatch(
      id,
      body.approvedBy,
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
    @Body() body: { paidBy: string; referenceNum?: string },
  ) {
    if (!body.paidBy) {
      throw new BadRequestException("paidBy es requerido");
    }

    const batch = await this.commissionService.paySettlementBatch(
      id,
      body.paidBy,
      body.referenceNum,
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
