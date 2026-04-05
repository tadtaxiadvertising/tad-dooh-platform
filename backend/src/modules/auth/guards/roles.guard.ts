import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, UserRole } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    // RBAC Check: el rol viene inyectado por el SupabaseAuthGuard previo (del JWT)
    if (!user || !user.role) {
      this.logger.error(`❌ RolesGuard: Intento de acceso sin usuario o rol: ${JSON.stringify(user)}`);
      throw new ForbiddenException('No tienes permisos suficientes para acceder a este recurso.');
    }

    const hasRole = requiredRoles.includes(user.role as UserRole);

    if (!hasRole) {
      this.logger.warn(`🚫 RolesGuard: Usuario [${user.email}] con rol [${user.role}] intentó acceder a ruta restringida para [${requiredRoles}]`);
      throw new ForbiddenException(`Se requiere uno de los siguientes roles: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
