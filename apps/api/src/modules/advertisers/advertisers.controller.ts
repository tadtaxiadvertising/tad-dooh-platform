import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  Headers,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { AdvertisersService } from "./advertisers.service";
import { Public } from "../auth/decorators/public.decorator";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import { TenantGuard } from "../auth/guards/tenant.guard";
import { AllowAdvertiserStatuses } from "../auth/decorators/advertiser-status.decorator";
import { Throttle } from "@nestjs/throttler";

@Controller("advertisers")
export class AdvertisersController {
  constructor(private readonly advertisersService: AdvertisersService) {}

  /**
   * Lista todos los anunciantes — Solo ADMIN
   */
  @Get()
  @Roles(UserRole.ADMIN)
  async findAll() {
    return this.advertisersService.findAll();
  }

  /**
   * Login de anunciante — Rate limited: 5 intentos/min para prevenir fuerza bruta
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { email: string; password?: string }) {
    if (!body.email || !body.password) {
      throw new BadRequestException("email and password are required");
    }
    return this.advertisersService.login(body.email, body.password);
  }

  @Public()
  @Post("recover-password")
  async recoverPassword(@Body() body: { email: string }) {
    if (!body.email) {
      throw new BadRequestException("Email is required for password recovery");
    }
    return this.advertisersService.recoverPassword(body.email);
  }

  @Public()
  @Post("reset-password")
  async resetPassword(@Body() body: { token: string; newPassword?: string }) {
    if (!body.token || !body.newPassword) {
      throw new BadRequestException("Token and newPassword are required");
    }
    return this.advertisersService.resetPassword(body.token, body.newPassword);
  }

  /**
   * Validate legacy advertiser login tokens for the server-side web gateway.
   * Public to allow token verification, but NEVER honors a client-supplied role.
   * Auth data comes only from a verified JWT + current advertiser DB row.
   */
  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @Get("session")
  async verifySession(@Headers("authorization") authorization?: string) {
    const match = /^Bearer ([^\s]+)$/.exec(authorization || "");
    if (!match) {
      throw new UnauthorizedException("Sesión de anunciante inválida.");
    }
    return this.advertisersService.verifyAdvertiserSession(match[1]);
  }

  /**
   * OAuth-only, trusted-identity account status. The global SupabaseAuthGuard
   * verifies the bearer session; advertiserId and role are never accepted in
   * route params or request body. Must appear BEFORE dynamic /:id routes.
   */
  @Get("session/status")
  @Roles(UserRole.ADVERTISER)
  @AllowAdvertiserStatuses("ACTIVE", "PENDING_REVIEW", "PENDING_ONBOARDING")
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  async verifyOAuthStatus(
    @Req()
    request: {
      user?: { role?: string; entityId?: string | null; email?: string };
    },
  ) {
    return this.advertisersService.verifyOAuthAdvertiserStatus(
      request.user || {},
    );
  }

  /**
   * SHELTER C-A1: TenantGuard asegura que solo el dueño o un ADMIN puede ver el registro.
   */
  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  @UseGuards(TenantGuard)
  async findOne(@Param("id") id: string) {
    const adv = await this.advertisersService.findOne(id);
    if (!adv) throw new BadRequestException("Anunciante no encontrado");
    return adv;
  }

  /**
   * Assisted commercial registration, not the public onboarding flow.
   * A driver may submit contact details but must not choose another person's
   * portal password or override referral ownership.
   */
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post()
  async create(
    @Body() body: Record<string, unknown>,
    @Req() request: { user?: { role?: string } },
  ) {
    const role = request.user?.role;
    if (role !== UserRole.ADMIN && role !== UserRole.DRIVER) {
      throw new ForbiddenException("Registro asistido no autorizado.");
    }
    if (
      role === UserRole.DRIVER &&
      (body?.password !== undefined || body?.referralCode !== undefined)
    ) {
      throw new ForbiddenException(
        "Un conductor no puede establecer credenciales ni atribuciones de terceros.",
      );
    }
    const FORBIDDEN_FIELDS = [
      "role",
      "isAdmin",
      "status",
      "referredBy",
      "app_metadata",
      "user_metadata",
    ];
    const injected = FORBIDDEN_FIELDS.filter(
      (field) => body?.[field] !== undefined,
    );
    if (injected.length > 0) {
      throw new BadRequestException(
        `Intento de inyección de campos privilegiados bloqueado: ${injected.join(", ")}`,
      );
    }

    const companyName = body?.companyName;
    const contactName = body?.contactName;
    const email = body?.email;
    if (!companyName || !contactName || !email) {
      throw new BadRequestException(
        "companyName, contactName, and email are required",
      );
    }

    // Whitelist both request and response; never return a stored password hash.
    const advertiser = await this.advertisersService.create({
      companyName: String(companyName),
      contactName: String(contactName),
      email: String(email).trim().toLowerCase(),
      phone: body?.phone !== undefined ? String(body.phone) : undefined,
      password: typeof body?.password === "string" ? body.password : undefined,
      referralCode:
        typeof body?.referralCode === "string" ? body.referralCode : undefined,
    });
    return {
      id: advertiser.id,
      companyName: advertiser.companyName,
      contactName: advertiser.contactName,
      email: advertiser.email,
      phone: advertiser.phone,
      status: advertiser.status,
      referredBy: advertiser.referredBy,
    };
  }

  /**
   * SHELTER C-A1: Solo el dueño o un ADMIN puede modificar el registro.
   */
  @Put(":id")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  @UseGuards(TenantGuard)
  async update(
    @Param("id") id: string,
    @Body() body: Parameters<AdvertisersService["update"]>[1],
  ) {
    return this.advertisersService.update(id, body);
  }

  /**
   * Solo un ADMIN puede eliminar un anunciante.
   */
  @Delete(":id")
  @Roles(UserRole.ADMIN)
  async delete(@Param("id") id: string) {
    return this.advertisersService.remove(id);
  }

  /**
   * Portal del anunciante — SHELTER C-A1: TenantGuard verifica propiedad del recurso.
   */
  @Get(":id/portal")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  @UseGuards(TenantGuard)
  async getPortal(@Param("id") id: string) {
    const data = await this.advertisersService.getPortalData(id);
    if (!data) throw new BadRequestException("Anunciante no encontrado");
    return data;
  }

  /**
   * Facturas del anunciante — Endpoint dedicado para la página de Billing.
   * TENANT ISOLATION: TenantGuard garantiza que solo se devuelven facturas del propietario.
   * No carga la data completa del portal — query ligero y eficiente.
   */
  @Get(":id/invoices")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  @UseGuards(TenantGuard)
  async getInvoices(@Param("id") id: string) {
    return this.advertisersService.getInvoices(id);
  }

  /**
   * Perfil extendido del anunciante para el ADMIN
   */
  @Get(":id/admin-profile")
  @Roles(UserRole.ADMIN)
  async getAdminProfile(@Param("id") id: string) {
    return this.advertisersService.getAdminProfile(id);
  }
}
