import { ExecutionContext, Injectable, UnauthorizedException, CanActivate, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SupabaseService } from '../../supabase/supabase.service';
import * as jwt from 'jsonwebtoken';

/**
 * SUPABASE AUTH GUARD — Política "Deny-by-Default".
 * Protege TODAS las rutas de la API globalmente (registrado en APP_GUARD).
 *
 * Flujo de mitigación CTO (Híbrido):
 * 1. Validación LOCAL usando SUPABASE_JWT_SECRET (< 1ms).
 * 2. Si falla, validamos contra la red de Supabase (> 200ms).
 * 3. En desarrollo (NODE_ENV=development), si todo falla, decodificamos el token
 *    sin verificar firma para permitir testing local sin service_role_key real.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);
  private readonly isDev: boolean;

  constructor(
    private reflector: Reflector,
    private supabaseService: SupabaseService,
    private configService: ConfigService,
  ) {
    this.isDev = (process.env.NODE_ENV || 'development') === 'development';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true; // Bypass para rutas públicas (tablets, heartbeat, etc.)
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de acceso no válido o ausente.');
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = this.configService.get<string>('SUPABASE_JWT_SECRET');

    // --- ESTRATEGIA 1: Validación Local (Offline-First Backend) ---
    // Solo funciona si el JWT secret es el real de Supabase (eyJ... base64 largo)
    if (jwtSecret && jwtSecret.length > 40 && !jwtSecret.startsWith('sb_')) {
      try {
        const payload = jwt.verify(token, jwtSecret) as any;
        if (payload) {
          request.user = {
            id: payload.sub,
            email: payload.email,
            role: payload.app_metadata?.role || 'ADMIN',
          };
          return true;
        }
      } catch (err) {
        this.logger.warn(`Local JWT validation failed, falling back to network: ${err.message}`);
      }
    }

    // --- ESTRATEGIA 2: Validación vía Red de Supabase ---
    try {
      const supabase = this.supabaseService.getClient();
      const { data, error } = await supabase.auth.getUser(token);

      if (!error && data.user) {
        request.user = {
          id: data.user.id,
          email: data.user.email,
          role: data.user.app_metadata?.role || 'ADMIN',
        };
        this.logger.log(`Auth OK via Supabase network: ${data.user.email}`);
        return true;
      }

      this.logger.warn(`Supabase network validation failed: ${error?.message || 'No user returned'}`);
    } catch (err) {
      this.logger.warn(`Supabase network call error: ${err.message}`);
    }

    // --- ESTRATEGIA 3: DEV FALLBACK — Decode sin verificar firma ---
    // SOLO en desarrollo local. Permite que el frontend funcione sin credenciales
    // de producción (service_role_key real). NUNCA activo en producción.
    if (this.isDev) {
      try {
        const decoded = jwt.decode(token) as any;
        if (decoded && (decoded.sub || decoded.email)) {
          this.logger.warn(
            `⚠️  DEV MODE FALLBACK: Token aceptado sin verificar firma — usuario: ${decoded.email || decoded.sub}`
          );
          request.user = {
            id: decoded.sub || 'dev-user',
            email: decoded.email || 'dev@local',
            role: decoded.app_metadata?.role || 'ADMIN',
          };
          return true;
        }
      } catch (err) {
        this.logger.error(`DEV fallback JWT decode failed: ${err.message}`);
      }
    }

    throw new UnauthorizedException('La sesión expiró o es inválida. Por favor inicia sesión de nuevo.');
  }
}
