import { Controller, Post, Body, Get, Put, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { OAuthExchangeDto } from './dto/oauth-exchange.dto';
import { Public } from './decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login – returns JWT token' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('oauth/exchange')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchange a Supabase access_token (issued by Google OAuth) for a portal session',
  })
  async oauthExchange(@Body() dto: OAuthExchangeDto) {
    return this.authService.exchangeOAuth(dto);
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.id);
  }

  @Put('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(@Request() req: any, @Body() dto: { name?: string; password?: string; currentPassword?: string }) {
    return this.authService.updateProfile(req.user.id, dto);
  }

  @Post('pairing-token')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a 5-minute JWT token for hardware pairing QR' })
  async generatePairingToken(@Request() req: any) {
    // Only DRIVER should generate pairing token, or maybe ADMIN on their behalf.
    // For now we assume the driver generates it from their portal to scan on the tablet.
    return this.authService.generatePairingToken(req.user.id);
  }

  @Public()
  @Post('driver/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Self-register a driver account' })
  async registerDriver(@Body() dto: {
    name: string;
    phone: string;
    password: string;
    vehicleModel?: string;
    licensePlate?: string;
  }) {
    return this.authService.registerDriver(dto);
  }
}
