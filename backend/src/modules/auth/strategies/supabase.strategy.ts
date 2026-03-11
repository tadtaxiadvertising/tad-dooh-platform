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
    const secret = configService.get<string>('SUPABASE_JWT_SECRET');
    
    // DIAGNÓSTICO DE SEGURIDAD PARA EL CTO:
    // Si el secreto empieza con 'sb_secret_', el usuario está usando la MANAGEMENT KEY 
    // en lugar del JWT SECRET de firma. Esto causará 401 en todas las validaciones.
    if (secret && secret.startsWith('sb_secret_')) {
      console.warn('🚨 ALERTA ARQUITECTO: El SUPABASE_JWT_SECRET parece ser una llave de gestión (sb_secret_). No funcionará para validar tokens de usuario. Reemplázalo con el "JWT Secret" de Settings > API de Supabase.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret || configService.get<string>('JWT_SECRET') || 'tad-default-secret-change-me',
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
