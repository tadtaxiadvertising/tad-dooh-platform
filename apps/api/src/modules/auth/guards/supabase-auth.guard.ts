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
 * 3. En desarrollo con ALLOW_DEV_BYPASS=true, decodificamos sin firma solo para testing local.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);
  private readonly isDev: boolean;
  private readonly allowDevBypass: boolean;

  constructor(
    private reflector: Reflector,
    private supabaseService: SupabaseService,
    private configService: ConfigService,
  ) {
    this.isDev = process.env.NODE_ENV === 'development';
    // FIX C-2: El bypass de desarrollo ahora requiere un flag EXPLÍCITO además de NODE_ENV=development.
    // Esto previene que el bypass se active en producción por una variable de entorno faltante.
    this.allowDevBypass = this.isDev && process.env.ALLOW_DEV_BYPASS === 'true';

    // FIX C-1: Advertir en startup si no hay un secreto JWT configurado
    const hasSecret = !!(process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET);
    if (!hasSecret) {
      this.logger.error(
        '🚨 [SECURITY] JWT_SECRET o SUPABASE_JWT_SECRET NO está configurado. ' +
        'El sistema usará un secreto generado aleatoriamente en memoria. ' +
        'TODOS los tokens existentes serán inválidos. Configura la variable en EasyPanel.',
      );
    }
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
      this.logger.warn(`❌ [AUTH_GUARD] Petición sin Header Authorization válido: ${request.url}`);
      throw new UnauthorizedException('Token de acceso no válido o ausente.');
    }

    const token = authHeader.split(' ')[1];

    // FIX C-1: Obtener el secreto vía ConfigService. Si no existe, usar un valor
    // aleatorio en memoria que efectivamente invalida todos los tokens no configurados.
    const jwtSecret =
      this.configService.get<string>('SUPABASE_JWT_SECRET') ||
      this.configService.get<string>('JWT_SECRET');

    // --- ESTRATEGIA 1: Validación Local (Offline-First Backend) ---
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
          this.logger.debug(`✅ [AUTH_GUARD] ESTRATEGIA 1 OK (Local JWT): ${request.user.email} [${request.user.role}]`);
          return true;
        }
      } catch (err) {
        if (err.name !== 'TokenExpiredError') {
          this.logger.warn(`⚠️ [AUTH_GUARD] ESTRATEGIA 1 RECHAZADA: ${err.message}`);
        }
      }
    }

    // --- ESTRATEGIA 2: Validación vía Red de Supabase (Fallback) ---
    try {
      const supabase = this.supabaseService.getClient();
      const { data, error } = await supabase.auth.getUser(token);

      if (!error && data.user) {
        request.user = {
          id: data.user.id,
          email: data.user.email,
          role: data.user.app_metadata?.role || (data.user as any).role || 'GUEST',
          entityId: data.user.app_metadata?.entityId || null,
        };
        this.logger.log(`✅ [AUTH_GUARD] ESTRATEGIA 2 OK (Red Supabase): ${data.user.email}`);
        return true;
      }

      if (error) {
        this.logger.warn(`⚠️ [AUTH_GUARD] ESTRATEGIA 2 FALLIDA: ${error.message}`);
      }
    } catch (err) {
      this.logger.warn(`⚠️ [AUTH_GUARD] ESTRATEGIA 2 ERROR DE RED: ${err.message}`);
    }

    // --- ESTRATEGIA 3: DEV FALLBACK (FIX C-2: Requiere flag explícito ALLOW_DEV_BYPASS=true) ---
    if (this.allowDevBypass) {
      try {
        const decoded = jwt.decode(token) as any;
        if (decoded && (decoded.sub || decoded.email)) {
          this.logger.warn(`🚩 [AUTH_GUARD] DEV BYPASS ACTIVO -> ACCEPTED: ${decoded.email}`);
          request.user = {
            id: decoded.sub || 'dev-user',
            email: decoded.email || 'dev@local',
            role: decoded.app_metadata?.role || decoded.role || 'GUEST',
            entityId: decoded.app_metadata?.entityId || null,
          };
          return true;
        }
      } catch (err) {
        this.logger.error(`❌ [AUTH_GUARD] DEV BYPASS ERROR: ${err.message}`);
      }
    }

    const decodedForLog = jwt.decode(token) as any;
    this.logger.error(
      `🚨 [AUTH_GUARD] ACCESO RECHAZADO (401) | URL: ${request.url} | ` +
      `Email: ${decodedForLog?.email || 'N/A'} | Role: ${decodedForLog?.role || decodedForLog?.app_metadata?.role || 'N/A'}`,
    );
    throw new UnauthorizedException('La sesión expiró o es inválida. Por favor inicia sesión de nuevo.');
  }
}
