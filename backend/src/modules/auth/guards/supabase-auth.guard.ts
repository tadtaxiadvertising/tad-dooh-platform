import { ExecutionContext, Injectable, UnauthorizedException, CanActivate, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SupabaseService } from '../../supabase/supabase.service';

/**
 * SUPABASE AUTH GUARD — Política "Deny-by-Default".
 * Protege TODAS las rutas de la API globalmente (registrado en APP_GUARD).
 *
 * Flujo de mitigación CTO:
 * Validamos el token contra la red de Supabase usando `supabase.auth.getUser()`.
 * Esto bypasea el problema de no tener el `SUPABASE_JWT_SECRET` de firma configurado 
 * correctamente en Vercel, solucionando el "kick-out error 401".
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private supabaseService: SupabaseService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true; // Bypass para tablets 
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de acceso no válido o ausente.');
    }

    const token = authHeader.split(' ')[1];

    try {
      const supabase = this.supabaseService.getClient();
      
      const { data, error } = await supabase.auth.getUser(token);

      if (error || !data.user) {
        this.logger.error(`Validation failed via Supabase: ${error?.message || 'No user data'}`);
        throw new UnauthorizedException('La sesión de usuario expiró o es inválida.');
      }

      // Inyectar usuario asegurando compatibilidad con el resto del backend
      request.user = {
        id: data.user.id,
        email: data.user.email,
        role: data.user.app_metadata?.role || 'ADMIN',
      };

      return true;
    } catch (err) {
      throw new UnauthorizedException('Error al validar la sesión con Supabase.');
    }
  }
}
