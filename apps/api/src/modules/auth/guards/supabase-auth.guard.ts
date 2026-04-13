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
 * Flujo de validación (Híbrido):
 * 1. Validación LOCAL usando SUPABASE_JWT_SECRET o JWT_SECRET (< 1ms).
 * 2. Si falla, validamos contra la red de Supabase (> 200ms).
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  // In-memory cache to avoid repeated network calls for the same token in a short window
  private static sessionCache = new Map<string, { user: any; expiry: number }>();
  private readonly CACHE_TTL_MS = 10000; // 10 seconds cache for same token

  constructor(
    private reflector: Reflector,
    private supabaseService: SupabaseService,
    private configService: ConfigService,
  ) {
    this.isDev = process.env.NODE_ENV === 'development';
    this.allowDevBypass = this.isDev && process.env.ALLOW_DEV_BYPASS === 'true';

    const hasSecret = !!(this.configService.get('SUPABASE_JWT_SECRET') || this.configService.get('JWT_SECRET'));
    if (!hasSecret) {
      this.logger.warn('⚠️ [SECURITY] No hay JWT_SECRET configurado. Solo funcionará Estrategia 2 (Red).');
    }

    // Cleanup stale cache occasionally
    if (Math.random() > 0.95) {
      const now = Date.now();
      for (const [token, data] of SupabaseAuthGuard.sessionCache.entries()) {
        if (data.expiry < now) SupabaseAuthGuard.sessionCache.delete(token);
      }
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization || request.headers.Authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.warn(`❌ [AUTH] Petición sin Header Authorization válido: ${request.url}`);
      throw new UnauthorizedException('Token de acceso no válido o ausente.');
    }

    const token = authHeader.split(' ')[1];

    // --- CACHE LOOKUP ---
    const cached = SupabaseAuthGuard.sessionCache.get(token);
    if (cached && cached.expiry > Date.now()) {
      request.user = cached.user;
      return true;
    }

    const jwtSecret = this.configService.get<string>('SUPABASE_JWT_SECRET') || this.configService.get<string>('JWT_SECRET');

    // --- ESTRATEGIA 1: Validación Local JWT ---
    if (jwtSecret) {
      try {
        const payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }) as any;
        if (payload) {
          request.user = {
            id: payload.sub,
            email: payload.email,
            role: payload.app_metadata?.role || payload.role || 'GUEST',
            entityId: payload.app_metadata?.entityId || null,
          };
          
          // Cache sucessful validation
          SupabaseAuthGuard.sessionCache.set(token, { 
            user: request.user, 
            expiry: Date.now() + this.CACHE_TTL_MS 
          });

          this.logger.debug(`✅ [AUTH] ESTRATEGIA 1 OK (Local JWT): ${request.user.email}`);
          return true;
        }
      } catch (err: any) {
        if (err.name === 'TokenExpiredError') {
          this.logger.warn(`🛑 [AUTH] TOKEN EXPIRADO: ${err.message}`);
          throw new UnauthorizedException('Tu sesión ha expirado.');
        }
        this.logger.debug(`[AUTH] Estrategia 1 falló (${err.message}). Intentando Estrategia 2 (Red)...`);
      }
    }

    // --- ESTRATEGIA 2: Validación vía Supabase SDK (Red) ---
    try {
      const supabase = this.supabaseService.getClient();
      const { data, error } = await supabase.auth.getUser(token);

      if (!error && data.user) {
        // Decode the raw token to get app_metadata role even if Supabase user object doesn't include it
        const decoded = jwt.decode(token) as any;
        const roleFromMeta = 
          data.user.app_metadata?.role ||
          (decoded?.app_metadata?.role) ||
          (data.user as any).role ||
          decoded?.role ||
          'GUEST';
        const entityId =
          data.user.app_metadata?.entityId ||
          decoded?.app_metadata?.entityId ||
          null;

        request.user = {
          id: data.user.id,
          email: data.user.email,
          role: roleFromMeta,
          entityId,
        };

        // Cache sucessful validation
        SupabaseAuthGuard.sessionCache.set(token, { 
          user: request.user, 
          expiry: Date.now() + this.CACHE_TTL_MS 
        });
        
        if (roleFromMeta === 'GUEST') {
          this.logger.debug(
            `⚠️ [AUTH_GUARD] Usuario autenticado pero sin rol en metadata: ${data.user.email}. ` +
            `Configura SUPABASE_JWT_SECRET para optimizar rendimiento y role mapping.`
          );
        } else {
          this.logger.debug(`✅ [AUTH] ESTRATEGIA 2 OK (Red): ${data.user.email} [${roleFromMeta}]`);
        }
        return true;
      }
      
      if (error) {
        this.logger.warn(`❌ [AUTH] ESTRATEGIA 2 RECHAZÓ TOKEN: ${error.message}`);
      }
    } catch (err: any) {
      this.logger.error(`❌ [AUTH] ESTRATEGIA 2 ERROR CRÍTICO: ${err.message}`);
    }

    // --- ESTRATEGIA 3: DEV BYPASS ---
    if (this.allowDevBypass) {
      const decoded = jwt.decode(token) as any;
      if (decoded) {
        this.logger.warn(`🚩 [AUTH] DEV BYPASS UTILIZADO: ${decoded.email}`);
        request.user = {
          id: decoded.sub || 'dev-user',
          email: decoded.email || 'dev@local',
          role: decoded.app_metadata?.role || decoded.role || 'GUEST',
          entityId: decoded.app_metadata?.entityId || null,
        };
        return true;
      }
    }

    throw new UnauthorizedException('Sesión inválida.');
  }
}
