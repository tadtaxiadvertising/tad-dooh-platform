import type { AuthenticatedRequest } from "./auth.types";
import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Request,
  HttpCode,
  HttpStatus,
  Res,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { OAuthExchangeDto } from "./dto/oauth-exchange.dto";
import { Public } from "./decorators/public.decorator";
import { Roles, UserRole } from "./decorators/roles.decorator";
import type { Response, CookieOptions } from "express";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Admin login – returns JWT token" })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);

    // A7-HTTPONLY: Enviar access_token en cookie HttpOnly + Secure para producción
    const isProduction = process.env.NODE_ENV === "production";
    // Host-only by default; set COOKIE_DOMAIN explicitly only when sharing across subdomains.
    const cookieDomain = process.env.COOKIE_DOMAIN?.trim() || undefined;
    const cookiePath = "/";

    // El token de Supabase (GoTrue) incluye su propio refresh_token en la cookie
    // El access_token custom creamos el HttpOnly
    const accessToken = result.access_token;

    // Configurar la cookie HttpOnly (solo el access_token personalizado)
    // Para el refresh_token (también de Supabase), GoTrue lo maneja en su cookie 'sb-refresh-token'
    const options: CookieOptions & { partitionable: boolean } = {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      ...(cookieDomain ? { domain: cookieDomain } : {}),
      path: cookiePath,
      maxAge: 1000 * 60 * 60 * 24 * 7, // Express maxAge is milliseconds (7 days)
      partitionable: true,
    };
    res.cookie("tad_access_token", accessToken, options);

    // Retornar solo datos de usuario (sin tokens, ya en cookie HttpOnly)
    const user = { ...result };
    Reflect.deleteProperty(user, "access_token");
    Reflect.deleteProperty(user, "refresh_token");
    return user as Omit<typeof result, "access_token" | "refresh_token">;
  }

  @Public()
  @Post("oauth/exchange")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Exchange a Supabase access_token (issued by Google OAuth) for a portal session",
  })
  async oauthExchange(@Body() dto: OAuthExchangeDto) {
    return this.authService.exchangeOAuth(dto);
  }

  @Get("profile")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user profile" })
  async getProfile(@Request() req: AuthenticatedRequest) {
    return this.authService.getProfile(req.user.id);
  }

  @Put("profile")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update current user profile" })
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() dto: { name?: string; password?: string; currentPassword?: string },
  ) {
    return this.authService.updateProfile(req.user.id, dto);
  }

  @Post("pairing-token")
  @Roles(UserRole.DRIVER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Generate a 5-minute JWT token for hardware pairing QR",
  })
  async generatePairingToken(@Request() req: AuthenticatedRequest) {
    return this.authService.generatePairingToken(req.user.id);
  }

  @Public()
  @Post("bootstrap/confirm-user")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "One-time: confirm a stuck user in Supabase Auth" })
  async confirmUser(@Body() dto: { email: string; secret: string }) {
    return this.authService.confirmUserByEmail(dto.email, dto.secret);
  }

  @Public()
  @Post("bootstrap/sync-users")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "One-time: sync Prisma users into Supabase Auth" })
  async syncUsers(@Body() dto: { secret: string }) {
    return this.authService.syncUsersToSupabaseAuth(dto.secret);
  }

  @Public()
  @Post("driver/register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Self-register a driver account" })
  async registerDriver(
    @Body()
    dto: {
      name: string;
      phone: string;
      password: string;
      vehicleModel?: string;
      licensePlate?: string;
    },
  ) {
    return this.authService.registerDriver(dto);
  }
}
