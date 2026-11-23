import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY, UserRole } from "../decorators/roles.decorator";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // FIX B-1: Si la ruta es pública, ignorar validación de roles
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // RBAC Check: el rol viene inyectado por el SupabaseAuthGuard previo (del JWT)
    if (!user || !user.role) {
      // Never serialize the principal: it may contain PII or untrusted claims.
      this.logger.error("RBAC_DENIED_MISSING_ROLE");
      throw new ForbiddenException(
        "No tienes permisos suficientes para acceder a este recurso.",
      );
    }

    const hasRole = requiredRoles.includes(user.role as UserRole);

    if (!hasRole) {
      // Do not include caller-supplied email, role or JWT fields in logs.
      this.logger.warn("RBAC_DENIED_INSUFFICIENT_ROLE");
      throw new ForbiddenException(
        `Se requiere uno de los siguientes roles: ${requiredRoles.join(", ")}`,
      );
    }

    return true;
  }
}
