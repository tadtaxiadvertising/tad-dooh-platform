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

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Admin login – returns JWT token" })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: any) {
    const result = await this.authService.login(dto);

    // A7-HTTPONLY: Enviar access_token en cookie HttpOnly + Secure para producción
    const isProduction = process.env.NODE_ENV === "production";
    const cookieDomain = process.env.COOKIE_DOMAIN || "tad.do";
    const cookiePath = "/";

    // El token de Supabase (GoTrue) incluye su propio refresh_token en la cookie
    // El access_token custom creamos el HttpOnly
    const accessToken = result.access_token;

    // Configurar la cookie HttpOnly (solo el access_token personalizado)
    // Para el refresh_token (también de Supabase), GoTrue lo maneja en su cookie 'sb-refresh-token'
    res.cookie("tad_access_token", accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      domain: cookieDomain,
      path: cookiePath,
      maxAge: 3600 * 24 * 7, // 7 days (aprox)
      partitionable: true,
    });

    // Retornar solo datos de usuario (sin tokens, ya en cookie HttpOnly)
    const { access_token, refresh_token, ...user } = result;
    return user;
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
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.id);
  }

  @Put("profile")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update current user profile" })
  async updateProfile(
    @Request() req: any,
    @Body() dto: { name?: string; password?: string; currentPassword?: string },
  ) {
    return this.authService.updateProfile(req.user.id, dto);
  }

  @Post("pairing-token")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Generate a 5-minute JWT token for hardware pairing QR",
  })
  async generatePairingToken(@Request() req: any) {
    // Only DRIVER should generate pairing token, or maybe ADMIN on their behalf.
    // For now we assume the driver generates it from their portal to scan on the tablet.
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
