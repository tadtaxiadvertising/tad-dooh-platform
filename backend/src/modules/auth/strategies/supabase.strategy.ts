import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

/**
 * SUPABASE JWT STRATEGY — Validación LOCAL sin llamadas de red.
 * Usa el SUPABASE_JWT_SECRET para verificar la firma del token matemáticamente.
 * Esto elimina una llamada HTTP a Supabase por cada request del dashboard,
 * reduciendo latencia y respetando los límites del Free Tier.
 *
 * Para obtener SUPABASE_JWT_SECRET:
 * Supabase Dashboard > Project Settings > API > JWT Secret
 */
@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('SUPABASE_JWT_SECRET') ||
        configService.get<string>('JWT_SECRET') ||
        'tad-default-secret-change-me',
    });
  }

  async validate(payload: any) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Token inválido o expirado.');
    }

    // El payload de Supabase incluye: sub (user ID), email, role, aud, exp
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role || 'ADMIN',
    };
  }
}
